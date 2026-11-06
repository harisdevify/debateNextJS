import type { DebatePreferences } from '@/types';

export const DEFAULT_DEBATE_PREFERENCES: DebatePreferences = {
  topic: 'religion',
  language: 'en',
  mode: 'friendly',
};

export const DEBATE_TOPICS = [
  { value: 'religion', label: 'Religion & beliefs' },
  { value: 'science', label: 'Science' },
  { value: 'technology', label: 'Technology & AI' },
  { value: 'education', label: 'Education' },
  { value: 'everyday-life', label: 'Everyday life' },
] as const;

export const DEBATE_LANGUAGES = [
  { value: 'ur', label: 'Urdu' },
  { value: 'en', label: 'English' },
] as const;

export const DEBATE_MODES = [
  { value: 'friendly', label: 'Friendly conversation', description: 'Open, respectful discussion.' },
  { value: 'formal', label: 'Structured debate', description: 'Choose a formal discussion style; timed turns are not available yet.' },
] as const;
