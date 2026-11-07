import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { AppSelect } from './AppSelect';

it('shows styled options and emits the native select change contract', () => {
  const handleChange = vi.fn();
  function Example() {
    const [value, setValue] = useState('male');
    return <AppSelect aria-label="Gender" name="gender" value={value} onChange={(event) => { setValue(event.target.value); handleChange(event.target.value); }}>
      <option value="">Select gender</option>
      <option value="male">Male</option>
      <option value="female">Female</option>
    </AppSelect>;
  }
  render(<Example />);
  fireEvent.click(screen.getByRole('button', { name: 'Gender' }));
  fireEvent.click(screen.getByRole('option', { name: 'Female' }));
  expect(handleChange).toHaveBeenCalledWith('female');
  expect(screen.getByRole('button', { name: 'Gender' }).textContent).toContain('Female');
  expect((document.querySelector('select[name="gender"]') as HTMLSelectElement).value).toBe('female');
});

it('respects disabled state and retains selected option in the trigger', () => {
  render(<AppSelect aria-label="Device" value="camera-a" disabled><option value="camera-a">Camera A</option></AppSelect>);
  const trigger = screen.getByRole('button', { name: 'Device' });
  expect((trigger as HTMLButtonElement).disabled).toBe(true);
  expect(trigger.textContent).toContain('Camera A');
});
