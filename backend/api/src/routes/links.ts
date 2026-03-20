import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { CreateLinkBodySchema } from '@ssl/shared';
import { z } from 'zod';
import { db } from '../db/client';
import { links } from '../db/schema';
import { toPublicError } from '../http/errors';
import { randomCode } from '../links/code';
import { env } from '../env';

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

      // Optional auth: if cookie present but invalid, treat as anonymous (-1 / marker -1).
      let ownerUserId: string | null = null;
      try {
        await req.jwtVerify();
        ownerUserId = req.user.sub;
      } catch {
        ownerUserId = null;
      }
      const anonymousMarker = ownerUserId ? 0 : -1;

      const project = body.project ?? null;
      const code = body.customAlias?.trim() || randomCode(7);

      const maxAttempts = body.customAlias ? 1 : 5;
      let lastErr: unknown;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const tryCode = attempt === 0 ? code : randomCode(8);
        try {
          const inserted = await db
            .insert(links)
            .values({
              project,
              code: tryCode,
              longUrl: body.longUrl,
              ownerUserId,
              anonymousMarker,
            })
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
            anonymousMarker,
            createdAt: row.createdAt.toISOString(),
          });
        } catch (err: any) {
          lastErr = err;
          if (err?.code === '23505') continue; // unique violation, retry
          throw err;
        }
      }

      return reply.code(409).send({
        code: 'CONFLICT',
        message: 'Alias/code already exists',
        details: { project, code },
      });
    } catch (err) {
      const pub = toPublicError(err);
      return reply.code(pub.statusCode).send(pub);
    }
    },
  );

  app.get('/links', { preHandler: app.authenticate }, async (req, reply) => {
    const Query = z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      project: z.string().trim().optional(),
      q: z.string().trim().optional(),
    });
    const q = Query.parse(req.query);
    const offset = (q.page - 1) * q.pageSize;

    const where = and(
      eq(links.ownerUserId, req.user.sub),
      q.project ? eq(links.project, q.project) : sql`true`,
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

  app.get('/links/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const id = (req.params as any).id as string;
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
      .where(sql`${links.id} = ${id} and ${links.ownerUserId} = ${req.user.sub}`)
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

