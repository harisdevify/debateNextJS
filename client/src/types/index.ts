// Shared client-side types

/** Public user object returned by the API (never contains the password). */
export interface User {
  id: number;
  role: 'USER' | 'ADMIN';
  lastWarningAt?: string | null;
  fullname: string;
  email: string;
  gender: string;
  education: string;
  country: string;
  /** Avatar data URL, kept in the browser until the API stores it. */
  avatar?: string;
  /** null until the user accepted the rules / confirmed they are 18+ */
  acceptedRulesAt: string | null;
  ageConfirmedAt: string | null;
}

/** Fields the profile form can change (PATCH /auth/me). */
export interface ProfileFields {
  fullname: string;
  gender: string;
  education: string;
  country: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type DebateStatus =
  | 'starting'
  | 'searching'
  | 'idle'
  | 'connecting'
  | 'reconnecting'
  | 'connected'
  | 'peer-left'
  | 'blocked'
  | 'completed'
  | 'error';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'other';
}

export interface DebatePreferences {
  topic: 'religion' | 'science' | 'technology' | 'education' | 'everyday-life';
  language: 'ur' | 'en';
  mode: 'friendly' | 'formal';
}

export interface FormalDebateState {
  matchId: string;
  serverNow: number;
  startedAt: number;
  endsAt: number;
  turnEndsAt: number;
  turnNumber: number;
  isSpeaker: boolean;
  completed: boolean;
}

/** Error body returned by the API: { message } */
export interface ApiErrorBody {
  /** A single message, or a list for validation errors. */
  message?: string | string[];
}

/** Socket.IO events (server -> client) used by the debate room. */
export interface MatchedPayload {
  matchId: string;
  initiator: boolean;
  preferences?: DebatePreferences;
  peer?: { fullname?: string };
}
