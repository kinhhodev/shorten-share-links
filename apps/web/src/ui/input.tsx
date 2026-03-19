import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type Props = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40',
        className,
      )}
      {...props}
    />
  );
}

