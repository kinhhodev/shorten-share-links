import { env } from '../env';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

let loadPromise: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (!env.RECAPTCHA_SITE_KEY) return Promise.resolve();
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.grecaptcha?.execute) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const id = 'recaptcha-v3-script';
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.id = id;
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(env.RECAPTCHA_SITE_KEY)}`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Không tải được reCAPTCHA'));
    document.head.appendChild(s);
  });
  return loadPromise;
}

/**
 * Lấy token reCAPTCHA v3 (action tùy chỉnh). Trả `undefined` nếu chưa cấu hình site key.
 */
export async function getRecaptchaToken(action: string): Promise<string | undefined> {
  if (!env.RECAPTCHA_SITE_KEY) return undefined;
  await loadRecaptchaScript();
  await new Promise<void>((resolve) => {
    window.grecaptcha!.ready(() => resolve());
  });
  return window.grecaptcha!.execute(env.RECAPTCHA_SITE_KEY, { action });
}
