import { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { login, logout, me, register } from './api/auth';
import { listLinks, updateLink } from './api/dashboard';
import { createLink } from './api/links';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';

function Shell({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex flex-col">
            <div className="text-sm font-semibold text-brand">Shorten & Share Links</div>
            <div className="text-sm text-muted">Fast redirects with cache-first lookup</div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button variant="secondary" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="sm">
                Login
              </Button>
            </Link>
            {onLogout ? (
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Logout
              </Button>
            ) : null}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function HomePage() {
  const [longUrl, setLongUrl] = useState('');
  const [project, setProject] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);

  const canSubmit = useMemo(() => longUrl.trim().length > 0 && !loading, [longUrl, loading]);

  async function onSubmit() {
    setError(null);
    setShortUrl(null);
    setLoading(true);
    try {
      const res = await createLink({
        longUrl,
        project: project.trim() || undefined,
        customAlias: customAlias.trim() || undefined,
      });
      setShortUrl(res.shortUrl);
    } catch (e: any) {
      setError(e?.message ?? 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl font-semibold text-text">Rút gọn link</h1>
        <p className="mt-1 text-sm text-muted">Dán link dài, nhận link ngắn để chia sẻ.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={longUrl}
          onChange={(e) => setLongUrl(e.target.value)}
          placeholder="https://example.com/very/long/url"
        />
        {showOptions ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted">Project (namespace)</div>
              <Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="du-an-1" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted">Custom alias (optional)</div>
              <Input
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                placeholder="my-campaign"
              />
            </div>
          </div>
        ) : null}
        <div className="flex gap-3">
          <Button className="flex-1" disabled={!canSubmit} onClick={onSubmit}>
            {loading ? 'Đang tạo...' : 'Tạo link'}
          </Button>
          <Button variant="secondary" onClick={() => setShowOptions((v) => !v)}>
            Tuỳ chọn
          </Button>
        </div>
        {error ? <div className="text-sm text-danger">{error}</div> : null}
        {shortUrl ? (
          <div className="rounded-md border border-border bg-bg p-3">
            <div className="text-xs font-medium text-muted">Link ngắn</div>
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
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LoginPage({ mode }: { mode: 'login' | 'register' }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') await login({ email, password });
      else await register({ email, password });
      nav('/dashboard');
    } catch (e: any) {
      setError(e?.message ?? 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl font-semibold text-text">{mode === 'login' ? 'Login' : 'Register'}</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === 'login' ? 'Đăng nhập để xem dashboard.' : 'Tạo tài khoản để quản lý link.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@domain.com" />
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password (min 8)"
          type="password"
        />
        <Button className="w-full" onClick={onSubmit} disabled={loading}>
          {loading ? 'Đang xử lý...' : mode === 'login' ? 'Login' : 'Register'}
        </Button>
        {error ? <div className="text-sm text-danger">{error}</div> : null}
        <div className="text-sm text-muted">
          {mode === 'login' ? (
            <>
              Chưa có tài khoản? <Link className="text-brand underline" to="/register">Register</Link>
            </>
          ) : (
            <>
              Đã có tài khoản? <Link className="text-brand underline" to="/login">Login</Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await listLinks({ page: 1, pageSize: 50 });
      setItems(res.items);
    } catch (e: any) {
      setError(e?.message ?? 'Có lỗi xảy ra');
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
                    <td className="p-3 font-mono">
                      {it.project ? `${it.project}/${it.code}` : it.code}
                    </td>
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
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    me()
      .then(() => setHasSession(true))
      .catch(() => setHasSession(false));
  }, []);

  return (
    <Shell
      onLogout={
        hasSession
          ? async () => {
              await logout();
              setHasSession(false);
              nav('/');
            }
          : undefined
      }
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage mode="login" />} />
        <Route path="/register" element={<LoginPage mode="register" />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Shell>
  );
}

export default App
