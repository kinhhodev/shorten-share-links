import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { CreateLinkBodySchema } from '@ssl/shared';
import { z } from 'zod';
import { db } from '../db/client';
import { links } from '../db/schema';
import { pgCodeDeep, toPublicError } from '../http/errors';
import { resolveOwnerUserIdFromCookieOrNull } from '../auth/resolveOwnerUserId';
import { codeForCustomAliasAttempt } from '../links/customAliasCode';
import { randomCode } from '../links/code';
import { env } from '../env';
import { assertRecaptchaIfRequired } from '../security/recaptcha';
import { assertSafeLongUrl } from '../security/urlPolicy';

function linkInsertValues(
  project: string | null,
  code: string,
  longUrl: string,
  ownerUserId: string | null,
) {
  if (ownerUserId) {
    return { project, code, longUrl, ownerUserId };
  }
  return { project, code, longUrl };
}

function shortUrlFor(project: string | null, code: string) {
  if (project) return new URL(`/r/${project}/${code}`, env.BASE_URL).toString();
  return new URL(`/r/${code}`, env.BASE_URL).toString();
}

export const linkRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/links',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
    try {
      const body = CreateLinkBodySchema.parse(req.body);

      const ownerUserId = await resolveOwnerUserIdFromCookieOrNull(req);

      assertSafeLongUrl(body.longUrl);
      await assertRecaptchaIfRequired(
        body.recaptchaToken,
        ownerUserId !== null,
        typeof req.ip === 'string' ? req.ip : undefined,
      );

      const project = body.project ?? null;
      const customBase = body.customAlias?.trim();

      if (customBase) {
        const maxAttempts = 100;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const tryCode = codeForCustomAliasAttempt(customBase, attempt);
          if (!tryCode) break;

          try {
            const inserted = await db
              .insert(links)
              .values(linkInsertValues(project, tryCode, body.longUrl, ownerUserId))
              .returning({
                id: links.id,
                project: links.project,
                code: links.code,
                longUrl: links.longUrl,
                createdAt: links.createdAt,
              });

            const row = inserted[0]!;
            return reply.send({
              id: row.id,
              project: row.project,
              code: row.code,
              longUrl: row.longUrl,
              shortUrl: shortUrlFor(row.project, row.code),
              ownerUserId: ownerUserId ?? -1,
              createdAt: row.createdAt.toISOString(),
            });
          } catch (err: unknown) {
            if (pgCodeDeep(err) === '23505') continue;
            throw err;
          }
        }

        return reply.code(409).send({
          code: 'CONFLICT',
          message: 'Không thể tạo alias (đã thử thêm hậu tố -1, -2, …)',
          details: { project, base: customBase },
        });
      }

      const code = randomCode(7);

      for (let attempt = 0; attempt < 5; attempt++) {
        const tryCode = attempt === 0 ? code : randomCode(8);
        try {
          const inserted = await db
            .insert(links)
            .values(linkInsertValues(project, tryCode, body.longUrl, ownerUserId))
            .returning({
              id: links.id,
              project: links.project,
              code: links.code,
              longUrl: links.longUrl,
              createdAt: links.createdAt,
            });

          const row = inserted[0]!;
          return reply.send({
            id: row.id,
            project: row.project,
            code: row.code,
            longUrl: row.longUrl,
            shortUrl: shortUrlFor(row.project, row.code),
            ownerUserId: ownerUserId ?? -1,
            createdAt: row.createdAt.toISOString(),
          });
        } catch (err: unknown) {
          if (pgCodeDeep(err) === '23505') continue;
          throw err;
        }
      }

      return reply.code(409).send({
        code: 'CONFLICT',
        message: 'Alias/code already exists',
        details: { project, code },
      });
    } catch (err) {
      req.log.error({ err }, 'POST /api/links failed');
      const pub = toPublicError(err);
      return reply.code(pub.statusCode).send(pub);
    }
    },
  );

  app.get('/links', { preHandler: app.authenticate }, async (req, reply) => {
    const Query = z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      project: z
        .string()
        .trim()
        .optional()
        .transform((v) => (v === '' ? undefined : v)),
      q: z.string().trim().max(200).optional(),
    });
    const q = Query.parse(req.query);
    const offset = (q.page - 1) * q.pageSize;

    const projectFilter =
      q.project === undefined
        ? sql`true`
        : q.project === '__none__'
          ? isNull(links.project)
          : eq(links.project, q.project);

    const where = and(
      eq(links.ownerUserId, req.user.sub),
      projectFilter,
      q.q
        ? or(ilike(links.code, `%${q.q}%`), ilike(links.longUrl, `%${q.q}%`))
        : sql`true`,
    );

    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: links.id,
          project: links.project,
          code: links.code,
          longUrl: links.longUrl,
          isActive: links.isActive,
          createdAt: links.createdAt,
        })
        .from(links)
        .where(where)
        .orderBy(desc(links.createdAt))
        .limit(q.pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(links).where(where),
    ]);

    return reply.send({
      items: items.map((it) => ({ ...it, createdAt: it.createdAt.toISOString() })),
      page: q.page,
      pageSize: q.pageSize,
      total: Number(totalRows[0]?.count ?? 0),
    });
  });

  /** Tổng hợp distinct project (kể cả null) + số link; sort theo link mới nhất trong bucket. */
  app.get('/links/projects', { preHandler: app.authenticate }, async (req, reply) => {
    const userId = req.user.sub;
    const rows = await db
      .select({
        project: links.project,
        total: sql<number>`(count(*)::int)`,
        activeCount: sql<number>`(count(*) filter (where ${links.isActive})::int)`,
      })
      .from(links)
      .where(eq(links.ownerUserId, userId))
      .groupBy(links.project)
      .orderBy(desc(sql`max(${links.createdAt})`));

    return reply.send({
      items: rows.map((r) => ({
        project: r.project,
        total: Number(r.total),
        activeCount: Number(r.activeCount),
      })),
    });
  });

  app.get('/links/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const Params = z.object({ id: z.string().uuid() });
    const { id } = Params.parse(req.params);
    const row = await db
      .select({
        id: links.id,
        project: links.project,
        code: links.code,
        longUrl: links.longUrl,
        isActive: links.isActive,
        createdAt: links.createdAt,
      })
      .from(links)
      .where(and(eq(links.id, id), eq(links.ownerUserId, req.user.sub)))
      .limit(1);

    const item = row[0];
    if (!item) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Link not found' });
    return reply.send({ ...item, createdAt: item.createdAt.toISOString() });
  });

  app.patch('/links/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const Params = z.object({ id: z.string().uuid() });
    const Body = z
      .object({
        isActive: z.boolean().optional(),
        longUrl: z.string().trim().url().optional(),
      })
      .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

    const { id } = Params.parse(req.params);
    const body = Body.parse(req.body);

    if (body.longUrl !== undefined) {
      assertSafeLongUrl(body.longUrl);
    }

    const updated = await db
      .update(links)
      .set(body)
      .where(and(eq(links.id, id), eq(links.ownerUserId, req.user.sub)))
      .returning({
        id: links.id,
        project: links.project,
        code: links.code,
        longUrl: links.longUrl,
        isActive: links.isActive,
        createdAt: links.createdAt,
      });

    const row = updated[0];
    if (!row) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Link not found' });
    return reply.send({ ...row, createdAt: row.createdAt.toISOString() });
  });

  app.delete('/links/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const Params = z.object({ id: z.string().uuid() });
    const { id } = Params.parse(req.params);

    const deleted = await db
      .delete(links)
      .where(and(eq(links.id, id), eq(links.ownerUserId, req.user.sub)))
      .returning({ id: links.id });
    if (!deleted[0]) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Link not found' });
    return reply.send({ ok: true });
  });
};

