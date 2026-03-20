import { useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { cn } from '../lib/cn';

export function UserAccountMenu({
  displayName,
  onLogout,
  className,
}: {
  displayName: string;
  onLogout: () => void | Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative h-fit', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-expanded={open}
          aria-haspopup="menu"
          className="min-w-[9rem] justify-between gap-1"
          onClick={() => setOpen((v) => !v)}
        >
          {displayName}
          <span className="text-muted" aria-hidden>
            {open ? '▴' : '▾'}
          </span>
        </Button>
      </div>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-1 min-w-[11rem] rounded-md border border-border bg-surface py-1 shadow-card"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-left text-sm text-text hover:bg-blue-300 cursor-pointer border-none bg-transparent"
            onClick={() => {
              setOpen(false);
              void onLogout();
            }}
          >
            Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  );
}
