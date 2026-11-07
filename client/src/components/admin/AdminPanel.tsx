'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import api from '@/lib/api';
import { AppSelect } from '@/components/ui/AppSelect';
import { LoadingShell } from '@/components/ui/LoadingShell';
import { ClipboardList, ShieldCheck, UsersRound, ScrollText, Search, RefreshCw } from 'lucide-react';
import { ActionForm, type ActionBody } from './ActionForm';
import { ModerationOverview } from './ModerationOverview';
import { ModerationAudit } from './ModerationAudit';
import {
  actionLabels,
  type AdminReport,
  type AdminUser,
  type AuditAction,
  type ListResult,
  type UserDetail,
} from './types';
const button =
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:border-primary/40 hover:bg-white/[0.05] hover:text-white focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40';
const date = (value: string) => new Date(value).toLocaleString();
function History({ actions }: { actions: AuditAction[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold">Action history</h2>
      <p className="mt-1 text-sm text-muted">
        Most recent actions first. User pages show the latest 50 actions.
      </p>
      {!actions.length ? (
        <p className="mt-4 text-muted">No actions yet.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {actions.map((a) => (
            <li key={a.id} className="rounded-xl border border-border p-4">
              <p className="font-semibold">{actionLabels[a.kind]}</p>
              <p className="mt-1 text-xs text-muted">
                {a.actor.fullname} - {date(a.createdAt)}
              </p>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                {a.reason}
              </p>
              {a.suspendedUntil && (
                <p className="mt-2 text-xs text-muted">
                  Until {date(a.suspendedUntil)}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
function Status({ user }: { user: AdminUser }) {
  const status = user.effectiveStatus ?? user.status;
  return (
    <span className="rounded-full border border-border px-2.5 py-1 text-xs">
      {status === 'ACTIVE'
        ? 'Active'
        : status === 'BANNED'
          ? 'Banned'
          : 'Suspended'}
    </span>
  );
}
export function AdminPanel() {
  const [tab, setTab] = useState<'reports' | 'users' | 'audit'>('reports');
  const [filter, setFilter] = useState('OPEN');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListResult<AdminReport | AdminUser> | null>(
    null
  );
  const [detail, setDetail] = useState<
    | { type: 'reports'; data: AdminReport }
    | { type: 'users'; data: UserDetail }
    | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const requestId = useRef(0);
  useEffect(() => {
    if (detail || tab === 'audit') return;
    const controller = new AbortController();
    let active = true;
    // Defer state updates into an async request lifecycle.
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get<ListResult<AdminReport | AdminUser>>(
          `/admin/${tab}`,
          {
            params: {
              page,
              ...(tab === 'reports' ? { status: filter, search: term } : { search: term }),
            },
            signal: controller.signal,
            silent: true,
          }
        );
        if (active) setList(res.data);
      } catch {
        if (active) {
          setList(null);
          setError(
            'Could not load this page. Check your admin access and try again.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [tab, filter, term, page, refresh, detail]);
  const open = useCallback(async (type: 'reports' | 'users', id: number) => {
    const version = ++requestId.current;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      if (type === 'reports') {
        const res = await api.get<AdminReport>(`/admin/reports/${id}`, {
          silent: true,
        });
        if (version === requestId.current) setDetail({ type, data: res.data });
      } else {
        const res = await api.get<UserDetail>(`/admin/users/${id}`, {
          silent: true,
        });
        if (version === requestId.current) setDetail({ type, data: res.data });
      }
    } catch {
      if (version === requestId.current)
        setError('Could not open these details. Please refresh and try again.');
    } finally {
      if (version === requestId.current) setLoading(false);
    }
  }, []);
  const act = async (body: ActionBody) => {
    if (!detail) return false;
    const target = detail;
    try {
      await api.post(`/admin/${target.type}/${target.data.id}/action`, body);
    } catch {
      return false;
    }
    await open(target.type, target.data.id);
    setNotice('Action saved. If details could not refresh, please try again.');
    setRefresh((n) => n + 1);
    return true;
  };
  const switchTab = (next: 'reports' | 'users' | 'audit') => {
    requestId.current++;
    setTab(next);
    setSearch('');
    setTerm('');
    setPage(1);
    setDetail(null);
    setList(null);
    setError('');
    setNotice('');
  };
  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setTerm(search.trim());
  };
  const user = detail
    ? detail.type === 'reports'
      ? detail.data.reportedUser
      : detail.data
    : null;
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary"><ShieldCheck size={15} /> Moderation workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Admin dashboard</h1>
          <p className="mt-1 max-w-xl text-sm text-white/50">Review reports, manage user access and track moderation actions.</p>
        </div>
        <button type="button" className={button} disabled={loading} onClick={() => setRefresh((n) => n + 1)}><RefreshCw size={14} /> Refresh data</button>
      </header>
      <ModerationOverview refresh={refresh} />
      <nav aria-label="Admin sections" className="my-6 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#111b19] p-1 sm:w-fit">
        {([{ key: 'reports', label: 'Reports', icon: ClipboardList }, { key: 'users', label: 'Users', icon: UsersRound }, { key: 'audit', label: 'Audit log', icon: ScrollText }] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => switchTab(key)} aria-pressed={tab === key} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${tab === key ? 'bg-primary/10 text-primary' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}>
            <Icon size={15} aria-hidden="true" />{label}
          </button>
        ))}
      </nav>
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-4"
        >
          {notice}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-400/40 p-4"
        >
          <p>{error}</p>
          <button
            className={`${button} mt-3`}
            onClick={() =>
              detail
                ? void open(detail.type, detail.data.id)
                : setRefresh((n) => n + 1)
            }
          >
            Try again
          </button>
        </div>
      )}
      {loading && <LoadingShell label="Loading moderation data…" skeleton variant="admin-list" />}
      {tab === 'audit' ? <ModerationAudit refresh={refresh} /> : detail && user ? (
        <>
          <button
            className={button}
            onClick={() => {
              requestId.current++;
              setDetail(null);
              setLoading(false);
              setNotice('');
            }}
          >
            Back to {tab}
          </button>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <section className="min-w-0 rounded-xl border border-white/10 bg-[#111b19] p-4 sm:p-5">
              <h2 className="break-words text-xl font-bold">{user.fullname}</h2>
              <p className="mt-1 break-all text-sm text-muted">{user.email}</p>
              <div className="mt-3">
                <Status user={user} />
              </div>
              {user.suspendedUntil && user.effectiveStatus === 'SUSPENDED' && (
                <p className="mt-3 text-sm">
                  Suspended until {date(user.suspendedUntil)}
                </p>
              )}
              {detail.type === 'reports' && (
                <div className="mt-6 space-y-3">
                  <h3 className="font-bold">Report #{detail.data.id}</h3>
                  <p className="text-xs text-muted">Review reported information and previous actions before applying restrictions.</p>
                  <p className="text-sm">
                    Reason:{' '}
                    {detail.data.reason.replaceAll('_', ' ').toLowerCase()}
                  </p>
                  <p className="text-sm">
                    Reported by {detail.data.reporter.fullname} on{' '}
                    {date(detail.data.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap break-words rounded-xl bg-background p-4 text-sm">
                    {detail.data.details ||
                      'No additional details were provided.'}
                  </p>
                  <p className="text-sm text-muted">
                    Status:{' '}
                    {detail.data.status === 'OPEN'
                      ? 'Needs review'
                      : 'Reviewed'}
                  </p>
                  <p className="text-xs text-muted">
                    This report contains user-provided information. A recording
                    or transcript is not attached.
                  </p>
                  <button
                    className={button}
                    onClick={() => {
                      setTab('users');
                      setPage(1);
                      void open('users', user.id);
                    }}
                  >
                    View user history
                  </button>
                </div>
              )}
              <History
                actions={
                  detail.type === 'reports'
                    ? (detail.data.moderationActions ?? [])
                    : detail.data.moderationReceived
                }
              />
            </section>
            <div>
              {user.role === 'ADMIN' ? (
                <p className="rounded-xl border border-border p-5 text-muted">
                  Admin accounts are protected from account actions here.
                  {detail.type === 'reports'
                    ? ' You can dismiss this report below after reviewing it.'
                    : ''}
                </p>
              ) : null}
              {(detail.type !== 'reports' || detail.data.status === 'OPEN') &&
              user.role !== 'ADMIN' ? (
                <ActionForm
                  key={`${detail.type}-${detail.data.id}-${user.effectiveStatus}`}
                  name={user.fullname}
                  report={detail.type === 'reports'}
                  restricted={user.effectiveStatus !== 'ACTIVE'}
                  onSubmit={act}
                />
              ) : (
                <p className="mt-4 text-muted">
                  {detail.type === 'reports' &&
                  detail.data.status === 'REVIEWED'
                    ? 'This report is closed. Use the user page to manage current access.'
                    : 'Account actions are unavailable.'}
                </p>
              )}
              {detail.type === 'reports' &&
                detail.data.status === 'OPEN' &&
                user.role === 'ADMIN' && (
                  <ActionForm
                    key={detail.data.id}
                    name={user.fullname}
                    report
                    restricted={false}
                    onlyDismiss
                    onSubmit={act}
                  />
                )}
            </div>
          </div>
        </>
      ) : (
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            {tab === 'reports' && (
              <div className="min-w-[180px] text-xs font-semibold text-white/60">Show reports
                <AppSelect aria-label="Report status" value={filter} onChange={(event) => { setPage(1); setFilter(event.target.value); }}
                  className="ml-0 mt-2 block min-h-11 w-full rounded-xl border border-border bg-surface px-3 sm:ml-3 sm:mt-0 sm:inline-block sm:w-auto">
                  <option value="OPEN">Needs review</option>
                  <option value="REVIEWED">Reviewed</option>
                </AppSelect>
              </div>
            )}
            <form onSubmit={submitSearch} className="flex w-full max-w-lg flex-wrap gap-2 sm:flex-nowrap">
              <label className="min-w-[12rem] flex-1">
                <span className="sr-only">Search name or email</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)}
                  maxLength={150} placeholder={tab === 'reports' ? 'Search reporter or reported user' : 'Search name or email'}
                  className="min-h-9 w-full min-w-0 rounded-lg border border-white/15 bg-[#111b19] px-3 text-sm text-white placeholder:text-white/35 focus-visible:ring-2 focus-visible:ring-primary/30"/>
              </label>
              <button type="submit" className={button}><Search size={14} /> Search</button>
            </form>
            {term && <button type="button" className={button} onClick={() => { setSearch(''); setTerm(''); setPage(1); }}>Clear search</button>}

          </div>
          {!loading && list && list.items.length === 0 && (
            <p className="rounded-2xl border border-border p-8 text-center text-muted">
              {tab === 'reports'
                ? 'No reports in this list.'
                : 'No users found.'}
            </p>
          )}
          <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#111b19]">
            {!loading && list?.items.map((item) =>
              'reportedUser' in item ? (
                <article key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-white/[0.025] sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-sm font-semibold text-white">{item.reportedUser.fullname}</h2>
                      <span className="rounded-md border border-white/15 px-2 py-0.5 text-[10px] font-medium text-white/55">Report #{item.id}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/60">{item.reason.replaceAll('_', ' ').toLowerCase()} · Reported by {item.reporter.fullname}</p>
                    <p className="mt-1 line-clamp-1 break-words text-xs text-white/40">{item.details || 'No additional details provided.'}</p>
                    <p className="mt-1 text-[11px] text-white/35">{date(item.createdAt)}</p>
                  </div>
                  <button type="button" className={button} onClick={() => void open('reports', item.id)}>Review report</button>
                </article>
              ) : (
                <article key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-white/[0.025] sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-sm font-semibold text-white">{item.fullname}</h2>
                      <Status user={item} />
                    </div>
                    <p className="mt-1 break-all text-xs text-white/55">{item.email}</p>
                    <p className="mt-1 text-[11px] text-white/35">{item.role === 'ADMIN' ? 'Administrator' : 'Member'}</p>
                  </div>
                  <button type="button" className={button} onClick={() => void open('users', item.id)}>View user</button>
                </article>
              )
            )}
          </div>
          {list && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                Page {page} - {list.total} results
              </p>
              <div className="flex gap-2">
                <button
                  className={button}
                  disabled={loading || page <= 1}
                  onClick={() => setPage((n) => n - 1)}
                >
                  Previous
                </button>
                <button
                  className={button}
                  disabled={loading || page * list.pageSize >= list.total}
                  onClick={() => setPage((n) => n + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
