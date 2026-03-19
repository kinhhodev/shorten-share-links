import { ZodError } from 'zod';

export function toPublicError(err: unknown) {
  if (err instanceof ZodError) {
    return { statusCode: 400, code: 'BAD_REQUEST', message: 'Invalid request', details: err.flatten() };
  }
  return { statusCode: 500, code: 'INTERNAL', message: 'Internal error' };
}

