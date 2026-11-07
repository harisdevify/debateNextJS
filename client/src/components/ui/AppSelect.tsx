'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Children, forwardRef, isValidElement, useCallback, useEffect, useRef, useState, type ComponentProps, type ReactElement } from 'react';

type Props = ComponentProps<'select'>;
type Choice = { value: string; label: string; disabled: boolean };

function getChoices(children: React.ReactNode): Choice[] {
  const choices: Choice[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === 'option') {
      const option = child as ReactElement<ComponentProps<'option'>>;
      choices.push({
        value: String(option.props.value ?? option.props.children ?? ''),
        label: String(option.props.children ?? ''),
        disabled: Boolean(option.props.disabled),
      });
    } else if (child.props && typeof child.props === 'object' && 'children' in child.props) {
      choices.push(...getChoices(child.props.children as React.ReactNode));
    }
  });
  return choices;
}

/** Custom popover with the original native select preserved for form values and change handlers. */
export const AppSelect = forwardRef<HTMLSelectElement, Props>(function AppSelect(
  { className = '', children, value, defaultValue, disabled, onChange, onBlur, onKeyDown, ...props },
  forwardedRef,
) {
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState<string | undefined>(defaultValue === undefined ? undefined : String(defaultValue));
  const rootRef = useRef<HTMLDivElement>(null);
  const nativeRef = useRef<HTMLSelectElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const choices = getChoices(children);
  const selectedValue = value === undefined ? uncontrolled ?? choices.find((c) => !c.disabled)?.value ?? '' : String(value);
  const selected = choices.find((c) => c.value === selectedValue);

  const close = useCallback(() => { setOpen(false); }, []);

  useEffect(() => {
    if (!open) return;
    const onDocumentPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
    };
    const onDocumentKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { close(); triggerRef.current?.focus(); } };
    document.addEventListener('pointerdown', onDocumentPointer);
    document.addEventListener('keydown', onDocumentKey);
    return () => { document.removeEventListener('pointerdown', onDocumentPointer); document.removeEventListener('keydown', onDocumentKey); };
  }, [open, close]);

  const choose = (next: string) => {
    if (!nativeRef.current || disabled) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    setter?.call(nativeRef.current, next);
    nativeRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    if (value === undefined) setUncontrolled(next);
    close();
    triggerRef.current?.focus();
  };

  const move = (direction: number) => {
    const enabled = choices.filter((choice) => !choice.disabled);
    if (!enabled.length) return;
    const index = enabled.findIndex((choice) => choice.value === selectedValue);
    choose(enabled[(index + direction + enabled.length) % enabled.length].value);
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <select
        {...props}
        ref={(node) => { nativeRef.current = node; if (typeof forwardedRef === 'function') forwardedRef(node); else if (forwardedRef) forwardedRef.current = node; }}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={(event) => { if (value === undefined) setUncontrolled(event.target.value); onChange?.(event); }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      >
        {children}
      </select>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={props['aria-label'] ?? (props.id ? undefined : 'Select an option')}
        aria-controls={open ? `${props.id ?? 'app-select'}-options` : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) setOpen(true); else move(event.key === 'ArrowDown' ? 1 : -1); }
          if (event.key === 'Escape') close();
        }}
        className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-white/15 bg-[#0f1817] px-3 py-1.5 text-left text-sm leading-5 text-white transition-colors hover:border-white/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <span className={selectedValue ? 'truncate' : 'truncate text-white/45'}>{selected?.label ?? 'Select an option'}</span>
        <ChevronDown size={15} aria-hidden="true" className={`shrink-0 text-white/45 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={`${props.id ?? 'app-select'}-options`} role="listbox" aria-label={props['aria-label'] ?? 'Options'} className="absolute inset-x-0 top-[calc(100%+5px)] z-[100] max-h-60 overflow-y-auto rounded-xl border border-white/15 bg-[#182320] p-1 shadow-2xl shadow-black/60">
          {choices.map((choice) => (
            <button key={choice.value} type="button" role="option" aria-selected={choice.value === selectedValue} disabled={choice.disabled} onClick={() => choose(choice.value)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/10 focus-visible:bg-white/10 disabled:opacity-40 ${choice.value === selectedValue ? 'bg-primary/10 text-primary' : 'text-white/80'}`}>
              <span className="truncate">{choice.label}</span>
              {choice.value === selectedValue && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
