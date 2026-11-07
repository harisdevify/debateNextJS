'use client';

import { useEffect, useState } from 'react';
import type { DebateStatus } from '@/types';

type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};
type RecognitionFailure = { error: string };
type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionFailure) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type RecognitionConstructor = new () => RecognitionInstance;
type RecognitionWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

const locale = { en: 'en-US', ur: 'ur-PK' } as const;

export function useLiveCaptions({
  status,
  language,
  micOn,
  maySpeak,
  onCaption,
}: {
  status: DebateStatus;
  language: 'en' | 'ur';
  micOn: boolean;
  maySpeak: boolean;
  onCaption: (text: string) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const browser = window as RecognitionWindow;
    return Boolean(browser.SpeechRecognition || browser.webkitSpeechRecognition);
  });
  const [error, setError] = useState('');

  const active = enabled && status === 'connected' && micOn && maySpeak && supported;
  useEffect(() => {
    if (!active) {
      return;
    }
    const browser = window as RecognitionWindow;
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) return;
    let disposed = false;
    let restart: ReturnType<typeof setTimeout> | undefined;
    const recognition = new Constructor();
    recognition.lang = locale[language];
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      if (disposed) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript.trim() ?? '';
        if (!text) continue;
        if (result.isFinal) {
          for (let offset = 0; offset < text.length; offset += 240) {
            onCaption(text.slice(offset, offset + 240));
          }
        }
      }
    };
    recognition.onerror = (event) => {
      if (disposed || event.error === 'no-speech' || event.error === 'aborted') return;
      if (['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported', 'network'].includes(event.error)) {
        setError(event.error === 'language-not-supported'
          ? 'Speech recognition is unavailable for this language in your browser.'
          : 'Speech recognition is unavailable. Check browser permission and speech service.');
        setEnabled(false);
      }
    };
    recognition.onend = () => {
      if (!disposed) {
        restart = setTimeout(() => {
          if (disposed) return;
          try {
            recognition.start();
          } catch {
            setError('Could not restart speech recognition.');
            setEnabled(false);
          }
        }, 500);
      }
    };
    try {
      recognition.start();
    } catch {
      queueMicrotask(() => {
        if (disposed) return;
        setError('Could not start speech recognition in this browser.');
        setEnabled(false);
      });
    }
    return () => {
      disposed = true;
      if (restart) clearTimeout(restart);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    };
  }, [active, language, onCaption]);

  const toggle = () => {
    setError('');
    setEnabled((current) => !current);
  };
  return { enabled, supported, error, toggle, active };
}
