import type { CreateLinkResponse } from '@ssl/shared';
import { apiFetch } from './client';

export async function createLink(body: {
  longUrl: string;
  project?: string;
  customAlias?: string;
  recaptchaToken?: string;
}) {
  return apiFetch<CreateLinkResponse>('/links', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

