import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ModerationOverview } from './ModerationOverview';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ default: { get: mocks.get } }));
beforeEach(() => { mocks.get.mockReset(); });

it('renders server-provided overview metrics without invented counts', async () => {
  mocks.get.mockResolvedValue({ data: { pendingReports: 4, reviewedReports: 12,
    suspendedUsers: 2, bannedUsers: 1, recentActions: 5 } });
  render(<ModerationOverview refresh={0} />);
  await screen.findByText('Needs review');
  expect(screen.getByText('Open reports')).toBeTruthy();
  expect(screen.getByText('4')).toBeTruthy();
  expect(screen.getByText('2 suspended · 1 banned')).toBeTruthy();
  expect(screen.getByText('Last 7 days')).toBeTruthy();
  expect(mocks.get).toHaveBeenCalledWith('/admin/overview', expect.objectContaining({ silent: true }));
});
it('shows recovery instead of showing misleading zeros when overview fails', async () => {
  mocks.get.mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ data: { pendingReports: 0, reviewedReports: 0,
      suspendedUsers: 0, bannedUsers: 0, recentActions: 0 } });
  render(<ModerationOverview refresh={0} />);
  await screen.findByText(/Overview unavailable/);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.getByText('Open reports')).toBeTruthy());
  expect(mocks.get).toHaveBeenCalledTimes(2);
});
