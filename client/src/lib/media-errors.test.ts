import { describe, expect, it, vi, afterEach } from 'vitest';
import { mediaEnvironmentError, mediaErrorMessage } from './media-errors';

describe('WebRTC device error messages', () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([
    ['NotAllowedError', 'denied'],
    ['NotFoundError', 'No usable'],
    ['NotReadableError', 'busy'],
    ['AbortError', 'could not start'],
  ])('returns actionable message for %s', (name, phrase) => {
    expect(mediaErrorMessage({ name })).toContain(phrase);
  });
  it('handles unexpected errors without leaking raw details', () => {
    expect(mediaErrorMessage(new Error('secret device identifier'))).not.toContain('secret');
  });
  it('rejects browsers without mediaDevices', () => {
    vi.stubGlobal('navigator', { mediaDevices: undefined });
    expect(mediaEnvironmentError()).toContain('does not support');
  });
});
