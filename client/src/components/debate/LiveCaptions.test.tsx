import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useLiveCaptions } from './LiveCaptions';

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

const props = {
  status: 'connected' as const,
  language: 'en' as const,
  micOn: true,
  maySpeak: true,
  onCaption: vi.fn(),
};

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
  const { result } = renderHook((input) => useLiveCaptions(input), { initialProps: props });
  expect(result.current.enabled).toBe(false);
  expect(FakeSpeechRecognition.instances).toHaveLength(0);

  act(() => result.current.toggle());
  await waitFor(() => expect(FakeSpeechRecognition.instances).toHaveLength(1));
  const recognition = FakeSpeechRecognition.instances[0];
  expect(recognition.lang).toBe('en-US');
  expect(recognition.continuous).toBe(true);
  expect(recognition.interimResults).toBe(true);

  act(() => recognition.utter('hello in progress', false));
  expect(props.onCaption).not.toHaveBeenCalled();

  act(() => recognition.utter('hello friend', true));
  expect(props.onCaption).toHaveBeenCalledWith('hello friend');

  act(() => result.current.toggle());
  expect(recognition.abort).toHaveBeenCalled();
});

it('pauses recognition when muted and respects Urdu mode', async () => {
  const urdu = { ...props, language: 'ur' as const };
  const { result, rerender } = renderHook((input) => useLiveCaptions(input), {
    initialProps: urdu,
  });
  act(() => result.current.toggle());
  await waitFor(() => expect(FakeSpeechRecognition.instances).toHaveLength(1));
  expect(FakeSpeechRecognition.instances[0].lang).toBe('ur-PK');
  rerender({ ...urdu, micOn: false });
  expect(FakeSpeechRecognition.instances[0].abort).toHaveBeenCalled();
});

it('reports unsupported speech recognition and disables caption recognition', () => {
  Reflect.deleteProperty(window, 'SpeechRecognition');
  Reflect.deleteProperty(window, 'webkitSpeechRecognition');
  const { result } = renderHook(() => useLiveCaptions(props));
  expect(result.current.supported).toBe(false);
  expect(result.current.enabled).toBe(false);
  expect(result.current.active).toBe(false);
});

it('does not send captions while disconnected', () => {
  const { result } = renderHook(() => useLiveCaptions({ ...props, status: 'searching' }));
  act(() => result.current.toggle());
  expect(result.current.active).toBe(false);
  expect(FakeSpeechRecognition.instances).toHaveLength(0);
});
