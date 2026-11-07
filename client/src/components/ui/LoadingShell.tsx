import { MessageCircle } from 'lucide-react';

type Variant = 'generic' | 'history' | 'admin' | 'profile' | 'video';

const surface = 'rounded-xl border border-white/10 bg-[#111b19]';
const bar = 'ux-skeleton rounded-md bg-white/[0.09]';

function Bar({ width = 'w-32', height = 'h-3' }: { width?: string; height?: string }) {
  return <div className={`${bar} ${width} ${height} max-w-full`} />;
}

function HeaderSkeleton({ title = 'w-44' }: { title?: string }) {
  return <div className="mb-5 space-y-3"><Bar width="w-24" height="h-2" /><Bar width={title} height="h-7" /><Bar width="w-72" /></div>;
}

function HistorySkeleton() {
  return <><HeaderSkeleton title="w-52" />
    <div className={`${surface} divide-y divide-white/10 overflow-hidden`}>
      {[0, 1, 2, 3, 4].map((i) => <div key={i} className="grid items-center gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(160px,.7fr)_110px] sm:px-5">
        <div className="space-y-2"><Bar width="w-40" height="h-4" /><Bar width="w-28" /></div>
        <div className="hidden space-y-2 sm:block"><Bar width="w-36" /><Bar width="w-14" /></div>
        <Bar width="w-24" height="h-8" />
      </div>)}
    </div>
  </>;
}

function AdminSkeleton() {
  return <><HeaderSkeleton title="w-48" />
    <div className={`${surface} grid divide-y divide-white/10 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4`}>
      {[0, 1, 2, 3].map(i => <div key={i} className="space-y-3 border-white/10 px-5 py-5 sm:border-r sm:last:border-r-0"><Bar width="w-24" /><Bar width="w-12" height="h-7" /><Bar width="w-28" /></div>)}
    </div>
    <div className="my-6 flex gap-2"><Bar width="w-24" height="h-9" /><Bar width="w-24" height="h-9" /><Bar width="w-24" height="h-9" /></div>
    <div className={`${surface} divide-y divide-white/10`}>
      {[0, 1, 2].map(i => <div key={i} className="flex items-center justify-between gap-4 px-5 py-5"><div className="space-y-2"><Bar width="w-40" height="h-4" /><Bar width="w-56" /></div><Bar width="w-24" height="h-8" /></div>)}
    </div>
  </>;
}

function ProfileSkeleton() {
  return <><HeaderSkeleton title="w-28" />
    <div className={`${surface} flex flex-wrap items-center gap-5 p-5`}>
      <div className={`${bar} size-20 shrink-0 rounded-2xl`} />
      <div className="flex-1 space-y-3"><Bar width="w-44" height="h-5" /><Bar width="w-56" /><Bar width="w-24" height="h-6" /></div>
      <Bar width="w-28" height="h-9" />
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">{[0, 1].map(i => <div key={i} className={`${surface} space-y-5 p-5`}><Bar width="w-40" height="h-5" />{[0,1,2].map(n=><div key={n} className="space-y-2"><Bar width="w-20" /><Bar width="w-48" height="h-5" /></div>)}</div>)}</div>
  </>;
}

function VideoSkeleton() {
  return <div className="mx-auto w-full max-w-2xl"><div className="mb-6 space-y-4"><Bar width="w-44" /><div className="grid grid-cols-4 gap-2">{[0,1,2,3].map(i=><div key={i} className={`${bar} h-1.5 w-full`} />)}</div></div>
    <div className={`${surface} space-y-5 p-5 sm:p-7`}>
      <div className="space-y-3"><Bar width="w-72" height="h-6" /><Bar width="w-60" /></div>
      <div className="grid gap-3 sm:grid-cols-2">{[0,1,2,3].map(i=><div key={i} className={`${bar} h-14 w-full rounded-lg`} />)}</div>
      <div className="flex justify-end border-t border-white/10 pt-5"><Bar width="w-32" height="h-9" /></div>
    </div>
  </div>;
}

export function LoadingShell({ label = 'Loading…', skeleton = false, variant = 'generic' }: { label?: string; skeleton?: boolean; variant?: Variant }) {
  return (
    <section role="status" aria-live="polite" aria-label={label} className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
      <span className="sr-only">{label}</span>
      {skeleton ? (
        variant === 'history' ? <HistorySkeleton /> :
        variant === 'admin' ? <AdminSkeleton /> :
        variant === 'profile' ? <ProfileSkeleton /> :
        variant === 'video' ? <VideoSkeleton /> :
        <div className="mx-auto max-w-3xl"><HeaderSkeleton /><div className={`${surface} space-y-4 p-6`}><Bar width="w-3/5" height="h-6" /><Bar width="w-full" /><Bar width="w-4/5" /><Bar width="w-32" height="h-9" /></div></div>
      ) : (
        <div className="flex min-h-24 items-center justify-center gap-3 text-sm text-white/60"><MessageCircle size={19} className="text-primary" aria-hidden="true" />{label}</div>
      )}
    </section>
  );
}
