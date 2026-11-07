'use client';
import { useId, type ComponentProps } from 'react';
import { AppSelect } from './AppSelect';

type Props = Omit<ComponentProps<'select'>, 'id'> & { id?: string; label: string; description?: string };
export function SelectField({ id, label, description, children, className = '', ...props }: Props) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div className="min-w-0">
      <label htmlFor={fieldId} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/65">{label}</label>
      <AppSelect {...props} id={fieldId} className={className}>{children}</AppSelect>
      {description && <p className="mt-1.5 text-xs text-white/50">{description}</p>}
    </div>
  );
}
