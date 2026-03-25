import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import type { LinkProjectSummary, LinkTrashItem, MeResponse } from '@ssl/shared';
import { DASHBOARD_PROJECT_NONE_QUERY } from '@ssl/shared';
import { logout, me } from './api/auth';
import {
  deleteLink,
  listLinkProjects,
  listLinks,
  listProjectShares,
  listTrash,
  restoreTrashBatch,
  revokeProjectShare,
  shareProject,
  softDeleteTopic,
} from './api/dashboard';
import { createLink } from './api/links';
import { AuthModal, type AuthMode } from './auth/AuthModal';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Dialog } from './ui/dialog';
import { Input } from './ui/input';
import { UserAccountMenu } from './ui/user-account-menu';
import { IconChevronDown, IconCopy, IconShare, IconTrash } from './ui/icons';
import { cn } from './lib/cn';
import { getRecaptchaToken } from './lib/recaptcha';
import { shortRedirectUrl } from './env';

function Shell({
  children,
  center,
  onLogout: _onLogout,
  hasSession: _hasSession,
  userLabel: _userLabel,
  onOpenLogin: _onOpenLogin,
  onOpenSignup: _onOpenSignup,
}: {
  children: React.ReactNode;
  onLogout?: () => void;
  center?: boolean;
  hasSession: boolean;
  userLabel?: string;
  onOpenLogin: () => void;
  onOpenSignup: () => void;
}) {
  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto flex w-full max-w-5xl flex-col min-h-[100svh]">
        <main className={center ? 'flex flex-1 items-center justify-center' : undefined}>{children}</main>
      </div>
    </div>
  );
}

function HomePage({
  onOpenLogin,
  onOpenSignup,
  hasSession,
  user,
  onLogout,
}: {
  onOpenLogin: () => void;
  onOpenSignup: () => void;
  hasSession: boolean;
  user: MeResponse | null;
  onLogout?: () => void | Promise<void>;
}) {
  const [searchParams] = useSearchParams();
  const [projectName, setProjectName] = useState('');
  const [alias, setAlias] = useState('');
  const [permalink, setPermalink] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [ownerHint, setOwnerHint] = useState<string | null>(null);

  const canSubmit = useMemo(() => permalink.trim().length > 0 && !loading, [permalink, loading]);

  useEffect(() => {
    const p = searchParams.get('project');
    if (p === DASHBOARD_PROJECT_NONE_QUERY || p === '') {
      setProjectName('');
    } else if (p) {
      setProjectName(p);
    }
  }, [searchParams]);

  async function onSubmit() {
    setError(null);
    setShortUrl(null);
    setOwnerHint(null);
    setLoading(true);
    try {
      const recaptchaToken = await getRecaptchaToken('create_link');
      const res = await createLink({
        longUrl: permalink,
        project: projectName.trim() || undefined,
        customAlias: alias.trim() || undefined,
        ...(recaptchaToken ? { recaptchaToken } : {}),
      });
      setShortUrl(res.shortUrl);
      if (res.ownerUserId === -1) {
        setOwnerHint('Đã tạo link ẩn danh (không gắn tài khoản). Đăng nhập để quản lý link trong Dashboard.');
      } else {
        setOwnerHint('Link đã lưu vào tài khoản của bạn.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-[50%] mx-auto md:w-full md:px-6">
      <div className="flex items-stretch gap-8">
        <Card className="w-full h-full">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="p-[20px] flex flex-col flex-1">
              <div className="flex flex-row justify-between md:justify-start md:flex-col-reverse gap-2">
                <div className="">
                  <h1 className="text-2xl font-semibold text-text my-0">Shorten Share Links</h1>
                  <p className="text-sm text-muted">
                    Nhập thông tin, hệ thống sẽ trả về link ngắn để chia sẻ nhanh.
                  </p>
                </div>
                <div className="flex justify-end">
                  {hasSession && user && onLogout ? (
                    <UserAccountMenu
                      displayName={user.fullName?.trim() ? user.fullName : user.email}
                      onLogout={onLogout}
                      showTrashLink
                    />
                  ) : null}
                </div>
              </div>

              {error ? <div className="mt-1 text-sm text-danger">{error}</div> : null}

              {shortUrl ? (
                <div className="rounded-md border border-border bg-bg p-3 my-2">
                  <div className="text-xs font-medium text-muted">Short link</div>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="min-w-0 flex-1 truncate font-mono text-sm text-text">{shortUrl}</div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(shortUrl);
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  {ownerHint ? <div className="mt-2 text-xs text-muted">{ownerHint}</div> : null}
                </div>
              ) : null}

              <form
                className="flex flex-col gap-4 flex-1 mt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  onSubmit();
                }}
              >
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-muted">Tên chủ đề</label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="toeic-2026"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-muted">Tên rút gọn</label>
                  <Input
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="hoc-tieng-anh"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-muted">Đường dẫn gốc</label>
                  <Input
                    value={permalink}
                    onChange={(e) => setPermalink(e.target.value)}
                    placeholder="https://example.com/"
                    autoComplete="off"
                  />
                </div>

                <div className="w-full flex flex-col gap-2">
                  <Button type="submit" disabled={!canSubmit} className="w-full mt-3 border-none">
                    {loading ? 'Submitting...' : 'Tạo Link'}
                  </Button>

                  {!hasSession ? (
                    <>
                      <hr className="border-border w-full" />

                      <div className="flex gap-2 sm:flex-row sm:justify-center">
                        <Button type="button" variant="primary" className="w-full sm:w-auto border-none" onClick={onOpenLogin}>
                          Đăng nhập
                        </Button>
                        <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onOpenSignup}>
                          Đăng ký
                        </Button>
                      </div>
                    </>
                  ) : null}

                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoginPage({ mode, onSuccess }: { mode: 'login' | 'register'; onSuccess: () => Promise<void> }) {
  const nav = useNavigate();

  return (
    <div className="flex min-h-[40vh] justify-center py-10 px-4">
      <AuthModal
        open
        mode={mode === 'login' ? 'login' : 'signup'}
        onClose={() => nav('/')}
        onSuccess={async () => {
          await onSuccess();
          nav('/dashboard');
        }}
        onSwitchMode={(m: AuthMode) => nav(m === 'login' ? '/login' : '/register')}
      />
    </div>
  );
}

type DashboardLinkRow = {
  id: string;
  project: string | null;
  code: string;
  longUrl: string;
};

const DASHBOARD_PAGE_SIZE = 20;

function ShareTopicDialog({
  open,
  onClose,
  row,
  onShared,
}: {
  open: boolean;
  onClose: () => void;
  row: LinkProjectSummary | null;
  onShared: () => void;
}) {
  const [email, setEmail] = useState('');
  const [shareItems, setShareItems] = useState<
    { id: string; recipientEmail: string; createdAt: string }[]
  >([]);
  const [loadingList, setLoadingList] = useState(false);
  const [sending, setSending] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setDialogError(null);
    setEmail('');
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const res = await listProjectShares(row.project);
        if (!cancelled) setShareItems(res.items);
      } catch (e: unknown) {
        if (!cancelled) {
          setDialogError(e instanceof Error ? e.message : 'Không tải được danh sách chia sẻ');
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, row]);

  const titleLabel = row ? (row.project === null ? 'Không chủ đề' : row.project) : '';

  if (!row) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Chia sẻ chủ đề: ${titleLabel}`}
    >
      <p className="text-xs text-muted">
        Mỗi lần chia sẻ sẽ <strong className="text-text">sao chép toàn bộ link</strong> trong chủ đề sang
        tài khoản người nhận. Khi bạn thu hồi chia sẻ (bên dưới), link của họ{' '}
        <strong className="text-text">không bị xóa</strong>.
      </p>
      {dialogError ? <div className="mt-2 text-sm text-danger">{dialogError}</div> : null}

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={async (e) => {
          e.preventDefault();
          const e2 = email.trim();
          if (!e2) return;
          setSending(true);
          setDialogError(null);
          try {
            await shareProject(row.project, e2);
            setEmail('');
            const res = await listProjectShares(row.project);
            setShareItems(res.items);
            onShared();
          } catch (err: unknown) {
            setDialogError(err instanceof Error ? err.message : 'Không gửi được chia sẻ');
          } finally {
            setSending(false);
          }
        }}
      >
        <Input
          type="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="Email người nhận (đã đăng ký)"
          className="flex-1"
          autoComplete="email"
        />
        <Button type="submit" variant="primary" className="shrink-0 border-none" disabled={sending}>
          {sending ? 'Đang gửi…' : 'Gửi chia sẻ'}
        </Button>
      </form>

      <div className="mt-4 border-t border-border pt-3">
        <div className="text-xs font-bold uppercase tracking-wide text-muted">Đã chia sẻ cho</div>
        {loadingList ? (
          <div className="mt-2 text-sm text-muted">Đang tải…</div>
        ) : shareItems.length === 0 ? (
          <div className="mt-2 text-sm text-muted">Chưa có người nhận.</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {shareItems.map((it) => (
              <li
                key={it.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-2 py-2 text-sm"
              >
                <span className="min-w-0 font-mono text-xs">{it.recipientEmail}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  onClick={async () => {
                    if (!window.confirm('Thu hồi chia sẻ với người này? Link của họ vẫn giữ trong tài khoản họ.')) {
                      return;
                    }
                    setDialogError(null);
                    try {
                      await revokeProjectShare(it.id);
                      setShareItems((prev) => prev.filter((x) => x.id !== it.id));
                      onShared();
                    } catch (err: unknown) {
                      setDialogError(err instanceof Error ? err.message : 'Không thu hồi được');
                    }
                  }}
                >
                  Thu hồi
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

function DashboardTopicAccordion({
  row,
  qApplied,
  expanded,
  onToggle,
  onRefreshProjects,
  deletingTopic,
  onDeleteTopic,
  setError,
  listVersion,
  sharedRecipientCount,
  onShareClick,
}: {
  row: LinkProjectSummary;
  qApplied: string;
  expanded: boolean;
  onToggle: () => void;
  onRefreshProjects: () => Promise<void>;
  deletingTopic: boolean;
  onDeleteTopic: () => Promise<void>;
  setError: (msg: string | null) => void;
  /** Tăng sau khi danh sách chủ đề / link thay đổi — refetch bảng con */
  listVersion: number;
  sharedRecipientCount: number;
  onShareClick: () => void;
}) {
  const projectParam = row.project === null ? DASHBOARD_PROJECT_NONE_QUERY : row.project!;
  const label = row.project === null ? 'Không chủ đề' : row.project;
  const isShared = sharedRecipientCount > 0;

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DashboardLinkRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [qApplied]);

  useEffect(() => {
    if (!expanded) {
      setPage(1);
    }
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listLinks({
          page,
          pageSize: DASHBOARD_PAGE_SIZE,
          q: qApplied || undefined,
          project: projectParam,
        });
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
        if (res.items.length === 0 && res.total > 0 && page > 1) {
          setPage((p) => Math.max(1, p - 1));
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded, projectParam, qApplied, page, setError, listVersion]);

  const emptyMsg = qApplied.trim()
    ? 'Không có link nào khớp tìm kiếm.'
    : 'Chưa có link trong chủ đề này.';

  const totalPages = Math.max(1, Math.ceil(total / DASHBOARD_PAGE_SIZE));

  return (
    <div
      className={cn(
        'rounded-md border',
        isShared ? 'border-emerald-500/50 bg-emerald-500/[0.07]' : 'border-border',
      )}
    >
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-3 text-left text-sm hover:bg-bg/80 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-brand/40"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <IconChevronDown
            className={`h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
          {isShared ? (
            <span className="inline-flex shrink-0" title="Chủ đề đã được chia sẻ">
              <IconShare className="h-4 w-4 text-emerald-600" aria-hidden />
            </span>
          ) : null}
          <span className="min-w-0 font-medium text-text">{label}</span>
          <span className="shrink-0 text-xs text-muted">({row.total})</span>
        </button>
        <div className="flex shrink-0 items-center gap-1 pr-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-9 w-9 shrink-0 p-0"
            disabled={deletingTopic || row.total === 0}
            title="Chia sẻ chủ đề"
            aria-label="Chia sẻ chủ đề"
            onClick={(e) => {
              e.stopPropagation();
              onShareClick();
            }}
          >
            <IconShare className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="danger"
            className="h-9 w-9 shrink-0 border-none p-0 text-[#fff]"
            disabled={deletingTopic || row.total === 0}
            title="Chuyển chủ đề vào Thùng rác (xóa mềm)"
            aria-label="Chuyển chủ đề vào Thùng rác"
            onClick={(e) => {
              e.stopPropagation();
              void onDeleteTopic();
            }}
          >
            <IconTrash className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {expanded ? (
        <div className="border-t border-border">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-muted">Đang tải danh sách link…</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-bg text-muted">
                    <tr>
                      <th className="p-3">Tên rút gọn</th>
                      <th className="p-3 min-w-[200px]">Link rút gọn</th>
                      <th className="p-3 w-[1%] whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const shortUrl = shortRedirectUrl(it.project, it.code);
                      return (
                        <tr key={it.id} className="border-t border-border">
                          <td className="p-3 align-middle font-mono">{it.code}</td>
                          <td className="p-3 align-middle">
                            <a
                              href={shortUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-w-0 font-mono text-sm text-brand underline-offset-2 hover:underline break-all"
                              title={shortUrl}
                            >
                              {shortUrl}
                            </a>
                          </td>
                          <td className="p-3 align-middle">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-9 w-9 shrink-0 p-0"
                                title="Sao chép link"
                                aria-label="Sao chép link rút gọn"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(shortUrl);
                                }}
                              >
                                <IconCopy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                className="h-9 w-9 shrink-0 border-none p-0 text-[#fff]"
                                title="Xóa link"
                                aria-label="Xóa link"
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      'Xóa link này vĩnh viễn? Không thể hoàn tác.',
                                    )
                                  ) {
                                    return;
                                  }
                                  try {
                                    await deleteLink(it.id);
                                    await onRefreshProjects();
                                  } catch (e: unknown) {
                                    setError(e instanceof Error ? e.message : 'Không xóa được link');
                                  }
                                }}
                              >
                                <IconTrash className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {items.length === 0 ? (
                      <tr>
                        <td className="p-3 text-muted" colSpan={3}>
                          {emptyMsg}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {total > DASHBOARD_PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-sm text-muted">
                  <span>
                    Trang {page} / {totalPages} — {total} link
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Trước
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DashboardChrome({
  user,
  onLogout,
  children,
}: {
  user: MeResponse;
  onLogout: () => void | Promise<void>;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const onTrash = pathname.endsWith('/trash');

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link
                to="/dashboard"
                className={`text-2xl font-semibold no-underline ${
                  !onTrash ? 'font-medium text-text' : 'text-muted hover:text-text'
                }`}
              >
              Dashboard
            </Link>
            <nav
              className="flex flex-wrap items-center gap-1 text-sm"
              aria-label="Khu vực dashboard"
            >
              <Link
                to="/dashboard/trash"
                className={`rounded-md px-2 py-1 no-underline ${
                  onTrash ? 'bg-brand/15 font-medium text-text' : 'text-muted hover:text-text'
                }`}
              >
                Thùng rác
              </Link>
            </nav>
            <Link to="/">
              <Button size="sm" variant="primary" className="shrink-0 border-none sm:w-auto">
                Tạo link nhanh
              </Button>
            </Link>
          </div>
          <UserAccountMenu
            showDashboard={false}
            showTrashLink={false}
            displayName={user.fullName?.trim() ? user.fullName : user.email}
            onLogout={onLogout}
            className="shrink-0"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function DashboardTopicsPage() {
  const [searchParams] = useSearchParams();

  const [projectSummaries, setProjectSummaries] = useState<LinkProjectSummary[]>([]);
  const [listVersion, setListVersion] = useState(0);
  const [qInput, setQInput] = useState('');
  const [qApplied, setQApplied] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [deletingTopicKey, setDeletingTopicKey] = useState<string | null>(null);
  const [shareRow, setShareRow] = useState<LinkProjectSummary | null>(null);

  const refreshProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await listLinkProjects();
      setProjectSummaries(res.items);
      setListVersion((v) => v + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách chủ đề');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  /** Mở đúng chủ đề khi vào `/dashboard?project=...` */
  useEffect(() => {
    const p = searchParams.get('project');
    if (!p) return;
    const key = p === DASHBOARD_PROJECT_NONE_QUERY ? '__none__' : p;
    setExpandedTopics((prev) => ({ ...prev, [key]: true }));
  }, [searchParams]);

  const totalAllLinks = useMemo(
    () => projectSummaries.reduce((s, it) => s + it.total, 0),
    [projectSummaries],
  );

  const softDeleteTopicFlow = useCallback(
    async (project: string | null) => {
      const key = project === null ? '__none__' : project;
      if (
        !window.confirm(
          project === null
            ? 'Chuyển toàn bộ link “Không chủ đề” vào Thùng rác? Có thể khôi phục sau.'
            : `Chuyển toàn bộ link trong chủ đề “${project}” vào Thùng rác? Có thể khôi phục sau.`,
        )
      ) {
        return;
      }
      setDeletingTopicKey(key);
      setError(null);
      try {
        await softDeleteTopic(project);
        setExpandedTopics((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        await refreshProjects();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Không chuyển được chủ đề vào thùng rác');
      } finally {
        setDeletingTopicKey(null);
      }
    },
    [refreshProjects],
  );

  const emptyTopicsMessage =
    totalAllLinks === 0
      ? 'Chưa có link nào. Tạo link từ trang chủ hoặc bấm “Tạo link nhanh”.'
      : null;

  return (
    <>
      <ShareTopicDialog
        open={shareRow !== null}
        onClose={() => setShareRow(null)}
        row={shareRow}
        onShared={() => {
          void refreshProjects();
        }}
      />
      {error ? <div className="text-sm text-danger">{error}</div> : null}

      <div className="min-w-0 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2 flex-1 space-y-1">
            <label className="text-xs font-bold text-muted">Tìm kiếm (Tên rút gọn / URL)</label>
            <div className="flex gap-2">
              <Input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setQApplied(qInput.trim());
                  }
                }}
                placeholder="Link hoặc mã code sau đó nhấn Enter"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {loadingProjects ? (
          <div className="rounded-md border border-border border-dashed px-4 py-8 text-center text-sm text-muted">
            Đang tải danh sách chủ đề…
          </div>
        ) : emptyTopicsMessage ? (
          <div className="rounded-md border border-border border-dashed px-4 py-8 text-center text-sm text-muted">
            {emptyTopicsMessage}
          </div>
        ) : (
          <div className="space-y-2">
            {projectSummaries.map((row) => {
              const projectKey = row.project === null ? '__none__' : row.project!;
              return (
                <DashboardTopicAccordion
                  key={projectKey}
                  row={row}
                  qApplied={qApplied}
                  expanded={!!expandedTopics[projectKey]}
                  listVersion={listVersion}
                  sharedRecipientCount={row.sharedRecipientCount ?? 0}
                  onToggle={() =>
                    setExpandedTopics((prev) => ({
                      ...prev,
                      [projectKey]: !prev[projectKey],
                    }))
                  }
                  onRefreshProjects={refreshProjects}
                  deletingTopic={deletingTopicKey === projectKey}
                  onDeleteTopic={() => softDeleteTopicFlow(row.project)}
                  setError={setError}
                  onShareClick={() => setShareRow(row)}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function DashboardTrashPage() {
  const [items, setItems] = useState<LinkTrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listTrash();
      setItems(res.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không tải được thùng rác');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-md border border-border border-dashed px-4 py-8 text-center text-sm text-muted">
        Đang tải thùng rác…
      </div>
    );
  }

  return (
    <>
      {error ? <div className="text-sm text-danger">{error}</div> : null}
      {items.length === 0 ? (
        <div className="rounded-md border border-border border-dashed px-4 py-8 text-center text-sm text-muted">
          Thùng rác trống. Xóa chủ đề ở tab &quot;Chủ đề&quot; để chuyển link vào đây.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div
              key={it.batchId}
              className="flex flex-col gap-2 rounded-md border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-medium text-text">{it.displayLabel}</div>
                <div className="text-xs text-muted">
                  {it.linkCount} link · đã xóa {new Date(it.deletedAt).toLocaleString('vi-VN')}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 self-start sm:self-center"
                disabled={restoringId === it.batchId}
                onClick={async () => {
                  if (!window.confirm('Khôi phục toàn bộ link trong mục này?')) return;
                  setRestoringId(it.batchId);
                  setError(null);
                  try {
                    await restoreTrashBatch(it.batchId);
                    await load();
                  } catch (e: unknown) {
                    setError(e instanceof Error ? e.message : 'Không khôi phục được');
                  } finally {
                    setRestoringId(null);
                  }
                }}
              >
                Khôi phục
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function DashboardNestedRoutes({
  user,
  onLogout,
}: {
  user: MeResponse;
  onLogout: () => void | Promise<void>;
}) {
  return (
    <DashboardChrome user={user} onLogout={onLogout}>
      <Routes>
        <Route index element={<DashboardTopicsPage />} />
        <Route path="trash" element={<DashboardTrashPage />} />
      </Routes>
    </DashboardChrome>
  );
}

/** Dashboard chỉ dành cho user đã đăng nhập; anonymous không gọi API (tránh 401). */
function DashboardRouteGate({
  authReady,
  user,
  onLogout,
}: {
  authReady: boolean;
  user: MeResponse | null;
  onLogout: () => void | Promise<void>;
}) {
  if (!authReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-muted">
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <DashboardNestedRoutes user={user} onLogout={onLogout} />;
}

function App() {
  const nav = useNavigate();
  const location = useLocation();
  const center = location.pathname === '/';

  const [user, setUser] = useState<MeResponse | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authModal, setAuthModal] = useState<AuthMode | null>(null);

  const openLogin = useCallback(() => {
    if (center) setAuthModal('login');
    else nav('/login');
  }, [center, nav]);

  const openSignup = useCallback(() => {
    if (center) setAuthModal('signup');
    else nav('/register');
  }, [center, nav]);

  const refreshUser = useCallback(async () => {
    try {
      const u = await me();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const hasSession = !!user;
  const userLabel = user ? `${user.fullName || user.email}` : undefined;

  const handleLogout = useCallback(async () => {
    await logout();
    setUser(null);
    nav('/');
  }, [nav]);

  return (
    <>
      <Shell
        center={center}
        hasSession={hasSession}
        userLabel={userLabel}
        onOpenLogin={openLogin}
        onOpenSignup={openSignup}
        onLogout={hasSession ? handleLogout : undefined}
      >
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                hasSession={hasSession}
                user={user}
                onLogout={hasSession ? handleLogout : undefined}
                onOpenLogin={openLogin}
                onOpenSignup={openSignup}
              />
            }
          />
          <Route path="/login" element={<LoginPage mode="login" onSuccess={refreshUser} />} />
          <Route path="/register" element={<LoginPage mode="register" onSuccess={refreshUser} />} />
          <Route
            path="/dashboard/*"
            element={<DashboardRouteGate authReady={authReady} user={user} onLogout={handleLogout} />}
          />
        </Routes>
      </Shell>

      <AuthModal
        open={authModal !== null}
        mode={authModal ?? 'login'}
        onClose={() => setAuthModal(null)}
        onSuccess={refreshUser}
        onSwitchMode={(m) => setAuthModal(m)}
      />
    </>
  );
}

export default App;
