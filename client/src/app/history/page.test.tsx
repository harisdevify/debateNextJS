import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DebateHistoryPage from './page';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  user: { id: 5, fullname: 'Test User' } as null | { id: number; fullname: string },
  loading: false,
  verificationError: false,
  retrySession: vi.fn(),
}));
vi.mock('@/lib/api', () => ({ default: { get: mocks.get } }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, loading: mocks.loading,
    verificationError: mocks.verificationError, retrySession: mocks.retrySession }),
}));

beforeEach(() => {
  mocks.user = { id: 5, fullname: 'Test User' };
  mocks.loading = false;
  mocks.verificationError = false;
  mocks.get.mockReset();
  mocks.get.mockResolvedValue({ data: { items: [], total: 0, page: 1, pageSize: 12, totalPages: 0 } });
});

it('keeps guest history private and shows a login link without requesting data', () => {
  mocks.user = null;
  render(<DebateHistoryPage />);
  expect(screen.getByText('Sign in to see your debate history')).toBeTruthy();
  expect(mocks.get).not.toHaveBeenCalled();
});

it('shows a privacy-safe empty state', async () => {
  render(<DebateHistoryPage />);
  await screen.findByText('No past debates yet');
  expect(mocks.get).toHaveBeenCalledWith('/debates/history', expect.objectContaining({ params: { page: 1 } }));
});

it('renders completed vs ended sessions and navigates between pages', async () => {
  mocks.get.mockImplementation(async (_path: string, opts: { params: { page: number } }) => ({
    data: { page: opts.params.page, pageSize: 12, total: 13, totalPages: 2,
      items: [{ id: opts.params.page.toString(), topic: 'science', language: 'en', mode: 'formal',
        startedAt: '2026-11-06T12:00:00.000Z', endedAt: '2026-11-06T12:10:00.000Z',
        durationSeconds: 600, endReason: opts.params.page === 1 ? 'COMPLETED' : 'ENDED' }] },
  }));
  render(<DebateHistoryPage />);
  await screen.findByText('Science');
  expect(screen.getByText('Completed')).toBeTruthy();
  expect(screen.getByText('10m')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(screen.getByText('Ended')).toBeTruthy());
  expect(mocks.get).toHaveBeenCalledWith('/debates/history', expect.objectContaining({ params: { page: 2 } }));
  expect(screen.queryByText(/partner profile/i)).toBeTruthy(); // Privacy description remains visible.
});

it('allows retrying a failed history request without clearing the session', async () => {
  mocks.get.mockRejectedValueOnce(new Error('offline'));
  render(<DebateHistoryPage />);
  await screen.findByText('Could not load your history');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('No past debates yet');
});
