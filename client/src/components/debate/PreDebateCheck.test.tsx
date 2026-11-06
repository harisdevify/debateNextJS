import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { PreDebateCheck } from './PreDebateCheck';

const tracks = [{ kind: 'video', stop: vi.fn(), readyState: 'live', getSettings: () => ({ deviceId: 'cam-1' }) },
  { kind: 'audio', stop: vi.fn(), readyState: 'live', getSettings: () => ({ deviceId: 'mic-1' }) }];
const stream = {
  getTracks: () => tracks,
  getVideoTracks: () => [tracks[0]],
  getAudioTracks: () => [tracks[1]],
};
const preferences = { topic: 'science', language: 'en', mode: 'friendly' } as const;
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: vi.fn(async () => stream),
    enumerateDevices: vi.fn(async () => [
      { kind: 'videoinput', deviceId: 'cam-1', label: 'Front camera' },
      { kind: 'audioinput', deviceId: 'mic-1', label: 'Main microphone' },
    ]),
  } });
});
it('asks permission only after clicking Enable and releases media when going back', async () => {
  const back = vi.fn();
  const view = render(<PreDebateCheck preferences={preferences} onBack={back} onJoin={vi.fn()} />);
  expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /enable camera/i }));
  await waitFor(() => expect(screen.getByText('Camera and microphone ready')).toBeTruthy());
  expect(screen.getByRole('combobox', { name: 'Camera' })).toBeTruthy();
  view.unmount();
  expect(tracks[0].stop).toHaveBeenCalled();
  expect(tracks[1].stop).toHaveBeenCalled();
});
it('transfers ownership of the preview stream without stopping tracks', async () => {
  const join = vi.fn();
  const view = render(<PreDebateCheck preferences={preferences} onBack={vi.fn()} onJoin={join} />);
  fireEvent.click(screen.getByRole('button', { name: /enable camera/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Find a debate partner' })).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Find a debate partner' }));
  expect(join).toHaveBeenCalledWith(stream);
  view.unmount();
  expect(tracks[0].stop).not.toHaveBeenCalled();
});
it('shows permission failure and allows retry without joining', async () => {
  vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce({ name: 'NotAllowedError' });
  render(<PreDebateCheck preferences={preferences} onBack={vi.fn()} onJoin={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /enable camera/i }));
  await waitFor(() => expect(screen.getByText(/access was denied/i)).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: /enable camera/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Find a debate partner' })).toBeTruthy());
});
