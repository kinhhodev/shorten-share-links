import { env } from '../env';
import { HttpReplyError } from '../http/errors';

const MAX_LONG_URL_LENGTH = 2048;

/** Kiểm tra hostname trỏ localhost / RFC1918 / link-local (giảm open redirect tới nội bộ). */
export function isHostPrivateOrLocal(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost')) return true;

  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  if (h === '::1') return true;
  if (h.startsWith('fc') || h.startsWith('fd')) return true;

  return false;
}

function blockedHostsFromEnv(): Set<string> {
  const raw = env.BLOCKED_URL_HOSTS.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isHostBlocked(hostname: string, blocked: Set<string>): boolean {
  const h = hostname.toLowerCase();
  for (const b of blocked) {
    if (h === b || h.endsWith(`.${b}`)) return true;
  }
  return false;
}

/**
 * Kiểm tra URL đích khi tạo / cập nhật link (POST / PATCH).
 * Chặn scheme nguy hiểm, credential trong URL, nội bộ, host trong blocklist.
 */
export function assertSafeLongUrl(raw: string): void {
  if (raw.length > MAX_LONG_URL_LENGTH) {
    throw new HttpReplyError(400, 'URL_TOO_LONG', 'URL quá dài');
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpReplyError(400, 'INVALID_URL', 'URL không hợp lệ');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new HttpReplyError(400, 'UNSUPPORTED_SCHEME', 'Chỉ cho phép http:// hoặc https://');
  }

  if (url.username || url.password) {
    throw new HttpReplyError(400, 'URL_HAS_CREDENTIALS', 'Không cho phép user/password trong URL');
  }

  if (isHostPrivateOrLocal(url.hostname)) {
    throw new HttpReplyError(400, 'URL_HOST_NOT_ALLOWED', 'Không cho phép trỏ tới localhost hoặc mạng nội bộ');
  }

  const blocked = blockedHostsFromEnv();
  if (blocked.size > 0 && isHostBlocked(url.hostname, blocked)) {
    throw new HttpReplyError(400, 'URL_HOST_BLOCKED', 'Host này không được phép');
  }
}

/** @deprecated Dùng `assertSafeLongUrl` */
export const assertSafeLongUrlForCreate = assertSafeLongUrl;

/**
 * Kiểm tra nhanh trước khi redirect (cache hit / DB) — chặt scheme.
 */
export function isSafeHttpUrlForRedirect(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    return true;
  } catch {
    return false;
  }
}
