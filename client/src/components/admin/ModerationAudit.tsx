'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { actionLabels, type ActionKind, type AdminUser, type ListResult } from './types';

interface Entry {
  id: number;
  kind: ActionKind;
  reason: string;
  createdAt: string;
  reportId: number | null;
  previousStatus: string;
  suspendedUntil: string | null;
  actor: { id: number; fullname: string };
  target: AdminUser;
}

export function ModerationAudit({ refresh }: { refresh: number }) {
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('ALL');
  const [result, setResult] = useState<ListResult<Entry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await api.get<ListResult<Entry>>('/admin/audit', {
          params: { page, ...(kind === 'ALL' ? {} : { kind }) },
          signal: controller.signal,
          silent: true,
        });
        if (active) setResult(res.data);
      } catch {
        if (active) { setResult(null); setError(true); }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [page, kind, refresh, retry]);

  return (
    <section aria-label="Moderation audit log" className="mt-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Moderation audit log</h2>
          <p className="mt-1 text-sm text-white/55">Recorded administrator actions, newest first. Internal reasons are visible to administrators only.</p>
        </div>
        <label className="text-sm font-semibold text-white/70">Filter action
          <select aria-label="Filter audit action" className="ml-0 mt-2 block min-h-11 rounded-xl border border-white/15 bg-[#101a17] px-3 text-white sm:ml-3 sm:mt-0 sm:inline-block"
            value={kind} onChange={(event) => { setPage(1); setKind(event.target.value); }}>
            <option value="ALL">All actions</option>
            {(Object.keys(actionLabels) as ActionKind[]).map((key) => <option key={key} value={key}>{actionLabels[key]}</option>)}
          </select>
        </label>
      </div>
      {loading && <p role="status" className="rounded-xl border border-white/10 p-6 text-sm text-white/50">Loading audit log…</p>}
      {!loading && error && <div role="alert" className="rounded-xl border border-red-400/30 p-5 text-sm">Could not load audit log. <button type="button" className="font-semibold text-primary underline" onClick={() => setRetry((n) => n + 1)}>Try again</button></div>}
      {!loading && result?.items.length === 0 && <p className="rounded-xl border border-white/10 p-7 text-center text-sm text-white/50">No actions match this filter.</p>}
      {!loading && result && result.items.length > 0 && <>
        <ol className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/12 bg-[#111b19]">
          {result.items.map((item) => <li key={item.id} className="grid gap-3 px-4 py-5 sm:grid-cols-[1fr_auto] sm:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/80">{actionLabels[item.kind]}</span>
                {item.reportId && <span className="text-xs text-white/50">Report #{item.reportId}</span>}
              </div>
              <p className="mt-3 break-words text-sm font-medium text-white">{item.actor.fullname} <span className="font-normal text-white/50">→</span> {item.target.fullname}</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/60">{item.reason}</p>
              {item.suspendedUntil && <p className="mt-2 text-xs text-white/50">Suspension until {new Date(item.suspendedUntil).toLocaleString()}</p>}
            </div>
            <time className="text-xs text-white/45" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
          </li>)}
        </ol>
        <nav aria-label="Audit pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/50">Page {result.page} · {result.total} actions</p>
          <div className="flex gap-2">
            <button type="button" disabled={loading || page <= 1} onClick={() => setPage((n) => n - 1)}
              className="min-h-11 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white disabled:opacity-40">Previous</button>
            <button type="button" disabled={loading || page * result.pageSize >= result.total} onClick={() => setPage((n) => n + 1)}
              className="min-h-11 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white disabled:opacity-40">Next</button>
          </div>
        </nav>
      </>}
    </section>
  );
}
