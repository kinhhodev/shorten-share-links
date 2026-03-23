import type { FastifyPluginAsync } from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { env } from '../env';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: 'onRequest',
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'ssl_token',
      signed: true,
    },
  });

  app.decorate(
    'authenticate',
    async function authenticate(request: FastifyRequest, reply: FastifyReply) {
      // Chỉ đọc cookie ssl_token — bỏ qua Authorization: Bearer để tránh token lạ (extension/Postman) làm fail verify.
      try {
        await request.jwtVerify({ onlyCookie: true });
      } catch {
        /** Không rethrow: tránh log stack FastifyError cho trường hợp chưa đăng nhập (401 bình thường). */
        return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Cần đăng nhập' });
      }
    },
  );
};

export default fp(authPlugin, { name: 'auth' });

