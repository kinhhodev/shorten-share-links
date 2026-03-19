import type { LoginBody, MeResponse } from '@ssl/shared';
import { apiFetch } from './client';

export async function register(body: LoginBody) {
  return apiFetch<MeResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) });
}

export async function login(body: LoginBody) {
  return apiFetch<MeResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) });
}

export async function logout() {
  return apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' });
}

export async function me() {
  return apiFetch<MeResponse>('/me');
}

