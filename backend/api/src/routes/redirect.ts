import type { FastifyPluginAsync } from 'fastify';
import type { FastifyReply } from 'fastify';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { links } from '../db/schema';
import { redis } from '../cache/redis';
import { isSafeHttpUrlForRedirect } from '../security/urlPolicy';

function cacheKey(project: string | null, code: string) {
  return project ? `r:${project}:${code}` : `r::${code}`;
}

/** Thống nhất phản hồi để giảm enumeration (không phân biệt không tồn tại / tắt / hết hạn). */
const LINK_UNAVAILABLE = {
  code: 'NOT_FOUND',
  message: 'Link not found or unavailable',
} as const;

function replyUnavailable(reply: FastifyReply) {
  return reply.code(404).send(LINK_UNAVAILABLE);
}

export const redirectRoutes: FastifyPluginAsync = async (app) => {
  await redis.connect().catch(() => undefined);

  app.get(
    '/r/:code',
    {
      config: {
        rateLimit: {
          max: 300,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
    const code = (req.params as any).code as string;
    const key = cacheKey(null, code);
    const cached = await redis.get(key).catch(() => null);
    if (cached) {
      if (isSafeHttpUrlForRedirect(cached)) return reply.redirect(cached, 302);
      await redis.del(key).catch(() => undefined);
    }

    const row = await db
      .select({ longUrl: links.longUrl, isActive: links.isActive, expiresAt: links.expiresAt })
      .from(links)
      .where(and(eq(links.code, code), isNull(links.project)))
      .limit(1);

    const hit = row[0];
    if (!hit) return replyUnavailable(reply);
    if (!hit.isActive) return replyUnavailable(reply);
    if (hit.expiresAt && hit.expiresAt.getTime() < Date.now()) return replyUnavailable(reply);

    if (!isSafeHttpUrlForRedirect(hit.longUrl)) return replyUnavailable(reply);

    await redis.set(key, hit.longUrl, 'EX', 60 * 60 * 24 * 30).catch(() => undefined);
    return reply.redirect(hit.longUrl, 302);
    },
  );

  app.get(
    '/r/:project/:code',
    {
      config: {
        rateLimit: {
          max: 300,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
    const project = (req.params as any).project as string;
    const code = (req.params as any).code as string;
    const key = cacheKey(project, code);
    const cached = await redis.get(key).catch(() => null);
    if (cached) {
      if (isSafeHttpUrlForRedirect(cached)) return reply.redirect(cached, 302);
      await redis.del(key).catch(() => undefined);
    }

    const row = await db
      .select({ longUrl: links.longUrl, isActive: links.isActive, expiresAt: links.expiresAt })
      .from(links)
      .where(and(eq(links.project, project), eq(links.code, code)))
      .limit(1);

    const hit = row[0];
    if (!hit) return replyUnavailable(reply);
    if (!hit.isActive) return replyUnavailable(reply);
    if (hit.expiresAt && hit.expiresAt.getTime() < Date.now()) return replyUnavailable(reply);

    if (!isSafeHttpUrlForRedirect(hit.longUrl)) return replyUnavailable(reply);

    await redis.set(key, hit.longUrl, 'EX', 60 * 60 * 24 * 30).catch(() => undefined);
    return reply.redirect(hit.longUrl, 302);
    },
  );
};
