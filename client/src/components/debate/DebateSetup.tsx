'use client';

import { useState, type FormEvent } from 'react';
import { ChoiceOption } from '@/components/ui/ChoiceOption';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-primary">Prepare your debate</p>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Find the right conversation</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Choose a topic, language and conversation style. You will only be matched with someone who selected all three options.</p>
      </header>
      <form onSubmit={submit} className="space-y-7 rounded-2xl border border-white/10 bg-[#0f1817] p-5 shadow-lg sm:p-8">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-white">1. Discussion topic</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEBATE_TOPICS.map((topic) => (
              <ChoiceOption key={topic.value} name="topic" value={topic.value} title={topic.label} checked={preferences.topic === topic.value} onChange={() => setPreferences((current) => ({ ...current, topic: topic.value }))} />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-white">2. Language</legend>
          <div className="grid grid-cols-2 gap-2">
            {DEBATE_LANGUAGES.map((language) => (
              <ChoiceOption key={language.value} name="language" value={language.value} title={language.label} checked={preferences.language === language.value} onChange={() => setPreferences((current) => ({ ...current, language: language.value }))} />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-white">3. Discussion style</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEBATE_MODES.map((mode) => (
              <ChoiceOption key={mode.value} name="mode" value={mode.value} title={mode.label} description={mode.description} checked={preferences.mode === mode.value} onChange={() => setPreferences((current) => ({ ...current, mode: mode.value }))} />
            ))}
          </div>
        </fieldset>
        <PrimaryButton type="submit">Find a debate partner</PrimaryButton>
        <p className="text-center text-xs text-white/45">Camera and microphone permissions are requested after you start.</p>
      </form>
    </main>
  );
}
