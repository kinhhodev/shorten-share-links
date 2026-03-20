import type { FastifyReply, FastifyRequest } from 'fastify';
import { passport, type PassportUser } from './passport';

/** Chạy passport-local trên request Fastify (session: false, JWT sau bước này). */
export function authenticateLocal(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<PassportUser | null> {
  return new Promise((resolve, reject) => {
    const augmentedReq = Object.assign(req.raw, {
      body: req.body,
      query: req.query,
      headers: req.headers,
      method: req.method,
      url: req.url,
    });

    passport.authenticate(
      'local',
      { session: false },
      (err: Error | undefined, user: PassportUser | false | null) => {
        if (err) return reject(err);
        if (!user) return resolve(null);
        resolve(user);
      },
    )(augmentedReq, reply.raw, () => {});
  });
}
