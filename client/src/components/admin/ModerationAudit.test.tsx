import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ModerationAudit } from './ModerationAudit';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ default: { get: mocks.get } }));
beforeEach(() => { mocks.get.mockReset(); });

it('loads audit activity using admin-only API and filters kind', async () => {
  mocks.get.mockResolvedValue({ data: { page: 1, pageSize: 20, total: 1,
    items: [{ id: 11, kind: 'SUSPEND', reason: 'Repeated abuse', reportId: 7,
      createdAt: '2026-11-01T12:00:00.000Z', suspendedUntil: null,
      previousStatus: 'ACTIVE', actor: { id: 2, fullname: 'Admin A' },
      target: { id: 3, fullname: 'Member B', email: 'member@example.test',
        role: 'USER', status: 'SUSPENDED', suspendedUntil: null } }] } });
  render(<ModerationAudit refresh={0} />);
  await screen.findByText('Repeated abuse');
  expect(screen.getByText('Admin A', { exact: false }).textContent).toContain('Member B');
  fireEvent.click(screen.getByRole('combobox', { name: 'Filter audit action' }));
  fireEvent.click(screen.getByRole('option', { name: /Suspend/i }));
  await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/admin/audit',
    expect.objectContaining({ params: { page: 1, kind: 'SUSPEND' } })));
});
it('supports retry without exposing previous results after an API error', async () => {
  mocks.get.mockRejectedValueOnce(new Error('server offline'))
    .mockResolvedValueOnce({ data: { page: 1, pageSize: 20, total: 0, items: [] } });
  render(<ModerationAudit refresh={0} />);
  await screen.findByText(/Could not load audit log/);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('No actions match this filter.');
});
