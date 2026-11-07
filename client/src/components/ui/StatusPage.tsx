import Link from 'next/link';
import { ArrowLeft, Home, type LucideIcon } from 'lucide-react';

export function StatusPage({ eyebrow, title, description, icon: Icon, action, href = '/' }: { eyebrow: string; title: string; description: string; icon: LucideIcon; action?: React.ReactNode; href?: string }) {
  return (
    <main className="mx-auto flex min-h-[65dvh] w-full max-w-xl flex-col items-center justify-center px-4 py-14 text-center">
      <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.07] text-primary"><Icon size={26} strokeWidth={1.7} aria-hidden="true" /></div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-white/55">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {action}
        <Link href={href} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"><Home size={15} /> Back to home</Link>
      </div>
    </main>
  );
}
