'use client';
import { Dialog } from '@/components/ui/Dialog';
import { useState } from 'react';

interface BlockDialogProps {
  open: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}

export function BlockDialog({ open, name, onClose, onConfirm }: BlockDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await onConfirm();
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={name ? `Block ${name}?` : 'Block this user?'}>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        This debate will end, and you will never be matched with each other again. They will only
        see that the debate ended.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="pressable rounded-full border border-white/10 px-5 py-2 text-sm text-white/70 transition-colors hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className="pressable rounded-full bg-primary px-5 py-2 text-sm font-bold text-background transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Blocking…' : 'Block'}
        </button>
      </div>
    </Dialog>
  );
}
