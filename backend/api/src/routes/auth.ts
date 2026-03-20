import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { LoginBodySchema, RegisterBodySchema } from '@ssl/shared';
import { db } from '../db/client';
import { users } from '../db/schema';
import { hashPassword } from '../auth/password';
import { toPublicError } from '../http/errors';
import { authenticateLocal } from '../auth/passportAuthenticate';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/register', async (req, reply) => {
    try {
      const body = RegisterBodySchema.parse(req.body);
      const passwordHash = await hashPassword(body.password);
      const inserted = await db
        .insert(users)
        .values({
          fullName: body.fullName,
          phone: body.phone,
          email: body.email.toLowerCase(),
          passwordHash,
        })
        .returning({
          id: users.id,
          fullName: users.fullName,
          phone: users.phone,
          email: users.email,
          createdAt: users.createdAt,
        });

      const user = inserted[0]!;
      const token = await reply.jwtSign({ sub: user.id, email: user.email });
      reply.setCookie('ssl_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        signed: true,
        secure: false,
      });
      return reply.send({
        ...user,
        createdAt: user.createdAt.toISOString(),
      });
    } catch (err) {
      const pub = toPublicError(err);
      return reply.code(pub.statusCode).send(pub);
    }
  });

  app.post('/auth/login', async (req, reply) => {
    try {
      LoginBodySchema.parse(req.body);

      const user = await authenticateLocal(req, reply);
      if (!user) {
        return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Sai email hoặc mật khẩu' });
      }

      const token = await reply.jwtSign({ sub: user.id, email: user.email });
      reply.setCookie('ssl_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        signed: true,
        secure: false,
      });

      const rows = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          phone: users.phone,
          email: users.email,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const row = rows[0]!;
      return reply.send({
        id: row.id,
        fullName: row.fullName,
        phone: row.phone,
        email: row.email,
        createdAt: row.createdAt.toISOString(),
      });
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
      .select({
        id: users.id,
        fullName: users.fullName,
        phone: users.phone,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));
    const user = rows[0];
    if (!user) return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Invalid token' });
    return reply.send({
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
  });
};
