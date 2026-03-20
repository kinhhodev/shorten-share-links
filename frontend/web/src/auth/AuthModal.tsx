import { useState } from 'react';
import type { LoginBody, RegisterBody } from '@ssl/shared';
import { login, register } from '../api/auth';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/input';

export type AuthMode = 'login' | 'signup';

export function AuthModal({
  open,
  mode,
  onClose,
  onSuccess,
  onSwitchMode,
}: {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  onSuccess: () => void;
  onSwitchMode: (m: AuthMode) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetFields() {
    setError(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
  }

  function handleClose() {
    resetFields();
    onClose();
  }

  async function onSubmitLogin() {
    setError(null);
    setLoading(true);
    try {
      const body: LoginBody = { email, password };
      await login(body);
      onSuccess();
      handleClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitSignup() {
    setError(null);
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    try {
      const body: RegisterBody = {
        fullName,
        email,
        phone,
        password,
        confirmPassword,
      };
      await register(body);
      onSuccess();
      handleClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  const title = mode === 'login' ? 'Đăng nhập' : 'Đăng ký';

  return (
    <Dialog open={open} title={title} onClose={handleClose}>
      <div className="flex flex-col gap-3">
        {mode === 'signup' ? (
          <>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted">Họ tên</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" autoComplete="name" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted">Số điện thoại</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxx" autoComplete="tel" />
            </div>
          </>
        ) : null}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@domain.com" autoComplete="email" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted">Mật khẩu</label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 8 ký tự"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>
        {mode === 'signup' ? (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted">Xác nhận mật khẩu</label>
            <Input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              type="password"
              autoComplete="new-password"
            />
          </div>
        ) : null}

        {error ? <div className="text-sm text-danger">{error}</div> : null}

        <Button
          className="w-full"
          onClick={mode === 'login' ? onSubmitLogin : onSubmitSignup}
          disabled={loading}
        >
          {loading ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </Button>

        <div className="text-center text-sm text-muted">
          {mode === 'login' ? (
            <>
              Chưa có tài khoản?{' '}
              <a className="text-brand cursor-pointer" onClick={() => onSwitchMode('signup')}>
                Đăng ký
              </a>
            </>
          ) : (
            <>
              Đã có tài khoản?{' '}
              <a className="text-brand cursor-pointer" onClick={() => onSwitchMode('login')}>
                Đăng nhập
              </a>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
