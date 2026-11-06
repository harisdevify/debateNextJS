import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import HomePage from './page';

vi.mock('@/components/debate/DebateCTA', () => ({
  DebateCTA: ({ className }: { className: string }) => <a className={className} href="/login">Login to Start Debating</a>,
}));

it('renders the editorial hero, an explicitly illustrative preview and working navigation', () => {
  render(<HomePage />);
  expect(screen.getByRole('heading', { level: 1, name: /Good debates.*respect/i })).toBeTruthy();
  expect(screen.getByText(/Illustrative room preview/)).toBeTruthy();
  expect(screen.getAllByRole('link', { name: 'Login to Start Debating' })).toHaveLength(2);
  expect(screen.getByRole('link', { name: /Read guidelines/i }).getAttribute('href')).toBe('/rules');
});

it('describes the supported matching experience without invented user counts', () => {
  render(<HomePage />);
  expect(screen.getByText('1:1')).toBeTruthy();
  expect(screen.getByText('2 languages')).toBeTruthy();
  expect(screen.queryByText(/2,400/)).toBeNull();
});
