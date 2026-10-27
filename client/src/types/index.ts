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
  | 'connecting'
  | 'reconnecting'
  | 'connected'
  | 'peer-left'
  | 'blocked'
  | 'error';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'other';
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
  peer?: { fullname?: string };
}
