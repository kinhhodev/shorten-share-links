import type { LinkProjectsResponse, ListLinksResponse } from '@ssl/shared';
import { apiFetch } from './client';

export async function listLinkProjects() {
  return apiFetch<LinkProjectsResponse>('/links/projects');
}

export async function listLinks(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  /** Omit = tất cả; giá trị `__none__` = chỉ link không có project */
  project?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.q) qs.set('q', params.q);
  if (params.project !== undefined) qs.set('project', params.project);
  return apiFetch<ListLinksResponse>(`/links?${qs.toString()}`);
}

export async function updateLink(id: string, body: { isActive?: boolean; longUrl?: string }) {
  return apiFetch(`/links/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteLink(id: string) {
  return apiFetch(`/links/${id}`, { method: 'DELETE' });
}

