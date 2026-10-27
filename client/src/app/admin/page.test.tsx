import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import AdminPage from './page';
const mocks = vi.hoisted(() => ({
  user: null as null | { role: string },
  loading: false,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mocks }));
vi.mock('@/components/admin/AdminPanel', () => ({
  AdminPanel: () => <div>Protected moderation content</div>,
}));
it('does not mount the admin panel for a normal account', () => {
  mocks.user = { role: 'USER' };
  render(<AdminPage />);
  expect(screen.queryByText('Protected moderation content')).toBeNull();
  expect(screen.getByText('Admin access required')).toBeTruthy();
});
it('mounts the panel for an admin', () => {
  mocks.user = { role: 'ADMIN' };
  render(<AdminPage />);
  expect(screen.getByText('Protected moderation content')).toBeTruthy();
});
