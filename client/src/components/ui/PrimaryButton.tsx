'use client';
import { type ComponentProps } from 'react';

type Props = ComponentProps<'button'> & { busy?: boolean; busyLabel?: string };
export function PrimaryButton({ busy = false, busyLabel = 'Please wait…', children, className = '', disabled, ...rest }: Props) {
  return (
    <button {...rest} aria-busy={busy} disabled={disabled || busy} className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-background transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
      {busy ? <><span className="size-4 animate-spin rounded-full border-2 border-background/30 border-t-background" aria-hidden="true" />{busyLabel}</> : children}
    </button>
  );
}
