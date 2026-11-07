'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  closeDisabled?: boolean;
  size?: 'sm' | 'md';
}

const EXIT_MS = 140;

export function Dialog({ open, onClose, title, description, children, footer, closeDisabled = false, size = 'md' }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const focusRef = useRef<HTMLElement | null>(null);
  const previousOverflowRef = useRef('');
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (open) {
      dialog.removeAttribute('data-closing');
      if (!dialog.open) {
        focusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        previousOverflowRef.current = document.body.style.overflow;
        dialog.showModal();
        document.body.style.overflow = 'hidden';
      }
      return;
    }

    if (!dialog.open) return;
    const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => {
      if (dialog.open) dialog.close();
      dialog.removeAttribute('data-closing');
      document.body.style.overflow = previousOverflowRef.current;
      const trigger = focusRef.current;
      if (trigger?.isConnected) trigger.focus();
      closeTimerRef.current = null;
    };
    if (reduceMotion) finish();
    else {
      dialog.setAttribute('data-closing', 'true');
      closeTimerRef.current = setTimeout(finish, EXIT_MS);
    }
  }, [open]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
      document.body.style.overflow = previousOverflowRef.current;
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!closeDisabled) onClose();
      }}
      onClick={(event) => {
        if (closeDisabled || event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}
      className={`ux-dialog fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-2xl border border-white/15 bg-[#101a17] p-0 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm ${size === 'sm' ? 'max-w-md' : 'max-w-lg'}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-semibold tracking-tight text-white">{title}</h2>
          {description && <p id={descriptionId} className="mt-1 text-sm leading-5 text-white/55">{description}</p>}
        </div>
        <button type="button" aria-label="Close dialog" onClick={onClose} disabled={closeDisabled} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40"><X size={17} /></button>
      </div>
      <div className="px-5 py-5">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-4">{footer}</div>}
    </dialog>
  );
}
