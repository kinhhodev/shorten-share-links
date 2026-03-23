import { env } from '../env';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const body = init?.body;
  const hasBody =
    body != null && (typeof body !== 'string' || body.length > 0);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  /** Fastify: không gửi `application/json` khi không có body — sẽ lỗi "Body cannot be empty when content-type is set to 'application/json'" */
  const headers = new Headers(init?.headers);
  if (hasBody && !isFormData && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const res = await fetch(`${env.API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

