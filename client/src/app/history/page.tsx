'use client';

import api from '@/lib/api';
import { DEBATE_LANGUAGES, DEBATE_MODES, DEBATE_TOPICS } from '@/lib/debate-preferences';
import { PageState } from '@/components/ui/PageState';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, History, ShieldCheck, Star, MessageSquareText } from 'lucide-react';
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
  myFeedback: { rating: number; comment: string | null } | null;
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


function FeedbackForm({ item, onSaved }: { item: HistoryItem; onSaved: (feedback: { rating: number; comment: string | null }) => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (item.myFeedback) return (
    <div className="flex items-center gap-1 text-xs text-primary" aria-label={`You rated this debate ${item.myFeedback.rating} out of 5 stars`}>
      <Star size={14} fill="currentColor" aria-hidden="true" /> Rated {item.myFeedback.rating}/5
    </div>
  );

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/30 px-3 text-xs font-semibold text-primary hover:bg-primary/10">Rate debate</button>;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rating || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await api.post<{ rating: number; comment: string | null }>(`/debates/${item.id}/feedback`, { rating, comment: comment.trim() || undefined }, { silent: true });
      onSaved({ rating: response.data.rating, comment: response.data.comment });
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(status === 409 ? 'You already rated this debate. Refresh history to see it.' : 'Could not save your rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="w-full max-w-lg space-y-3 rounded-xl border border-white/12 bg-[#0d1714] p-4" aria-label="Rate this debate">
      <p className="text-sm font-semibold text-white">How was your debate partner?</p>
      <div className="flex gap-1" role="group" aria-label="Rating from 1 to 5 stars">
        {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star${value > 1 ? 's' : ''}`} aria-pressed={rating === value} className={`flex size-11 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-primary ${value <= rating ? 'text-primary' : 'text-white/35'} hover:text-primary`}><Star size={23} fill={value <= rating ? 'currentColor' : 'none'} aria-hidden="true" /></button>)}
      </div>
      <label htmlFor={`feedback-${item.id}`} className="block text-xs font-medium text-white/70">Optional private feedback</label>
      <textarea id={`feedback-${item.id}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} rows={3} placeholder="Share constructive feedback (optional)" className="w-full rounded-lg border border-white/20 bg-[#0b1512] px-3 py-2 text-sm text-white placeholder:text-white/35 focus-visible:outline-primary" />
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!rating || submitting} className="min-h-11 rounded-lg bg-primary px-4 text-xs font-bold text-background disabled:opacity-40">{submitting ? 'Submitting…' : 'Submit rating'}</button>
        <button type="button" disabled={submitting} onClick={() => { setOpen(false); setError(''); }} className="min-h-11 rounded-lg border border-white/20 px-4 text-xs text-white/70">Cancel</button>
      </div>
    </form>
  );
}

export default function DebateHistoryPage() {
  const { user, loading: checkingSession, verificationError, retrySession } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const handleFeedbackSaved = (debateId: string, feedback: { rating: number; comment: string | null }) => {
    setData((previous) => previous ? { ...previous, items: previous.items.map((item) => item.id === debateId ? { ...item, myFeedback: feedback } : item) } : previous);
  };

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
    <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <Link href="/profile" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-white/55 transition-colors hover:text-primary">
        <ArrowLeft size={16} aria-hidden="true" /> Back to profile
      </Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-primary"><History size={15} aria-hidden="true" /> Personal activity</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Debate history</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-white/55">Review your past sessions and leave feedback for your debate partners.</p>
        </div>
        <Link href="/video" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-background transition-colors hover:bg-primary-hover">
          Start a debate <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#111b19] px-3 py-3 text-xs leading-5 text-white/55 sm:px-4">
        <ShieldCheck size={17} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <p>Only your ended sessions appear here. No recordings, chat messages or partner profiles are stored in debate history. “Completed” means the formal timer finished.</p>
      </div>

      {fetching && <div role="status" className="mt-6 rounded-xl border border-white/10 bg-[#111b19] px-5 py-10 text-center text-sm text-white/55">Loading debate activity…</div>}
      {!fetching && error && <PageState status="alert" title="Could not load your history" description="Your debates have not been changed. Try again when your connection is available." action={<button type="button" onClick={() => setRetry((n) => n + 1)} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-background">Try again</button>} />}
      {!fetching && !error && data?.items.length === 0 && <PageState title="No past debates yet" description="After your first conversation ends, its topic, mode and duration will appear here." action={<Link href="/video" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-background">Find a debate partner</Link>} />}

      {!fetching && !error && !!data?.items.length && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold tabular-nums text-white">{data.total}</span>
              <span className="text-sm text-white/55">{data.total === 1 ? 'conversation' : 'conversations'}</span>
            </div>
            <span className="text-xs text-white/45">Page {data.page} of {data.totalPages}</span>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-white/12 bg-[#111b19]">
            <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-4 border-b border-white/10 bg-white/[0.025] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40 md:grid">
              <span>Conversation</span>
              <span>Date & duration</span>
            </div>
            <div className="divide-y divide-white/10">
              {data.items.map((item) => (
                <article key={item.id} className="grid min-w-0 gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(160px,0.7fr)] md:items-start md:gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-white">{topicName(item.topic)}</h2>
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${item.endReason === 'COMPLETED' ? 'border-primary/25 bg-primary/10 text-primary' : 'border-white/15 bg-white/5 text-white/55'}`}>
                        {item.endReason === 'COMPLETED' ? 'Completed' : 'Ended'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-white/50">{languageName(item.language)} · {modeName(item.mode)}</p>
                  </div>

                  <div className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-xs text-white/60 md:flex-col md:gap-y-2">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={14} className="shrink-0 text-white/40" aria-hidden="true" />
                      <time dateTime={item.endedAt}>{new Date(item.endedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
                    </span>
                    <span className="inline-flex items-center gap-2"><Clock3 size={14} className="shrink-0 text-white/40" aria-hidden="true" />{duration(item.durationSeconds)}</span>
                  </div>

                  <div className="min-w-0 border-t border-white/10 pt-3 md:col-span-2">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-white/45"><MessageSquareText size={14} aria-hidden="true" /> Your feedback</span>
                      <div className="min-w-0 flex-1 sm:flex sm:justify-end">
                        <FeedbackForm item={item} onSaved={(feedback) => handleFeedbackSaved(item.id, feedback)} />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <nav aria-label="History pagination" className="mt-5 flex items-center justify-between gap-3">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="min-h-10 rounded-lg border border-white/15 px-4 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35">
              Previous
            </button>
            <span className="text-xs tabular-nums text-white/45">{data.page} / {data.totalPages}</span>
            <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((current) => current + 1)} className="min-h-10 rounded-lg border border-white/15 px-4 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35">
              Next
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
