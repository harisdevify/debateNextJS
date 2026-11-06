import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DebateCTA } from './DebateCTA';
const mockAuth = vi.hoisted(() => ({ state: { user: null as null | { acceptedRulesAt: string | null; ageConfirmedAt: string | null }, loading: false, verificationError: false } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth.state }));
vi.mock('next/link', () => ({ default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a> }));
it('shows login link to guests', () => {
  mockAuth.state.user = null;
  render(<DebateCTA />);
  expect(screen.getByRole('link', { name: /login to start debating/i }).getAttribute('href')).toBe('/login');
});
it('routes authenticated users to debate setup', () => {
  mockAuth.state.user = { acceptedRulesAt: 'now', ageConfirmedAt: 'now' };
  render(<DebateCTA />);
  expect(screen.getByRole('link', { name: /join a debate/i }).getAttribute('href')).toBe('/video');
});
it('routes users without consent to rules', () => {
  mockAuth.state.user = { acceptedRulesAt: null, ageConfirmedAt: null };
  render(<DebateCTA />);
  expect(screen.getByRole('link', { name: /join a debate/i }).getAttribute('href')).toBe('/rules');
});
