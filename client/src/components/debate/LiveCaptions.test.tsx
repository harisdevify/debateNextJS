import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { LiveCaptions } from './LiveCaptions';

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  abort = vi.fn();
  constructor() { FakeSpeechRecognition.instances.push(this); }
  utter(text: string, isFinal: boolean) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript: text } }] });
  }
}
const props = { status: 'connected' as const, language: 'en' as const,
  micOn: true, maySpeak: true, peerCaption: '', onCaption: vi.fn() };

beforeEach(() => {
  FakeSpeechRecognition.instances = [];
  Object.defineProperty(window, 'SpeechRecognition', {
    configurable: true, value: FakeSpeechRecognition,
  });
  props.onCaption.mockReset();
});
afterEach(() => {
  Reflect.deleteProperty(window, 'SpeechRecognition');
});

it('is opt-in and sends only finalized speech in the debate language', async () => {
  render(<LiveCaptions {...props} />);
  expect(FakeSpeechRecognition.instances).toHaveLength(0);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Turn captions on' })).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Turn captions on' }));
  await waitFor(() => expect(FakeSpeechRecognition.instances).toHaveLength(1));
  const recognition = FakeSpeechRecognition.instances[0];
  expect(recognition.lang).toBe('en-US');
  expect(recognition.continuous).toBe(true);
  expect(recognition.interimResults).toBe(true);
  act(() => recognition.utter('hello in progress', false));
  expect(screen.getByText('hello in progress')).toBeTruthy();
  expect(props.onCaption).not.toHaveBeenCalled();
  act(() => recognition.utter('hello friend', true));
  expect(props.onCaption).toHaveBeenCalledWith('hello friend');
  fireEvent.click(screen.getByRole('button', { name: 'Turn captions off' }));
  expect(recognition.abort).toHaveBeenCalled();
});

it('pauses recognition when muted and respects Urdu mode', async () => {
  const { rerender } = render(<LiveCaptions {...props} language="ur" />);
  fireEvent.click(screen.getByRole('button', { name: 'Turn captions on' }));
  await waitFor(() => expect(FakeSpeechRecognition.instances).toHaveLength(1));
  expect(FakeSpeechRecognition.instances[0].lang).toBe('ur-PK');
  rerender(<LiveCaptions {...props} language="ur" micOn={false} />);
  expect(FakeSpeechRecognition.instances[0].abort).toHaveBeenCalled();
});

it('does not show a fake transcript when unsupported', async () => {
  Reflect.deleteProperty(window, 'SpeechRecognition');
  Reflect.deleteProperty(window, 'webkitSpeechRecognition');
  render(<LiveCaptions {...props} />);
  await waitFor(() => expect(screen.getByText(/not supported in this browser/)).toBeTruthy());
  expect((screen.getByRole('button', { name: 'Turn captions on' }) as HTMLButtonElement).disabled).toBe(true);
});
