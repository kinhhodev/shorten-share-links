import { useEffect } from 'react';

export function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
      <button
        type="button"
        className="absolute inset-0 bg-text/20 backdrop-blur-[2px]"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="relative z-10 w-[50%] max-w-md rounded-lg border border-border bg-surface p-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <h2 id="auth-dialog-title" className="text-lg font-semibold text-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-bg hover:text-text border-none cursor-pointer bg:transparent"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
