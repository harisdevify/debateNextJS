'use client';
import type { ReactNode } from 'react';
interface Props { title: string; description?: string; action?: ReactNode; status?: 'status' | 'alert' }
export function PageState({ title, description, action, status = 'status' }: Props) {
  return (
    <section role={status} className="mx-auto my-10 flex w-full max-w-lg flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-10 text-center sm:px-8">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      {description && <p className="mt-2 max-w-sm text-sm leading-6 text-white/65">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </section>
  );
}
