import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MatchSearchStatus } from './MatchSearchStatus';

it('shows genuine queue confirmation and allows cancel', () => {
  const cancel = vi.fn();
  const change = vi.fn();
  render(<MatchSearchStatus startedAt={null} confirmed={false} onCancel={cancel} onChangePreferences={change} />);
  expect(screen.getByText(/Checking your preferences with the debate server/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Cancel search/ }));
  expect(cancel).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Change preferences' }));
  expect(change).toHaveBeenCalledOnce();
});
it('renders elapsed time without inventing available partner counts', async () => {
  vi.useFakeTimers();
  try {
    const startedAt = Date.now();
    render(<MatchSearchStatus startedAt={startedAt} confirmed={true} onCancel={vi.fn()} onChangePreferences={vi.fn()} />);
    expect(screen.getByText(/Waiting for someone with the same topic/)).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
    expect(screen.getByLabelText('Searching for 00:31')).toBeTruthy();
    expect(screen.getByText(/No compatible partner yet/)).toBeTruthy();
  } finally {
    vi.useRealTimers();
  }
});
