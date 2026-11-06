'use client';
import type { ReactNode } from 'react';
interface Props { name: string; value: string; checked: boolean; onChange: () => void; title: string; description?: ReactNode }
export function ChoiceOption({ name, value, checked, onChange, title, description }: Props) {
  return (
    <label className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary/40 ${checked ? 'border-primary/70 bg-primary/10 text-white' : 'border-white/15 bg-white/[0.03] text-white/75 hover:border-white/35'}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-0.5 size-4 shrink-0 accent-primary" />
      <span className="min-w-0"><span className="block font-medium">{title}</span>{description && <span className="mt-1 block text-xs leading-5 text-white/60">{description}</span>}</span>
    </label>
  );
}
