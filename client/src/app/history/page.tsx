'use client';

import api from '@/lib/api';
import { DEBATE_LANGUAGES, DEBATE_MODES, DEBATE_TOPICS } from '@/lib/debate-preferences';
import { PageState } from '@/components/ui/PageState';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, History, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export interface HistoryItem {
  id: string;
  topic: string;
  language: string;
  mode: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  endReason: 'COMPLETED' | 'ENDED';
}

interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const topicName = (value: string) => DEBATE_TOPICS.find((item) => item.value === value)?.label ?? value;
const modeName = (value: string) => DEBATE_MODES.find((item) => item.value === value)?.label ?? value;
const languageName = (value: string) => DEBATE_LANGUAGES.find((item) => item.value === value)?.label ?? value;

function duration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m${seconds % 60 ? ` ${seconds % 60}s` : ''}`;
}

export default function DebateHistoryPage() {
  const { user, loading: checkingSession, verificationError, retrySession } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!user) return;
    let current = true;
    const load = async () => {
      setFetching(true);
      setError(false);
      try {
        const response = await api.get<HistoryResponse>('/debates/history', {
          params: { page },
          silent: true,
        });
        if (current) setData(response.data);
      } catch {
        if (current) { setError(true); setData(null); }
      } finally {
        if (current) setFetching(false);
      }
    };
    void load();
    return () => { current = false; };
  }, [user?.id, page, retry]); // eslint-disable-line react-hooks/exhaustive-deps

  if (checkingSession) return <PageState title="Checking your session…" />;
  if (verificationError) return <PageState status="alert" title="Could not verify your session" description="Check your connection and try again." action={<button type="button" onClick={() => void retrySession()} className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-background">Retry</button>} />;
  if (!user) return <PageState title="Sign in to see your debate history" description="Only your own completed or ended sessions are available." action={<Link href="/login" className="min-h-11 rounded-lg bg-primary px-5 py-3 font-semibold text-background">Login</Link>} />;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <Link href="/profile" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white/60 hover:text-primary"><ArrowLeft size={16} /> Back to profile</Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><History size={16} /> Personal activity</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Your debate history</h1>
          <p className="mt-3 max-w-lg text-sm leading-7 text-white/60">A private record of your past conversations. No calls, recordings, chat messages or partner profiles are saved here.</p>
        </div>
        <Link href="/video" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-background hover:bg-primary-hover">Start a debate <ArrowRight size={17} /></Link>
      </div>

      <div className="mt-8 rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-3 text-sm text-white/65">
        <div className="flex items-center gap-2"><ShieldCheck size={17} className="text-primary" /> Only sessions that have ended are listed. “Completed” means the formal timer finished.</div>
      </div>

      {fetching && <div role="status" className="mt-8 rounded-2xl border border-white/10 px-6 py-12 text-center text-sm text-white/55">Loading debate activity…</div>}
      {!fetching && error && <PageState status="alert" title="Could not load your history" description="Your debates have not been changed. Try again when your connection is available." action={<button type="button" onClick={() => setRetry((n) => n + 1)} className="min-h-11 rounded-xl bg-primary px-5 font-semibold text-background">Try again</button>} />}
      {!fetching && !error && data?.items.length === 0 && <PageState title="No past debates yet" description="After your first conversation ends, its topic, mode and duration will appear here." action={<Link href="/video" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-bold text-background">Find a debate partner</Link>} />}

      {!fetching && !error && !!data?.items.length && (
        <>
          <div className="mt-8 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">{data.total} ended {data.total === 1 ? 'session' : 'sessions'}</p>
            <p className="text-xs text-white/45">Page {data.page} of {data.totalPages}</p>
          </div>
          <div className="mt-3 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/12 bg-[#111b19]">
            {data.items.map((item) => (
              <article key={item.id} className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-semibold text-white">{topicName(item.topic)}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.endReason === 'COMPLETED' ? 'border-primary/25 bg-primary/10 text-primary' : 'border-white/15 bg-white/5 text-white/60'}`}>{item.endReason === 'COMPLETED' ? 'Completed' : 'Ended'}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/55">{languageName(item.language)} · {modeName(item.mode)}</p>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/55 sm:justify-end">
                  <span className="inline-flex items-center gap-2"><CalendarDays size={15} aria-hidden="true" /><time dateTime={item.endedAt}>{new Date(item.endedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></span>
                  <span className="inline-flex items-center gap-2"><Clock3 size={15} aria-hidden="true" />{duration(item.durationSeconds)}</span>
                </div>
              </article>
            ))}
          </div>
          <nav aria-label="History pagination" className="mt-6 flex items-center justify-between gap-3">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="min-h-11 rounded-xl border border-white/20 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35">Previous</button>
            <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((current) => current + 1)} className="min-h-11 rounded-xl border border-white/20 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35">Next</button>
          </nav>
        </>
      )}
    </main>
  );
}
