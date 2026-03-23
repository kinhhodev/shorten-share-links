import { env } from '../env';
import { HttpReplyError } from '../http/errors';

const SITE_VERIFY = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * reCAPTCHA v3: bắt buộc khi `RECAPTCHA_SECRET_KEY` được cấu hình (trừ khi tắt rõ ràng).
 * - Mặc định chỉ bắt token cho tạo link **ẩn danh** (giảm spam).
 * - Bật `RECAPTCHA_REQUIRE_FOR_AUTHENTICATED=true` để bắt cả user đã đăng nhập.
 */
export async function assertRecaptchaIfRequired(
  token: string | undefined,
  isAuthenticated: boolean,
  remoteIp: string | undefined,
): Promise<void> {
  const secret = env.RECAPTCHA_SECRET_KEY.trim();
  if (!secret) return;

  const needToken = isAuthenticated ? env.RECAPTCHA_REQUIRE_FOR_AUTHENTICATED : true;
  if (!needToken) return;

  if (!token || token.length < 20) {
    throw new HttpReplyError(400, 'RECAPTCHA_REQUIRED', 'Thiếu xác thực reCAPTCHA');
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (remoteIp) body.set('remoteip', remoteIp);

  let data: { success?: boolean; score?: number; action?: string; 'error-codes'?: string[] };
  try {
    const res = await fetch(SITE_VERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    data = (await res.json()) as typeof data;
  } catch {
    throw new HttpReplyError(503, 'RECAPTCHA_UNAVAILABLE', 'Không kiểm tra được reCAPTCHA, thử lại sau');
  }

  if (!data.success) {
    throw new HttpReplyError(400, 'RECAPTCHA_FAILED', 'Xác thực reCAPTCHA thất bại');
  }

  if (typeof data.score === 'number' && data.score < env.RECAPTCHA_MIN_SCORE) {
    throw new HttpReplyError(400, 'RECAPTCHA_LOW_SCORE', 'Yêu cầu bị từ chối (spam/giả mạo). Thử lại sau.');
  }
}
