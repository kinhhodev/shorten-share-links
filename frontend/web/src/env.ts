const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

/** Origin phục vụ redirect `/r/...` (mặc định = API origin bỏ hậu tố `/api`). */
const derivedPublicOrigin = API_BASE_URL.replace(/\/api\/?$/, '') || 'http://localhost:3001';

/** Google reCAPTCHA v3 site key (public). Để trống = không gửi token. */
const RECAPTCHA_SITE_KEY =
  (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim() ?? '';

export const env = {
  API_BASE_URL,
  PUBLIC_ORIGIN:
    (import.meta.env.VITE_PUBLIC_ORIGIN as string | undefined)?.replace(/\/$/, '') ?? derivedPublicOrigin,
  RECAPTCHA_SITE_KEY,
};

/** URL rút gọn đầy đủ (cùng quy tắc với API). */
export function shortRedirectUrl(project: string | null, code: string): string {
  const origin = env.PUBLIC_ORIGIN.replace(/\/$/, '');
  return project ? `${origin}/r/${project}/${code}` : `${origin}/r/${code}`;
}

