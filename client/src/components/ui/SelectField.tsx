'use client';
import { useId, type ComponentProps } from 'react';

type Props = Omit<ComponentProps<'select'>, 'id'> & { id?: string; label: string; description?: string };
export function SelectField({ id, label, description, children, className = '', ...props }: Props) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div className="min-w-0">
      <label htmlFor={fieldId} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/65">{label}</label>
      <select {...props} id={fieldId} className={`min-h-12 w-full rounded-xl border border-white/15 bg-[#0f1817] px-4 py-3 text-sm text-white outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</select>
      {description && <p className="mt-1.5 text-xs text-white/50">{description}</p>}
    </div>
  );
}
