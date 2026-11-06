'use client';

import { useState, type FormEvent } from 'react';
import type { DebatePreferences } from '@/types';
import {
  DEFAULT_DEBATE_PREFERENCES,
  DEBATE_LANGUAGES,
  DEBATE_MODES,
  DEBATE_TOPICS,
} from '@/lib/debate-preferences';

interface Props {
  initial?: DebatePreferences;
  onStart: (preferences: DebatePreferences) => void;
}

export function DebateSetup({ initial = DEFAULT_DEBATE_PREFERENCES, onStart }: Props) {
  const [preferences, setPreferences] = useState<DebatePreferences>(initial);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onStart(preferences);
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-12 sm:py-16">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-primary">Prepare your debate</p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Find the right conversation</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Choose a topic, language and conversation style. You will only be matched with someone who selected all three options.</p>
      </header>
      <form onSubmit={submit} className="space-y-7 rounded-2xl border border-white/10 bg-[#0f1817] p-5 shadow-lg sm:p-8">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-white">1. Discussion topic</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEBATE_TOPICS.map((topic) => (
              <label key={topic.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${preferences.topic === topic.value ? 'border-primary bg-primary/10 text-white' : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25'}`}>
                <input type="radio" name="topic" value={topic.value} checked={preferences.topic === topic.value} onChange={() => setPreferences((current) => ({ ...current, topic: topic.value }))} className="accent-[#00bfa6]" />
                {topic.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-white">2. Language</legend>
          <div className="grid grid-cols-2 gap-2">
            {DEBATE_LANGUAGES.map((language) => (
              <label key={language.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${preferences.language === language.value ? 'border-primary bg-primary/10 text-white' : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25'}`}>
                <input type="radio" name="language" value={language.value} checked={preferences.language === language.value} onChange={() => setPreferences((current) => ({ ...current, language: language.value }))} className="accent-[#00bfa6]" />
                {language.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-white">3. Discussion style</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEBATE_MODES.map((mode) => (
              <label key={mode.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${preferences.mode === mode.value ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}>
                <input type="radio" name="mode" value={mode.value} checked={preferences.mode === mode.value} onChange={() => setPreferences((current) => ({ ...current, mode: mode.value }))} className="mt-1 accent-[#00bfa6]" />
                <span><span className="block text-sm font-semibold text-white">{mode.label}</span><span className="mt-1 block text-xs leading-5 text-white/55">{mode.description}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="pressable flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-background transition-colors hover:bg-primary-hover">Find a debate partner</button>
        <p className="text-center text-xs text-white/45">Camera and microphone permissions are requested after you start.</p>
      </form>
    </main>
  );
}
