import type {
  LinkProjectsResponse,
  LinkTrashResponse,
  ListLinksResponse,
} from '@ssl/shared';
import { DASHBOARD_PROJECT_NONE_QUERY } from '@ssl/shared';
import { apiFetch } from './client';

export async function listLinkProjects() {
  return apiFetch<LinkProjectsResponse>('/links/projects');
}

export async function listProjectShares(project: string | null) {
  const p = project === null ? DASHBOARD_PROJECT_NONE_QUERY : project;
  return apiFetch<{ items: { id: string; recipientEmail: string; createdAt: string }[] }>(
    `/links/projects/shares?project=${encodeURIComponent(p)}`,
  );
}

export async function shareProject(project: string | null, recipientEmail: string) {
  return apiFetch<{ ok: boolean; copiedCount: number; recipientEmail: string }>(
    '/links/projects/share',
    {
      method: 'POST',
      body: JSON.stringify({
        project: project === null ? DASHBOARD_PROJECT_NONE_QUERY : project,
        recipientEmail,
      }),
    },
  );
}

export async function revokeProjectShare(shareId: string) {
  return apiFetch<{ ok: boolean }>(
    `/links/projects/shares/${encodeURIComponent(shareId)}`,
    { method: 'DELETE' },
  );
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

/** Xóa mềm toàn bộ link trong một chủ đề (chuyển vào Thùng rác). */
export async function softDeleteTopic(project: string | null) {
  const body = {
    project: project === null ? DASHBOARD_PROJECT_NONE_QUERY : project,
  };
  return apiFetch<{ ok: boolean; batchId: string; movedCount: number }>(
    '/links/topics/soft-delete',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function listTrash() {
  return apiFetch<LinkTrashResponse>('/links/trash');
}

export async function restoreTrashBatch(batchId: string) {
  return apiFetch<{ ok: boolean; restoredCount: number }>(
    `/links/trash/${encodeURIComponent(batchId)}/restore`,
    { method: 'POST' },
  );
}

