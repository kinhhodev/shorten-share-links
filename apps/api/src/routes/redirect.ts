import type { FastifyPluginAsync } from 'fastify';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { links } from '../db/schema';
import { redis } from '../cache/redis';

function cacheKey(project: string | null, code: string) {
  return project ? `r:${project}:${code}` : `r::${code}`;
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
    if (cached) return reply.redirect(302, cached);

    const row = await db
      .select({ longUrl: links.longUrl, isActive: links.isActive, expiresAt: links.expiresAt })
      .from(links)
      .where(and(eq(links.code, code), isNull(links.project)))
      .limit(1);

    const hit = row[0];
    if (!hit) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Link not found' });
    if (!hit.isActive) return reply.code(410).send({ code: 'GONE', message: 'Link disabled' });
    if (hit.expiresAt && hit.expiresAt.getTime() < Date.now())
      return reply.code(410).send({ code: 'GONE', message: 'Link expired' });

    await redis.set(key, hit.longUrl, 'EX', 60 * 60 * 24 * 30).catch(() => undefined);
    return reply.redirect(302, hit.longUrl);
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
    if (cached) return reply.redirect(302, cached);

    const row = await db
      .select({ longUrl: links.longUrl, isActive: links.isActive, expiresAt: links.expiresAt })
      .from(links)
      .where(and(eq(links.project, project), eq(links.code, code)))
      .limit(1);

    const hit = row[0];
    if (!hit) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Link not found' });
    if (!hit.isActive) return reply.code(410).send({ code: 'GONE', message: 'Link disabled' });
    if (hit.expiresAt && hit.expiresAt.getTime() < Date.now())
      return reply.code(410).send({ code: 'GONE', message: 'Link expired' });

    await redis.set(key, hit.longUrl, 'EX', 60 * 60 * 24 * 30).catch(() => undefined);
    return reply.redirect(302, hit.longUrl);
    },
  );
};

