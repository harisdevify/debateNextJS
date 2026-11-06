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
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">{label}</label>
      <div className="relative">
        {Icon && <Icon aria-hidden="true" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />}
        <input {...inputProps} id={fieldId} className={`w-full min-h-12 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-white placeholder:text-white/35 outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 ${Icon ? 'pl-11' : ''} ${trailing ? 'pr-12' : ''} ${className}`} />
        {trailing}
      </div>
    </div>
  );
}
