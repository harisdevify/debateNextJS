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
  fireEvent.click(screen.getByRole('combobox', { name: 'Gender' }));
  fireEvent.click(screen.getByRole('option', { name: 'Female' }));
  expect(handleChange).toHaveBeenCalledWith('female');
  expect(screen.getByRole('combobox', { name: 'Gender' }).textContent).toContain('Female');
  expect((document.querySelector('select[name="gender"]') as HTMLSelectElement).value).toBe('female');
});

it('respects disabled state and retains selected option in the trigger', () => {
  render(<AppSelect aria-label="Device" value="camera-a" disabled><option value="camera-a">Camera A</option></AppSelect>);
  const trigger = screen.getByRole('combobox', { name: 'Device' });
  expect((trigger as HTMLButtonElement).disabled).toBe(true);
  expect(trigger.textContent).toContain('Camera A');
});

it('supports keyboard navigation and selects the highlighted option', () => {
  const onChange = vi.fn();
  render(<AppSelect aria-label="Language" defaultValue="en" onChange={(event) => onChange(event.target.value)}>
    <option value="en">English</option>
    <option value="ur">Urdu</option>
  </AppSelect>);
  const trigger = screen.getByRole('combobox', { name: 'Language' });
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith('ur');
  expect(trigger.textContent).toContain('Urdu');
});
