import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { CreateLinkBodySchema, DASHBOARD_PROJECT_NONE_QUERY, ProjectSchema } from '@ssl/shared';
import { z } from 'zod';
import { db } from '../db/client';
import { links, projectShares, users } from '../db/schema';
import { redis } from '../cache/redis';
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
      isNull(links.deletedAt),
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
      .where(and(eq(links.ownerUserId, userId), isNull(links.deletedAt)))
      .groupBy(links.project)
      .orderBy(desc(sql`max(${links.createdAt})`));

    const shareRows = await db
      .select({
        project: projectShares.project,
        n: sql<number>`(count(*)::int)`,
      })
      .from(projectShares)
      .where(eq(projectShares.ownerUserId, userId))
      .groupBy(projectShares.project);

    const shareMap = new Map<string | null, number>();
    for (const sr of shareRows) {
      shareMap.set(sr.project, Number(sr.n));
    }

    return reply.send({
      items: rows.map((r) => ({
        project: r.project,
        total: Number(r.total),
        activeCount: Number(r.activeCount),
        sharedRecipientCount: shareMap.get(r.project) ?? 0,
      })),
    });
  });

  /** Danh sách người đã nhận chia sẻ theo chủ đề (chỉ owner). */
  app.get('/links/projects/shares', { preHandler: app.authenticate }, async (req, reply) => {
    const Query = z.object({
      project: z.union([z.literal(DASHBOARD_PROJECT_NONE_QUERY), ProjectSchema]),
    });
    const q = Query.parse(req.query);
    const ownerId = req.user.sub;
    const projectValue = q.project === DASHBOARD_PROJECT_NONE_QUERY ? null : q.project;
    const projectCond =
      projectValue === null ? isNull(projectShares.project) : eq(projectShares.project, projectValue);

    const rows = await db
      .select({
        id: projectShares.id,
        recipientEmail: users.email,
        createdAt: projectShares.createdAt,
      })
      .from(projectShares)
      .innerJoin(users, eq(users.id, projectShares.recipientUserId))
      .where(and(eq(projectShares.ownerUserId, ownerId), projectCond))
      .orderBy(desc(projectShares.createdAt));

    return reply.send({
      items: rows.map((r) => ({
        id: r.id,
        recipientEmail: r.recipientEmail,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  });

  /**
   * Chia sẻ chủ đề: copy toàn bộ link (đang hoạt động) sang tài khoản người nhận + ghi nhận share.
   * Thu hồi share (DELETE bản ghi project_shares) không xóa link đã copy của người nhận.
   */
  app.post('/links/projects/share', { preHandler: app.authenticate }, async (req, reply) => {
    const Body = z.object({
      project: z.union([z.literal(DASHBOARD_PROJECT_NONE_QUERY), ProjectSchema]),
      recipientEmail: z.string().trim().email(),
    });
    const body = Body.parse(req.body);
    const ownerId = req.user.sub;
    const projectValue = body.project === DASHBOARD_PROJECT_NONE_QUERY ? null : body.project;
    const linkProjectCond =
      projectValue === null ? isNull(links.project) : eq(links.project, projectValue);

    const emailNorm = body.recipientEmail.trim().toLowerCase();
    const [recipient] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(sql`lower(${users.email}) = ${emailNorm}`)
      .limit(1);

    if (!recipient) {
      return reply.code(404).send({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy tài khoản với email này',
      });
    }
    if (recipient.id === ownerId) {
      return reply.code(400).send({
        code: 'BAD_REQUEST',
        message: 'Không thể chia sẻ chủ đề cho chính mình',
      });
    }

    const shareProjectCond =
      projectValue === null
        ? isNull(projectShares.project)
        : eq(projectShares.project, projectValue);
    const already = await db
      .select({ id: projectShares.id })
      .from(projectShares)
      .where(
        and(
          eq(projectShares.ownerUserId, ownerId),
          shareProjectCond,
          eq(projectShares.recipientUserId, recipient.id),
        ),
      )
      .limit(1);
    if (already[0]) {
      return reply.code(409).send({
        code: 'ALREADY_SHARED',
        message: 'Bạn đã chia sẻ chủ đề này cho người nhận rồi',
      });
    }

    const sourceLinks = await db
      .select({
        project: links.project,
        code: links.code,
        longUrl: links.longUrl,
      })
      .from(links)
      .where(and(eq(links.ownerUserId, ownerId), isNull(links.deletedAt), linkProjectCond));

    if (sourceLinks.length === 0) {
      return reply.code(400).send({
        code: 'NO_LINKS',
        message: 'Chủ đề không có link nào để chia sẻ',
      });
    }

    let copied = 0;
    for (const src of sourceLinks) {
      try {
        await db.insert(links).values({
          project: src.project,
          code: src.code,
          longUrl: src.longUrl,
          ownerUserId: recipient.id,
        });
        copied += 1;
      } catch (err: unknown) {
        if (pgCodeDeep(err) === '23505') continue;
        throw err;
      }
    }

    await db.insert(projectShares).values({
      ownerUserId: ownerId,
      project: projectValue,
      recipientUserId: recipient.id,
    });

    return reply.send({
      ok: true,
      copiedCount: copied,
      recipientEmail: recipient.email,
    });
  });

  /** Thu hồi chia sẻ (chỉ xóa bản ghi share; link của người nhận giữ nguyên). */
  app.delete('/links/projects/shares/:shareId', { preHandler: app.authenticate }, async (req, reply) => {
    const Params = z.object({ shareId: z.string().uuid() });
    const { shareId } = Params.parse(req.params);
    const removed = await db
      .delete(projectShares)
      .where(and(eq(projectShares.id, shareId), eq(projectShares.ownerUserId, req.user.sub)))
      .returning({ id: projectShares.id });
    if (!removed[0]) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Không tìm thấy bản ghi chia sẻ' });
    }
    return reply.send({ ok: true });
  });

  /** Postgres/pg có thể trả `timestamp` dạng string — chuẩn hoá trước khi sort/JSON. */
  function deletedAtToMs(v: unknown): number {
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'string' || typeof v === 'number') return new Date(v).getTime();
    return new Date(String(v)).getTime();
  }

  function deletedAtToIso(v: unknown): string {
    return new Date(deletedAtToMs(v)).toISOString();
  }

  /** Danh sách chủ đề đã xóa mềm (theo batch) — đăng ký trước `/links/:id`. */
  app.get('/links/trash', { preHandler: app.authenticate }, async (req, reply) => {
    const userId = req.user.sub;
    const rows = await db
      .select({
        batchId: links.trashBatchId,
        project: sql<string | null>`min(${links.project})`,
        deletedAt: sql<Date>`min(${links.deletedAt})`,
        linkCount: sql<number>`(count(*)::int)`,
      })
      .from(links)
      .where(
        and(
          eq(links.ownerUserId, userId),
          isNotNull(links.deletedAt),
          isNotNull(links.trashBatchId),
        ),
      )
      .groupBy(links.trashBatchId)
      .orderBy(desc(sql`min(${links.deletedAt})`));

    type BatchRow = {
      batchId: string;
      project: string | null;
      /** Có thể là Date hoặc string từ driver */
      deletedAt: unknown;
      linkCount: number;
    };

    const list: BatchRow[] = rows
      .filter((r) => r.batchId !== null)
      .map((r) => ({
        batchId: r.batchId!,
        project: r.project,
        deletedAt: r.deletedAt,
        linkCount: Number(r.linkCount),
      }));

    const byKey = new Map<string, BatchRow[]>();
    for (const r of list) {
      const key = r.project === null ? '__none__' : r.project;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(r);
    }

    const labelByBatch = new Map<string, string>();
    for (const [, group] of byKey) {
      group.sort((a, b) => deletedAtToMs(a.deletedAt) - deletedAtToMs(b.deletedAt));
      const showSuffix = group.length > 1;
      group.forEach((r, i) => {
        const base = r.project === null ? 'Không chủ đề' : r.project;
        const label = showSuffix ? `${base} (${i + 1})` : base;
        labelByBatch.set(r.batchId, label);
      });
    }

    const items = list
      .map((r) => ({
        batchId: r.batchId,
        project: r.project,
        deletedAt: deletedAtToIso(r.deletedAt),
        linkCount: r.linkCount,
        displayLabel:
          labelByBatch.get(r.batchId) ?? (r.project === null ? 'Không chủ đề' : r.project),
      }))
      .sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));

    return reply.send({ items });
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
      .where(and(eq(links.id, id), eq(links.ownerUserId, req.user.sub), isNull(links.deletedAt)))
      .limit(1);

    const item = row[0];
    if (!item) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Link not found' });
    return reply.send({ ...item, createdAt: item.createdAt.toISOString() });
  });

  /** Xóa mềm toàn bộ link trong một chủ đề (chuyển vào Thùng rác). */
  app.post('/links/topics/soft-delete', { preHandler: app.authenticate }, async (req, reply) => {
    const Body = z.object({
      project: z.union([z.literal(DASHBOARD_PROJECT_NONE_QUERY), ProjectSchema]),
    });
    const body = Body.parse(req.body);
    const userId = req.user.sub;
    const projectValue = body.project === DASHBOARD_PROJECT_NONE_QUERY ? null : body.project;
    const projectCond =
      projectValue === null ? isNull(links.project) : eq(links.project, projectValue);

    const batchId = randomUUID();
    const now = new Date();

    const moved = await db
      .update(links)
      .set({ deletedAt: now, trashBatchId: batchId })
      .where(
        and(eq(links.ownerUserId, userId), isNull(links.deletedAt), projectCond),
      )
      .returning({ project: links.project, code: links.code });

    if (moved.length === 0) {
      return reply.code(400).send({
        code: 'NO_LINKS',
        message: 'Không có link nào trong chủ đề này để xóa',
      });
    }

    await redis.connect().catch(() => undefined);
    for (const row of moved) {
      const key = row.project ? `r:${row.project}:${row.code}` : `r::${row.code}`;
      await redis.del(key).catch(() => undefined);
    }

    return reply.send({
      ok: true,
      batchId,
      movedCount: moved.length,
    });
  });

  /** Khôi phục một batch đã xóa mềm. */
  app.post('/links/trash/:batchId/restore', { preHandler: app.authenticate }, async (req, reply) => {
    const Params = z.object({ batchId: z.string().uuid() });
    const { batchId } = Params.parse(req.params);
    const userId = req.user.sub;

    try {
      const restored = await db
        .update(links)
        .set({ deletedAt: null, trashBatchId: null })
        .where(and(eq(links.ownerUserId, userId), eq(links.trashBatchId, batchId)))
        .returning({ id: links.id });

      if (restored.length === 0) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: 'Không tìm thấy batch trong thùng rác' });
      }
      return reply.send({ ok: true, restoredCount: restored.length });
    } catch (err: unknown) {
      if (pgCodeDeep(err) === '23505') {
        return reply.code(409).send({
          code: 'CONFLICT',
          message:
            'Không thể khôi phục: đã tồn tại link cùng mã trong chủ đề (trùng code). Xóa hoặc đổi link trùng rồi thử lại.',
        });
      }
      throw err;
    }
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
      .where(and(eq(links.id, id), eq(links.ownerUserId, req.user.sub), isNull(links.deletedAt)))
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
      .where(and(eq(links.id, id), eq(links.ownerUserId, req.user.sub), isNull(links.deletedAt)))
      .returning({ id: links.id });
    if (!deleted[0]) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Link not found' });
    return reply.send({ ok: true });
  });
};

