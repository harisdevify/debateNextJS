import { MessageCircle } from 'lucide-react';

/** A restrained, reduced-motion friendly brand loader used during route transitions. */
export function LoadingShell({ label = 'Loading your space…', skeleton = false }: { label?: string; skeleton?: boolean }) {
  return (
    <section role="status" aria-live="polite" className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
        <div className="relative flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/[0.07] text-primary">
          <MessageCircle size={22} strokeWidth={1.8} aria-hidden="true" />
          <span className="absolute -bottom-1 -right-1 size-3 animate-pulse rounded-full border-[3px] border-[#070b0a] bg-primary motion-reduce:animate-none" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-white/70">{label}</p>
      </div>
      {skeleton && <div aria-hidden="true" className="space-y-3">
        <div className="h-7 w-48 animate-pulse rounded-md bg-white/[0.07] motion-reduce:animate-none" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-white/[0.05] motion-reduce:animate-none" />
        <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#111b19]">
          {[0, 1, 2].map((index) => <div key={index} className="flex items-center justify-between gap-6 px-5 py-5">
            <div className="w-2/3 space-y-3"><div className="h-4 w-48 max-w-full animate-pulse rounded bg-white/[0.07] motion-reduce:animate-none" /><div className="h-3 w-36 max-w-full animate-pulse rounded bg-white/[0.05] motion-reduce:animate-none" /></div>
            <div className="h-8 w-24 animate-pulse rounded-lg bg-white/[0.05] motion-reduce:animate-none" />
          </div>)}
        </div>
      </div>}
    </section>
  );
}
