import { ZodError } from 'zod';

function isPgUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

export function toPublicError(err: unknown) {
  if (err instanceof ZodError) {
    return { statusCode: 400, code: 'BAD_REQUEST', message: 'Invalid request', details: err.flatten() };
  }
  if (isPgUniqueViolation(err)) {
    return { statusCode: 409, code: 'CONFLICT', message: 'Email đã được sử dụng' };
  }
  return { statusCode: 500, code: 'INTERNAL', message: 'Internal error' };
}

