export enum DebateTopic {
  RELIGION = 'religion',
  SCIENCE = 'science',
  TECHNOLOGY = 'technology',
  EDUCATION = 'education',
  EVERYDAY_LIFE = 'everyday-life',
}

export enum DebateLanguage {
  URDU = 'ur',
  ENGLISH = 'en',
}

export enum DebateMode {
  FRIENDLY = 'friendly',
  FORMAL = 'formal',
}

export const DEBATE_TOPICS = [
  { value: DebateTopic.RELIGION, label: 'Religion & beliefs' },
  { value: DebateTopic.SCIENCE, label: 'Science' },
  { value: DebateTopic.TECHNOLOGY, label: 'Technology & AI' },
  { value: DebateTopic.EDUCATION, label: 'Education' },
  { value: DebateTopic.EVERYDAY_LIFE, label: 'Everyday life' },
] as const;

export const DEBATE_LANGUAGES = [
  { value: DebateLanguage.URDU, label: 'Urdu' },
  { value: DebateLanguage.ENGLISH, label: 'English' },
] as const;

export const DEBATE_MODES = [
  {
    value: DebateMode.FRIENDLY,
    label: 'Friendly conversation',
    description: 'Share your views in an open, respectful conversation.',
  },
  {
    value: DebateMode.FORMAL,
    label: 'Structured debate',
    description: 'Take turns with equal time to explain your views.',
  },
] as const;
