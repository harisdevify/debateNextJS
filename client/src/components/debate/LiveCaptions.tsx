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

export function LiveCaptions({
  status,
  language,
  micOn,
  maySpeak,
  peerCaption,
  onCaption,
}: {
  status: DebateStatus;
  language: 'en' | 'ur';
  micOn: boolean;
  maySpeak: boolean;
  peerCaption: string;
  onCaption: (text: string) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [localText, setLocalText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const browser = window as RecognitionWindow;
    setSupported(Boolean(browser.SpeechRecognition || browser.webkitSpeechRecognition));
  }, []);

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
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript.trim() ?? '';
        if (!text) continue;
        if (result.isFinal) {
          for (let offset = 0; offset < text.length; offset += 240) {
            onCaption(text.slice(offset, offset + 240));
          }
        } else {
          interim += (interim ? ' ' : '') + text;
        }
      }
      setLocalText(interim.slice(-240));
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
      setError('Could not start speech recognition in this browser.');
      setEnabled(false);
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

  return (
    <section aria-label="Live captions" className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-pressed={enabled}
          disabled={supported !== true}
          onClick={() => {
            setError('');
            setLocalText('');
            setEnabled((current) => !current);
          }}
          className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? 'border-primary bg-primary/10 text-primary' : 'border-white/20 bg-[#111b19] text-white/80 hover:border-primary/50'}`}
        >
          {enabled ? 'Turn captions off' : 'Turn captions on'}
        </button>
        <span className="text-xs leading-5 text-white/55">
          {supported === false
            ? 'Speech recognition is not supported in this browser.'
            : enabled
              ? status !== 'connected'
                ? 'Captions paused until connected.'
                : !micOn || !maySpeak
                  ? 'Your captions pause while your microphone is muted.'
                  : 'Captions on · live speech recognition'
              : 'Off by default · no transcripts saved'}
        </span>
      </div>
      {enabled && (
        <div className="grid min-w-0 gap-2 sm:grid-cols-2" aria-live="off">
          <p className="min-h-12 min-w-0 rounded-xl border border-white/10 bg-[#111b19] p-3 text-sm leading-6 text-white/80">
            <span className="mr-2 text-xs font-semibold text-primary">You</span>
            <span aria-label="Your live subtitle">{localText || 'Listening for your speech…'}</span>
          </p>
          <p className="min-h-12 min-w-0 rounded-xl border border-white/10 bg-[#111b19] p-3 text-sm leading-6 text-white/80">
            <span className="mr-2 text-xs font-semibold text-primary">Partner</span>
            <span aria-label="Partner subtitle" aria-live="polite" aria-atomic="true">{peerCaption || 'Waiting for partner captions…'}</span>
          </p>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
      {enabled && <p className="text-xs text-white/40">Only final recognized phrases are sent to your partner. Your browser may use an external speech service. Captions are not saved by this app.</p>}
    </section>
  );
}
