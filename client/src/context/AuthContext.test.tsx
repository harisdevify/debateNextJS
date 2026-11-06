import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import type { User } from '@/types';
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api', () => ({ default: mocks }));
const user = (id: number) => ({ id, fullname: `User ${id}` } as User);
beforeEach(() => { localStorage.clear(); mocks.get.mockResolvedValue({ data: user(1) }); });
it('isolates avatars by account and never adopts the ambiguous old key', async () => {
  localStorage.setItem('debate:profile-overrides', JSON.stringify({ avatar: 'legacy' }));
  const { result } = renderHook(useAuth, { wrapper: AuthProvider });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.getUser()?.avatar).toBeUndefined();
  act(() => result.current.saveUser({ avatar: 'first-avatar' }));
  expect(result.current.getUser()?.avatar).toBe('first-avatar');
  mocks.post.mockResolvedValue({ data: user(2) });
  await act(async () => { await result.current.login({ email: 'two@test.dev', password: 'password' }); });
  expect(result.current.getUser()?.avatar).toBeUndefined();
  act(() => result.current.saveUser({ avatar: 'second-avatar' }));
  mocks.post.mockResolvedValue({ data: user(1) });
  await act(async () => { await result.current.login({ email: 'one@test.dev', password: 'password' }); });
  expect(result.current.getUser()?.avatar).toBe('first-avatar');
});

it('keeps a successful login when an older session request rejects late', async () => {
  let rejectInitial: (error: unknown) => void = () => {};
  mocks.get.mockImplementationOnce(() => new Promise((_, reject) => { rejectInitial = reject; }));
  const { result } = renderHook(useAuth, { wrapper: AuthProvider });
  mocks.post.mockResolvedValueOnce({ data: user(7) });
  await act(async () => { await result.current.login({ email: 'seven@example.com', password: 'password' }); });
  await act(async () => { rejectInitial({ response: { status: 401 } }); });
  expect(result.current.user?.id).toBe(7);
  expect(result.current.loading).toBe(false);
});
it('offers retry instead of logging out during a transient session-check failure', async () => {
  mocks.get.mockRejectedValueOnce(new Error('network unavailable')).mockResolvedValueOnce({ data: user(3) });
  const { result } = renderHook(useAuth, { wrapper: AuthProvider });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.verificationError).toBe(true);
  await act(async () => { await result.current.retrySession(); });
  expect(result.current.verificationError).toBe(false);
  expect(result.current.user?.id).toBe(3);
});
