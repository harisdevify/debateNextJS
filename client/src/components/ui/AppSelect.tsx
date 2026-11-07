'use client';
import { ChevronDown } from 'lucide-react';
import { forwardRef, type ComponentProps } from 'react';

type Props = ComponentProps<'select'>;

/**
 * Shared, keyboard-accessible select with compact application styling.
 * The option popup stays native to preserve browser/device behaviour.
 */
export const AppSelect = forwardRef<HTMLSelectElement, Props>(function AppSelect(
  { className = '', children, ...props },
  ref,
) {
  return (
    <div className="relative min-w-0">
      <select
        {...props}
        ref={ref}
        className={`min-h-10 w-full appearance-none rounded-lg border border-white/15 bg-[#0f1817] py-2 pl-3 pr-9 text-sm leading-5 text-white outline-none transition-colors hover:border-white/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {children}
      </select>
      <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50" />
    </div>
  );
});
