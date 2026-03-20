import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './env';
import './auth/passport';
import auth from './auth/plugin';
import { authRoutes } from './routes/auth';
import { linkRoutes } from './routes/links';
import { redirectRoutes } from './routes/redirect';

const app = Fastify({
  logger:
    env.NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' },
          },
        }
      : true,
});

await app.register(cors, {
  origin: env.APP_ORIGIN,
  credentials: true,
});

await app.register(rateLimit, {
  global: false,
});

await app.register(auth);
await app.register(authRoutes, { prefix: '/api' });
await app.register(linkRoutes, { prefix: '/api' });
await app.register(redirectRoutes);

app.get('/health', async () => ({ ok: true }));

await app.listen({ port: env.PORT, host: '0.0.0.0' });

