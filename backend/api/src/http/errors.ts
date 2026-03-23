import { ZodError } from 'zod';
import { env } from '../env';

/** Mã lỗi Postgres (vd 23505), kể cả khi bọc bởi DrizzleQueryError (cause chain). */
export function pgCodeDeep(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let i = 0; i < 6 && cur && typeof cur === 'object'; i++) {
    const c = (cur as { code?: string }).code;
    if (typeof c === 'string' && /^\d{5}$/.test(c)) return c;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

function pgCode(err: unknown): string | undefined {
  return pgCodeDeep(err);
}

function pgMessage(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message?: string }).message);
  }
  return undefined;
}

export function toPublicError(err: unknown) {
  if (err instanceof ZodError) {
    return { statusCode: 400, code: 'BAD_REQUEST', message: 'Invalid request', details: err.flatten() };
  }

  const code = pgCode(err);
  const msg = pgMessage(err) ?? '';

  if (code === '23505') {
    return { statusCode: 409, code: 'CONFLICT', message: 'Email đã được sử dụng' };
  }
  if (code === '23503') {
    return {
      statusCode: 400,
      code: 'FK_VIOLATION',
      message: 'Dữ liệu không khớp (user/link). Thử đăng xuất và đăng nhập lại.',
    };
  }
  if (code === '23502') {
    return {
      statusCode: 500,
      code: 'DB_SCHEMA',
      message:
        'Thiếu cột hoặc NOT NULL trên DB. Chạy: cd backend/api && npm run db:migrate (và kiểm tra migration đã áp hết).',
      details: { pg: msg },
    };
  }
  if (code === '22P02') {
    return { statusCode: 400, code: 'INVALID_DATA', message: 'Định dạng UUID/dữ liệu không hợp lệ', details: { pg: msg } };
  }
  if (code === '42703') {
    return {
      statusCode: 500,
      code: 'DB_SCHEMA',
      message: 'Cột không tồn tại trên DB — chạy migrate.',
      details: { pg: msg },
    };
  }

  return {
    statusCode: 500,
    code: 'INTERNAL',
    message: 'Internal error',
    details: env.NODE_ENV === 'development' ? { pg: msg } : undefined,
  };
}

