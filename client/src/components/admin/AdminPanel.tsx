'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import api from '@/lib/api';
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
  'min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40';
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
      <header>
        <p className="text-sm font-semibold text-primary">Admin workspace</p>
        <h1 className="mt-2 text-3xl font-bold">Keep debates respectful</h1>
        <p className="mt-3 text-muted">
          Review incoming reports, make accountable decisions and inspect moderation actions.
        </p>
      </header>
      <ModerationOverview refresh={refresh} />
      <nav aria-label="Admin sections" className="my-6 flex flex-wrap gap-3">
        <button
          className={button}
          aria-pressed={tab === 'reports'}
          onClick={() => switchTab('reports')}
        >
          Reports
        </button>
        <button
          className={button}
          aria-pressed={tab === 'users'}
          onClick={() => switchTab('users')}
        >
          Users
        </button>
        <button type="button" className={button} aria-pressed={tab === 'audit'} onClick={() => switchTab('audit')}>Audit log</button>
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
      {loading && (
        <p role="status" className="my-4 text-muted">
          Loading...
        </p>
      )}
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
          <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <section className="min-w-0 rounded-2xl border border-border bg-surface p-5">
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
              <label className="text-sm">Show reports
                <select value={filter} onChange={(event) => { setPage(1); setFilter(event.target.value); }}
                  className="ml-0 mt-2 block min-h-11 w-full rounded-xl border border-border bg-surface px-3 sm:ml-3 sm:mt-0 sm:inline-block sm:w-auto">
                  <option value="OPEN">Needs review</option>
                  <option value="REVIEWED">Reviewed</option>
                </select>
              </label>
            )}
            <form onSubmit={submitSearch} className="flex w-full max-w-lg flex-wrap gap-2 sm:flex-nowrap">
              <label className="min-w-[12rem] flex-1">
                <span className="sr-only">Search name or email</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)}
                  maxLength={150} placeholder={tab === 'reports' ? 'Search reporter or reported user' : 'Search name or email'}
                  className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-3 focus-visible:ring-2 focus-visible:ring-primary/30"/>
              </label>
              <button type="submit" className={button}>Search</button>
            </form>
            {term && <button type="button" className={button} onClick={() => { setSearch(''); setTerm(''); setPage(1); }}>Clear search</button>}
            <button
              className={button}
              onClick={() => setRefresh((n) => n + 1)}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          {!loading && list && list.items.length === 0 && (
            <p className="rounded-2xl border border-border p-8 text-center text-muted">
              {tab === 'reports'
                ? 'No reports in this list.'
                : 'No users found.'}
            </p>
          )}
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            {!loading &&
              list?.items.map((item) =>
                'reportedUser' in item ? (
                  <article
                    key={item.id}
                    className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5"
                  >
                    <p className="text-xs text-muted">
                      Report #{item.id} - {date(item.createdAt)}
                    </p>
                    <h2 className="mt-2 break-words font-bold">
                      {item.reportedUser.fullname}
                    </h2>
                    <p className="mt-2 text-sm">
                      {item.reason.replaceAll('_', ' ').toLowerCase()}
                    </p>
                    <p className="mt-2 line-clamp-2 break-words text-sm text-muted">{item.details || 'No additional details provided.'}</p>
                    <p className="mt-2 text-xs text-muted">Reported by {item.reporter.fullname}</p>
                    <button
                      className={`${button} mt-4`}
                      onClick={() => void open('reports', item.id)}
                    >
                      Review report
                    </button>
                  </article>
                ) : (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-border bg-surface p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="break-words font-bold">{item.fullname}</h2>
                      <Status user={item} />
                    </div>
                    <p className="mt-2 break-all text-sm text-muted">
                      {item.email}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      {item.role === 'ADMIN' ? 'Administrator' : 'Member'}
                    </p>
                    <button
                      className={`${button} mt-4`}
                      onClick={() => void open('users', item.id)}
                    >
                      View user
                    </button>
                  </article>
                )
              )}
          </div>
          {list && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
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
