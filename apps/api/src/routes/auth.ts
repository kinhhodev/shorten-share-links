import type { FastifyPluginAsync } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { users } from '../db/schema';
import { hashPassword, verifyPassword } from '../auth/password';
import { toPublicError } from '../http/errors';

const RegisterBody = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const LoginBody = RegisterBody;

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/register', async (req, reply) => {
    try {
      const body = RegisterBody.parse(req.body);
      const passwordHash = await hashPassword(body.password);
      const inserted = await db
        .insert(users)
        .values({ email: body.email.toLowerCase(), passwordHash })
        .returning({ id: users.id, email: users.email, createdAt: users.createdAt });

      const user = inserted[0]!;
      const token = await reply.jwtSign({ sub: user.id, email: user.email });
      reply.setCookie('ssl_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        signed: true,
        secure: false,
      });
      return reply.send({ ...user, createdAt: user.createdAt.toISOString() });
    } catch (err) {
      const pub = toPublicError(err);
      return reply.code(pub.statusCode).send(pub);
    }
  });

  app.post('/auth/login', async (req, reply) => {
    try {
      const body = LoginBody.parse(req.body);
      const email = body.email.toLowerCase();
      const rows = await db
        .select({ id: users.id, email: users.email, passwordHash: users.passwordHash, createdAt: users.createdAt })
        .from(users)
        .where(and(eq(users.email, email)));

      const user = rows[0];
      if (!user) return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
      const ok = await verifyPassword(body.password, user.passwordHash);
      if (!ok) return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });

      const token = await reply.jwtSign({ sub: user.id, email: user.email });
      reply.setCookie('ssl_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        signed: true,
        secure: false,
      });
      return reply.send({ id: user.id, email: user.email, createdAt: user.createdAt.toISOString() });
    } catch (err) {
      const pub = toPublicError(err);
      return reply.code(pub.statusCode).send(pub);
    }
  });

  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie('ssl_token', { path: '/' });
    return reply.send({ ok: true });
  });

  app.get('/me', { preHandler: app.authenticate }, async (req, reply) => {
    const userId = req.user.sub;
    const rows = await db
      .select({ id: users.id, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId));
    const user = rows[0];
    if (!user) return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Invalid token' });
    return reply.send({ id: user.id, email: user.email, createdAt: user.createdAt.toISOString() });
  });
};

