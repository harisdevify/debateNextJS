'use client';
import api from '@/lib/api';
import type { LoginCredentials, ProfileFields, User } from '@/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface AuthContextValue {
  user: User | null;
  /** true until the first /auth/me check has finished */
  loading: boolean;
  /** Initial auth could not be verified due to network/server failure. */
  verificationError: boolean;
  retrySession: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (fields: ProfileFields) => Promise<User>;
  /** Accept the rules and confirm 18+ (accounts created before the rules existed). */
  acceptRules: () => Promise<User>;
  isAuthenticated: () => boolean;
  getUser: () => User | null;
  saveUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Name/gender/education/country are saved in the DB (PATCH /auth/me).
// The avatar has no DB column yet, so it stays in localStorage.
const OVERRIDES_KEY = 'debate:profile-overrides';
const OVERRIDE_FIELDS = ['avatar'] as const;

type Overrides = Partial<Pick<User, (typeof OVERRIDE_FIELDS)[number]>>;

const readOverrides = (userId: number): Overrides => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = JSON.parse(
      localStorage.getItem(`${OVERRIDES_KEY}:${userId}`) ?? '{}'
    ) as Overrides;
    // ignore anything else an older version may have saved
    const result: Overrides = {};
    for (const key of OVERRIDE_FIELDS) {
      if (stored[key] !== undefined) result[key] = stored[key];
    }
    return result;
  } catch {
    return {};
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationError, setVerificationError] = useState(false);
  // Prevent an earlier /auth/me response from replacing a newer login.
  const authVersion = useRef(0);
  const verifySession = useCallback(async () => {
    const version = ++authVersion.current;
    setLoading(true);
    setVerificationError(false);
    try {
      const response = await api.get<User>('/auth/me', { silent: true });
      if (authVersion.current === version) setUser(response.data);
    } catch (error) {
      if (authVersion.current !== version) return;
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) setUser(null);
      else setVerificationError(true);
    } finally {
      if (authVersion.current === version) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void verifySession();
    return () => { authVersion.current++; };
  }, [verifySession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await api.post<User>('/auth/login', credentials);
    authVersion.current++;
    setUser(res.data);
    setVerificationError(false);
    setLoading(false);
    return res.data;
  }, []);

  const updateProfile = useCallback(async (fields: ProfileFields) => {
    const res = await api.patch<User>('/auth/me', fields);
    setUser(res.data);
    return res.data;
  }, []);

  const acceptRules = useCallback(async () => {
    const res = await api.post<User>('/auth/accept-rules', {
      acceptRules: true,
      confirmAge: true,
    });
    setUser(res.data);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', null, { silent: true });
    } finally {
      authVersion.current++;
      setUser(null);
      setVerificationError(false);
      setLoading(false);
    }
  }, []);

  // ── helpers used by the profile page ──
  const isAuthenticated = useCallback(() => !!user, [user]);

  const getUser = useCallback(
    () => (user ? { ...user, ...readOverrides(user.id) } : null),
    [user]
  );

  const saveUser = useCallback((data: Partial<User>) => {
    if (!user) return;
    const next: Overrides = {};
    for (const key of OVERRIDE_FIELDS) {
      if (data[key] !== undefined) next[key] = data[key];
    }
    localStorage.setItem(
      `${OVERRIDES_KEY}:${user.id}`,
      JSON.stringify({ ...readOverrides(user.id), ...next })
    );
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      verificationError,
      retrySession: verifySession,
      login,
      logout,
      updateProfile,
      acceptRules,
      isAuthenticated,
      getUser,
      saveUser,
    }),
    [
      user,
      loading,
      verificationError,
      verifySession,
      login,
      logout,
      updateProfile,
      acceptRules,
      isAuthenticated,
      getUser,
      saveUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
