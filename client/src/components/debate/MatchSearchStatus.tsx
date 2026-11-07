'use client';
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  startedAt: number | null;
  confirmed: boolean;
  onCancel: () => void;
  onChangePreferences: () => void;
}

export function MatchSearchStatus({ startedAt, confirmed, onCancel, onChangePreferences }: Props) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (startedAt === null) return;
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const elapsedLabel = `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`;
  return (
    <div role="status" aria-live="polite" className="relative z-10 flex w-full max-w-sm flex-col items-center rounded-2xl border border-white/15 bg-[#111e1a]/95 px-4 py-5 text-center shadow-lg sm:px-5">
      <span className="mb-3 grid size-12 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary"><Search size={22} aria-hidden="true" /></span>
      <h2 className="text-lg font-semibold text-white">Finding your debate partner</h2>
      <p className="mt-2 text-sm leading-6 text-white/65">
        {confirmed ? 'Waiting for someone with the same topic, language and mode.' : 'Checking your preferences with the debate server…'}
      </p>
      <p className="mt-3 font-mono text-sm text-white/65" aria-label={`Searching for ${elapsedLabel}`}>Waiting {elapsedLabel}</p>
      {elapsed >= 30 && <p className="mt-3 text-xs leading-5 text-white/50">No compatible partner yet. You can keep waiting or change your preferences.</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onCancel} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-3 text-sm font-semibold text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary/50"><X size={16}/> Cancel search</button>
        <button type="button" onClick={onChangePreferences} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/10">Change preferences</button>
      </div>
    </div>
  );
}
