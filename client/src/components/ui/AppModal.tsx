'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type AppModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeDisabled?: boolean;
  size?: 'sm' | 'md';
};

export function AppModal({ open, onClose, title, description, children, footer, closeDisabled = false, size = 'md' }: AppModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        if (closeDisabled) event.preventDefault();
        else { event.preventDefault(); onClose(); }
      }}
      onClick={(event) => { if (event.target === event.currentTarget && !closeDisabled) onClose(); }}
      className={`fixed inset-0 m-auto w-[calc(100%-2rem)] max-h-[min(85dvh,720px)] overflow-y-auto rounded-2xl border border-white/15 bg-[#101a17] p-0 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm ${size === 'sm' ? 'max-w-md' : 'max-w-lg'}`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p id={descriptionId} className="mt-1 text-sm leading-5 text-white/55">{description}</p>}
        </div>
        <button type="button" aria-label="Close dialog" onClick={onClose} disabled={closeDisabled} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40"><X size={17} /></button>
      </div>
      <div className="px-5 py-5">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-4">{footer}</div>}
    </dialog>,
    document.body,
  );
}
