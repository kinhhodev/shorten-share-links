import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import type { LinkProjectSummary, MeResponse } from '@ssl/shared';
import { DASHBOARD_PROJECT_NONE_QUERY } from '@ssl/shared';
import { logout, me } from './api/auth';
import { deleteLink, listLinkProjects, listLinks } from './api/dashboard';
import { createLink } from './api/links';
import { AuthModal, type AuthMode } from './auth/AuthModal';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { UserAccountMenu } from './ui/user-account-menu';
import { IconCopy, IconTrash } from './ui/icons';
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
      const res = await createLink({
        longUrl: permalink,
        project: projectName.trim() || undefined,
        customAlias: alias.trim() || undefined,
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
                        <Button type="button" variant="primary" className="w-full sm:w-auto" onClick={onOpenLogin}>
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

type ProjectScope = 'all' | 'none' | string;

function parseProjectScope(param: string | null): ProjectScope {
  if (param === null || param === '') return 'all';
  if (param === DASHBOARD_PROJECT_NONE_QUERY) return 'none';
  return param;
}

function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = parseProjectScope(searchParams.get('project'));

  const [projectSummaries, setProjectSummaries] = useState<LinkProjectSummary[]>([]);
  const [items, setItems] = useState<
    {
      id: string;
      project: string | null;
      code: string;
      longUrl: string;
    }[]
  >([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [qApplied, setQApplied] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 20;

  function setScope(next: ProjectScope) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === 'all') p.delete('project');
        else if (next === 'none') p.set('project', DASHBOARD_PROJECT_NONE_QUERY);
        else p.set('project', next);
        return p;
      },
      { replace: true },
    );
    setPage(1);
  }

  async function refreshProjects() {
    setLoadingProjects(true);
    try {
      const res = await listLinkProjects();
      setProjectSummaries(res.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách chủ đề');
    } finally {
      setLoadingProjects(false);
    }
  }

  async function refreshLinks() {
    setLoadingLinks(true);
    setError(null);
    try {
      const projectParam =
        scope === 'all' ? undefined : scope === 'none' ? DASHBOARD_PROJECT_NONE_QUERY : scope;
      const res = await listLinks({
        page,
        pageSize,
        q: qApplied || undefined,
        project: projectParam,
      });
      setItems(res.items);
      setTotal(res.total);
      if (res.items.length === 0 && res.total > 0 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setLoadingLinks(false);
    }
  }

  useEffect(() => {
    refreshProjects();
  }, []);

  useEffect(() => {
    refreshLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scope/page/qApplied drive list
  }, [scope, page, qApplied]);

  const totalAllLinks = useMemo(
    () => projectSummaries.reduce((s, it) => s + it.total, 0),
    [projectSummaries],
  );

  const createLinkHref =
    scope === 'all'
      ? '/'
      : scope === 'none'
        ? `/?project=${DASHBOARD_PROJECT_NONE_QUERY}`
        : `/?project=${encodeURIComponent(scope)}`;

  const emptyMessage =
    totalAllLinks === 0
      ? 'Chưa có link nào. Tạo link từ trang chủ hoặc bấm “Tạo link nhanh”.'
      : scope === 'all'
        ? 'Không có link nào khớp bộ lọc.'
        : 'Không có link trong chủ đề này (hoặc không khớp tìm kiếm).';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex gap-4 items-center text-2xl font-semibold text-text">
              Dashboard
              <Link to={createLinkHref}>
                <Button size="sm" variant="primary" className="sm:w-auto shrink-0 border-none">
                  Tạo link nhanh
                </Button>
              </Link>
            </h1>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <div className="text-sm text-danger">{error}</div> : null}

        <div className="flex flex-col gap-4 lg:flex-row">
          <aside className="lg:w-56 shrink-0 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wide text-muted">Chủ đề</div>

            <div className="lg:hidden">
              <select
                className="h-12 w-full rounded-md border border-border bg-bg py-2 pl-3 text-sm text-text"
                value={scope === 'all' ? '' : scope === 'none' ? DASHBOARD_PROJECT_NONE_QUERY : scope}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') setScope('all');
                  else if (v === DASHBOARD_PROJECT_NONE_QUERY) setScope('none');
                  else setScope(v);
                }}
              >
                <option value="">Tất cả ({totalAllLinks})</option>
                {projectSummaries.map((row) => (
                  <option
                    key={row.project === null ? '__null__' : row.project}
                    value={row.project === null ? DASHBOARD_PROJECT_NONE_QUERY : row.project!}
                  >
                    {row.project === null ? 'Không chủ đề' : row.project} ({row.total})
                  </option>
                ))}
              </select>
            </div>
            <nav className="hidden lg:flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`rounded-md px-3 py-2 text-left text-sm ${
                  scope === 'all' ? 'bg-brand/15 text-text font-medium' : 'text-muted hover:bg-bg'
                }`}
              >
                Tất cả
                <span className="ml-1 text-xs opacity-80">({totalAllLinks})</span>
              </button>
              {loadingProjects ? (
                <div className="px-3 py-2 text-xs text-muted">Đang tải chủ đề…</div>
              ) : (
                projectSummaries.map((row) => {
                  const key = row.project === null ? 'none' : row.project;
                  const active =
                    (row.project === null && scope === 'none') ||
                    (row.project !== null && scope === row.project);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setScope(row.project === null ? 'none' : row.project!)}
                      className={`rounded-md px-3 py-2 text-left text-sm ${
                        active ? 'bg-brand/15 text-text font-medium' : 'text-muted hover:bg-bg'
                      }`}
                    >
                      {row.project === null ? 'Không chủ đề' : row.project}
                      <span className="ml-1 text-xs opacity-80">({row.total})</span>
                    </button>
                  );
                })
              )}
            </nav>
          </aside>

          <div className="min-w-0 flex-1 space-y-3">
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
                        setPage(1);
                      }
                    }}
                    placeholder="Link hoặc mã code sau đó nhấn Enter"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {loadingLinks ? (
              <div className="rounded-md border border-border border-dashed px-4 py-8 text-center text-sm text-muted">
                Đang tải danh sách link…
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-bg text-muted">
                      <tr>
                        <th className="p-3">Chủ đề</th>
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
                            <td className="p-3 align-middle">
                              {it.project === null ? (
                                <span className="text-muted">Không chủ đề</span>
                              ) : (
                                <span className="font-medium text-text">{it.project}</span>
                              )}
                            </td>
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
                                      await refreshProjects();
                                      await refreshLinks();
                                    } catch (e: unknown) {
                                      setError(
                                        e instanceof Error ? e.message : 'Không xóa được link',
                                      );
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
                          <td className="p-3 text-muted" colSpan={4}>
                            {emptyMessage}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {total > pageSize ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                    <span>
                      Trang {page} / {Math.max(1, Math.ceil(total / pageSize))} — {total} link
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
                        disabled={page >= Math.ceil(total / pageSize)}
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
        </div>
      </CardContent>
    </Card>
  );
}

function App() {
  const nav = useNavigate();
  const location = useLocation();
  const center = location.pathname === '/';

  const [user, setUser] = useState<MeResponse | null>(null);
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
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const hasSession = !!user;
  const userLabel = user ? `${user.fullName || user.email}` : undefined;

  return (
    <>
      <Shell
        center={center}
        hasSession={hasSession}
        userLabel={userLabel}
        onOpenLogin={openLogin}
        onOpenSignup={openSignup}
        onLogout={
          hasSession
            ? async () => {
                await logout();
                setUser(null);
                nav('/');
              }
            : undefined
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                hasSession={hasSession}
                user={user}
                onLogout={
                  hasSession
                    ? async () => {
                        await logout();
                        setUser(null);
                        nav('/');
                      }
                    : undefined
                }
                onOpenLogin={openLogin}
                onOpenSignup={openSignup}
              />
            }
          />
          <Route path="/login" element={<LoginPage mode="login" onSuccess={refreshUser} />} />
          <Route path="/register" element={<LoginPage mode="register" onSuccess={refreshUser} />} />
          <Route path="/dashboard" element={<DashboardPage />} />
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
