'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

interface Summary {
  pendingReports: number;
  reviewedReports: number;
  suspendedUsers: number;
  bannedUsers: number;
  recentActions: number;
}

export function ModerationOverview({ refresh }: { refresh: number }) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void api.get<Summary>('/admin/overview', { signal: controller.signal, silent: true })
      .then((res) => { if (active) { setData(res.data); setError(false); } })
      .catch(() => { if (active) { setData(null); setError(true); } });
    return () => { active = false; controller.abort(); };
  }, [refresh, attempt]);

  const stats = data ? [
    { name: 'Needs review', value: data.pendingReports, description: 'Open reports' },
    { name: 'Reviewed', value: data.reviewedReports, description: 'Reviewed reports' },
    { name: 'Restricted', value: data.suspendedUsers + data.bannedUsers, description: `${data.suspendedUsers} suspended · ${data.bannedUsers} banned` },
    { name: 'Recent actions', value: data.recentActions, description: 'Last 7 days' },
  ] : [];
  return (
    <section aria-label="Moderation overview" className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">Moderation overview</h2>
        <button type="button" className="min-h-10 rounded-lg px-3 text-xs font-semibold text-primary hover:bg-primary/10" onClick={reload}>Refresh overview</button>
      </div>
      {error ? <div role="alert" className="rounded-xl border border-red-400/30 p-4 text-sm">Overview unavailable. <button type="button" className="ml-2 font-semibold text-primary underline" onClick={reload}>Retry</button></div>
        : !data ? <p role="status" className="rounded-xl border border-white/10 px-4 py-6 text-sm text-white/50">Loading overview…</p>
        : <div className="grid overflow-hidden rounded-xl border border-white/10 bg-[#111b19] sm:grid-cols-2 xl:grid-cols-4">{stats.map((item) => (
          <div key={item.name} className="min-w-0 border-b border-white/10 px-4 py-4 last:border-b-0 sm:px-5 sm:py-5 xl:border-b-0 xl:border-r xl:border-white/10 xl:last:border-r-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{item.name}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{item.value.toLocaleString()}</p>
            <p className="mt-1 text-xs text-white/50">{item.description}</p>
          </div>
        ))}</div>}
    </section>
  );
}
