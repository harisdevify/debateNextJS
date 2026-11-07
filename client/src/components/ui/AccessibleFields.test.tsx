import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectField } from './SelectField';
import { ChoiceOption } from './ChoiceOption';
import { PageState } from './PageState';

describe('reusable UI components', () => {
  it('associates select label with its control, including generated id', () => {
    render(<SelectField label="Gender" defaultValue=""><option value="">Choose one</option><option value="female">Female</option></SelectField>);
    const select = screen.getByRole('combobox', { name: 'Gender' });
    expect(select.getAttribute('id')).toBeTruthy();
    expect(select.textContent).toContain('Choose one');
  });
  it('makes selected radio options keyboard-operable with descriptions', () => {
    const onChange = vi.fn();
    render(<ChoiceOption name="mode" value="formal" checked={false} title="Formal debate" description="Structured turn taking" onChange={onChange} />);
    const radio = screen.getByRole('radio', { name: /Formal debate/ });
    fireEvent.click(radio);
    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.getByText('Structured turn taking')).toBeTruthy();
  });
  it('shows an accessible retry action on network failures', () => {
    const retry = vi.fn();
    render(<PageState title="Connection unavailable" status="alert" description="Try again" action={<button onClick={retry}>Retry</button>} />);
    expect(screen.getByRole('alert').textContent).toContain('Connection unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
