'use client';
import { useState, type FormEvent } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { actionLabels, type ActionKind } from './types';
export interface ActionBody {
  action: ActionKind;
  reason: string;
  durationHours?: number;
}
const field =
  'w-full rounded-xl border border-border bg-background p-3 text-foreground focus-visible:outline-2 focus-visible:outline-primary';
export function ActionForm({
  name,
  report,
  restricted,
  onlyDismiss = false,
  onSubmit,
}: {
  name: string;
  report: boolean;
  restricted: boolean;
  onlyDismiss?: boolean;
  onSubmit: (body: ActionBody) => Promise<boolean>;
}) {
  const [action, setAction] = useState<ActionKind>(
    report ? 'DISMISS' : restricted ? 'RESTORE' : 'WARN'
  );
  const [reason, setReason] = useState('');
  const [hours, setHours] = useState(24);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const options: ActionKind[] = onlyDismiss
    ? ['DISMISS']
    : report
      ? ['DISMISS', 'WARN', 'SUSPEND', 'BAN']
      : restricted
        ? ['RESTORE', 'WARN', 'SUSPEND', 'BAN']
        : ['WARN', 'SUSPEND', 'BAN'];
  const review = (e: FormEvent) => {
    e.preventDefault();
    if (reason.trim().length >= 5) setConfirm(true);
  };
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (
        await onSubmit({
          action,
          reason: reason.trim(),
          ...(action === 'SUSPEND' ? { durationHours: hours } : {}),
        })
      ) {
        setConfirm(false);
        setReason('');
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-lg font-bold">Choose an action</h2>
      <p className="mt-2 text-sm text-muted">
        Review the context first. A report alone is not proof of misconduct.
      </p>
      <form onSubmit={review} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Action</span>
          <select
            className={field}
            value={action}
            onChange={(e) => setAction(e.target.value as ActionKind)}
          >
            {options.map((kind) => (
              <option key={kind} value={kind}>
                {actionLabels[kind]}
              </option>
            ))}
          </select>
        </label>
        {action === 'SUSPEND' && (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Suspend for
            </span>
            <select
              className={field}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            >
              <option value={1}>1 hour</option>
              <option value={24}>24 hours</option>
              <option value={168}>7 days</option>
              <option value={720}>30 days</option>
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Internal reason
          </span>
          <textarea
            aria-label="Internal reason"
            required
            minLength={5}
            maxLength={1000}
            rows={4}
            className={field}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this action is appropriate."
          />
          <span className="text-xs text-muted">
            5-1000 characters. Saved in the admin history; not sent to the
            reported user.
          </span>
        </label>
        <button
          disabled={reason.trim().length < 5 || busy}
          className="min-h-11 rounded-full bg-primary px-5 py-2 font-semibold text-background disabled:opacity-40"
        >
          Review action
        </button>
      </form>
      <Dialog
        open={confirm}
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
        title={actionLabels[action]}
      >
        <p className="mt-4">
          Apply this action to <strong>{name}</strong>?
        </p>
        <p className="mt-3 text-sm text-muted">
          {action === 'BAN'
            ? 'This ends active debates and prevents access until an admin restores the account.'
            : action === 'SUSPEND'
              ? `Access will be restricted for ${hours} hours. Active debates will end.`
              : action === 'RESTORE'
                ? 'This restores access immediately. Previous actions stay in the history.'
                : action === 'WARN'
                  ? 'This saves a conduct warning. Connected users receive a notification.'
                  : 'This closes the report without restricting the account.'}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            disabled={busy}
            onClick={() => setConfirm(false)}
            className="min-h-11 rounded-full border border-border px-5 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={submit}
            className="min-h-11 rounded-full bg-primary px-5 text-background disabled:opacity-40"
          >
            {busy ? 'Saving...' : 'Confirm action'}
          </button>
        </div>
      </Dialog>
    </section>
  );
}
