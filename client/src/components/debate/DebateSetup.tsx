'use client';

import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
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

const STEPS = [
  { label: 'Topic', heading: 'What would you like to discuss?', description: 'Choose a topic that interests you. We will find someone with the same choice.' },
  { label: 'Language', heading: 'Choose your language', description: 'You will be matched with someone who speaks the same language.' },
  { label: 'Style', heading: 'How would you like to discuss?', description: 'Choose a relaxed conversation or a structured debate with timed turns.' },
] as const;

export function DebateSetup({ initial = DEFAULT_DEBATE_PREFERENCES, onStart }: Props) {
  const [preferences, setPreferences] = useState<DebatePreferences>(initial);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const next = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    onStart(preferences);
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-7 sm:px-6 sm:py-12">
      <header className="mb-6 sm:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Find the right conversation</p>
        <div className="mt-4 flex items-center justify-between gap-4 text-xs text-white/55">
          <span>Step {step + 1} of 4</span>
          <span>{current.label}</span>
        </div>
        <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Conversation setup progress">
          {['Topic', 'Language', 'Style', 'Devices'].map((label, index) => (
            <li key={label} aria-current={index === step ? 'step' : undefined} className="min-w-0">
              <div className={`h-1.5 rounded-full transition-colors duration-200 motion-reduce:transition-none ${index <= step ? 'bg-primary' : 'bg-white/15'}`} />
              <span className={`mt-2 hidden text-[11px] sm:block ${index === step ? 'font-semibold text-white' : 'text-white/40'}`}>
                {index < step ? '✓ ' : ''}{label}
              </span>
            </li>
          ))}
        </ol>
      </header>

      <form onSubmit={next} className="rounded-2xl border border-white/12 bg-[#111e1a] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.18)] sm:p-7">
        <div key={step} className="step-reveal min-h-[19rem] sm:min-h-[15rem]" aria-live="polite" aria-atomic="true">
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{current.heading}</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-white/55">{current.description}</p>
        </div>

        <fieldset className="mt-6">
          <legend className="sr-only">{current.label}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {step === 0 && DEBATE_TOPICS.map((topic) => (
              <ChoiceOption key={topic.value} name="topic" value={topic.value} title={topic.label}
                checked={preferences.topic === topic.value}
                onChange={() => setPreferences((previous) => ({ ...previous, topic: topic.value }))} />
            ))}
            {step === 1 && DEBATE_LANGUAGES.map((language) => (
              <ChoiceOption key={language.value} name="language" value={language.value} title={language.label}
                checked={preferences.language === language.value}
                onChange={() => setPreferences((previous) => ({ ...previous, language: language.value }))} />
            ))}
            {step === 2 && DEBATE_MODES.map((mode) => (
              <ChoiceOption key={mode.value} name="mode" value={mode.value} title={mode.label}
                description={mode.description}
                checked={preferences.mode === mode.value}
                onChange={() => setPreferences((previous) => ({ ...previous, mode: mode.value }))} />
            ))}
          </div>
        </fieldset>
        </div>

        <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-white/65 hover:bg-white/5 hover:text-white">
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>
          ) : <span className="text-xs text-white/40">You can change your choice anytime.</span>}

          <PrimaryButton type="submit" className="!w-auto min-w-32">
            {step === 2 ? <><Check size={16} aria-hidden="true" /> Check devices</> : <>Continue <ArrowRight size={16} aria-hidden="true" /></>}
          </PrimaryButton>
        </div>
      </form>
      <p className="mt-5 text-center text-xs text-white/40">
        Camera and microphone permissions are requested only during the final device check.
      </p>
    </main>
  );
}
