'use client';
import { Dialog } from '@/components/ui/Dialog';
import { useState, type FormEvent } from 'react';

export const REPORT_REASONS = [
  { value: 'HARASSMENT', label: 'Harassment or bullying' },
  { value: 'ABUSIVE_LANGUAGE', label: 'Abusive or hateful language' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
  { value: 'SPAM', label: 'Spam or advertising' },
  { value: 'OTHER', label: 'Something else' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

const MAX_DETAILS = 500;

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => Promise<boolean>;
}

export function ReportDialog({ open, onClose, onSubmit }: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reason || sending) return;
    setSending(true);
    const ok = await onSubmit(reason, details.trim());
    setSending(false);
    if (ok) {
      setReason(null);
      setDetails('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Report this user">
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-muted">
            What went wrong? Reports are private and reviewed by the team.
          </legend>
          {REPORT_REASONS.map((item) => (
            <label
              key={item.value}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm text-white/80 transition-colors hover:border-primary/40 has-[:checked]:border-primary/60 has-[:checked]:bg-primary/10"
            >
              <input
                type="radio"
                name="reason"
                value={item.value}
                checked={reason === item.value}
                onChange={() => setReason(item.value)}
                className="size-4 accent-primary"
              />
              {item.label}
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor="report-details" className="mb-1.5 block text-sm text-muted">
            More details (optional)
          </label>
          <textarea
            id="report-details"
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, MAX_DETAILS))}
            rows={3}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-primary/60 focus:outline-none"
            placeholder="What happened?"
          />
          <p className="mt-1 text-right text-xs text-white/30">
            {details.length}/{MAX_DETAILS}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="pressable rounded-full border border-white/10 px-5 py-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!reason || sending}
            className="pressable rounded-full bg-primary px-5 py-2 text-sm font-bold text-background transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send report'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
