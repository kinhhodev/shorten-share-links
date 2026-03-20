import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { MeResponse } from '@ssl/shared';
import { logout, me } from './api/auth';
import { listLinks, updateLink } from './api/dashboard';
import { createLink } from './api/links';
import { AuthModal, type AuthMode } from './auth/AuthModal';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { UserAccountMenu } from './ui/user-account-menu';

function Shell({
  children,
  onLogout,
  center,
  hasSession,
  userLabel,
  onOpenLogin,
  onOpenSignup,
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
        {!center ? (
          <header className="flex items-center justify-between gap-3 py-2">
            <Link to="/" className="flex flex-col min-w-0">
              <div className="text-sm font-semibold text-brand truncate">Shorten & Share Links</div>
              <div className="text-sm text-muted truncate">Fast redirects with cache-first lookup</div>
            </Link>
            <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
              {hasSession && userLabel ? (
                <span className="hidden text-xs text-muted sm:inline max-w-[140px] truncate" title={userLabel}>
                  {userLabel}
                </span>
              ) : null}
              <Link to="/dashboard">
                <Button variant="secondary" size="sm">
                  Dashboard
                </Button>
              </Link>
              {!hasSession ? (
                <>
                  <Button variant="secondary" size="sm" onClick={onOpenLogin}>
                    Đăng nhập
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onOpenSignup}>
                    Đăng ký
                  </Button>
                </>
              ) : null}
              {onLogout ? (
                <Button variant="ghost" size="sm" onClick={onLogout}>
                  Logout
                </Button>
              ) : null}
            </div>
          </header>
        ) : null}

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
  const [projectName, setProjectName] = useState('');
  const [alias, setAlias] = useState('');
  const [permalink, setPermalink] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [ownerHint, setOwnerHint] = useState<string | null>(null);

  const canSubmit = useMemo(() => permalink.trim().length > 0 && !loading, [permalink, loading]);

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
      if (res.anonymousMarker === -1 || res.ownerUserId === -1) {
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

              <p className="mt-2 text-xs text-muted">
                {hasSession
                  ? 'Bạn đang đăng nhập — link tạo ra sẽ hiển thị trong Dashboard.'
                  : 'Chưa đăng nhập — link được lưu ẩn danh (user_id = -1), không xem được trong Dashboard.'}
              </p>

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
                    placeholder="https://example.com/..."
                    autoComplete="off"
                  />
                </div>

                <div className="w-full flex flex-col gap-2">
                  <Button type="submit" disabled={!canSubmit} className="w-full mt-3">
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

function DashboardPage() {
  const [items, setItems] = useState<
    {
      id: string;
      project: string | null;
      code: string;
      longUrl: string;
      isActive: boolean;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await listLinks({ page: 1, pageSize: 50 });
      setItems(res.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl font-semibold text-text">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Danh sách link bạn đã tạo (chỉ link có login).</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <div className="text-sm text-danger">{error}</div> : null}
        {loading ? (
          <div className="text-sm text-muted">Loading...</div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-bg text-muted">
                <tr>
                  <th className="p-3">Short</th>
                  <th className="p-3">Long URL</th>
                  <th className="p-3">Active</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-border">
                    <td className="p-3 font-mono">{it.project ? `${it.project}/${it.code}` : it.code}</td>
                    <td className="p-3 max-w-[520px] truncate">{it.longUrl}</td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant={it.isActive ? 'secondary' : 'danger'}
                        onClick={async () => {
                          await updateLink(it.id, { isActive: !it.isActive });
                          await refresh();
                        }}
                      >
                        {it.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td className="p-3 text-muted" colSpan={3}>
                      No links yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
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
