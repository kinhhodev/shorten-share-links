import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

const Uuid = z.string().uuid();

/**
 * Đọc session từ cookie ssl_token. Trả về UUID user hoặc null (ẩn danh).
 * Bỏ qua nếu JWT không verify được hoặc `sub` không phải UUID (tránh 500 khi insert FK / uuid).
 */
export async function resolveOwnerUserIdFromCookieOrNull(req: FastifyRequest): Promise<string | null> {
  try {
    await req.jwtVerify({ onlyCookie: true });
  } catch {
    return null;
  }

  const raw = (req.user as { sub?: unknown } | undefined)?.sub;
  if (typeof raw !== 'string') {
    req.log.warn('JWT verified nhưng thiếu sub');
    return null;
  }
  const trimmed = raw.trim();
  const parsed = Uuid.safeParse(trimmed);
  if (!parsed.success) {
    req.log.warn({ sub: raw }, 'JWT sub không phải UUID hợp lệ');
    return null;
  }
  return parsed.data;
}
