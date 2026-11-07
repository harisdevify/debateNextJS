'use client';
import { useId, type ComponentProps, type ElementType } from 'react';

type Props = Omit<ComponentProps<'input'>, 'id'> & {
  id?: string;
  label: string;
  icon?: ElementType;
  trailing?: React.ReactNode;
};
export function TextField({ id, label, icon: Icon, trailing, className = '', ...inputProps }: Props) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div className="min-w-0">
      <label htmlFor={fieldId} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">{label}</label>
      <div className="relative">
        {Icon && <Icon aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />}
        <input {...inputProps} id={fieldId} className={`w-full min-h-10 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 ${Icon ? 'pl-10' : ''} ${trailing ? 'pr-11' : ''} ${className}`} />
        {trailing}
      </div>
    </div>
  );
}
