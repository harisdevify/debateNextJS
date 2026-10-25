'use client';
import api from '@/lib/api';
import type { LoginCredentials, ProfileFields, User } from '@/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface AuthContextValue {
  user: User | null;
  /** true until the first /auth/me check has finished */
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (fields: ProfileFields) => Promise<User>;
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

const readOverrides = (): Overrides => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = JSON.parse(
      localStorage.getItem(OVERRIDES_KEY) ?? '{}'
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

  // Source of truth is the server: the cookie is httpOnly, so ask /auth/me.
  useEffect(() => {
    let active = true;
    api
      .get<User>('/auth/me', { silent: true })
      .then((res) => active && setUser(res.data))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await api.post<User>('/auth/login', credentials);
    setUser(res.data);
    return res.data;
  }, []);

  const updateProfile = useCallback(async (fields: ProfileFields) => {
    const res = await api.patch<User>('/auth/me', fields);
    setUser(res.data);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', null, { silent: true });
    } finally {
      setUser(null);
    }
  }, []);

  // ── helpers used by the profile page ──
  const isAuthenticated = useCallback(() => !!user, [user]);

  const getUser = useCallback(
    () => (user ? { ...user, ...readOverrides() } : null),
    [user]
  );

  const saveUser = useCallback((data: Partial<User>) => {
    const next: Overrides = {};
    for (const key of OVERRIDE_FIELDS) {
      if (data[key] !== undefined) next[key] = data[key];
    }
    localStorage.setItem(
      OVERRIDES_KEY,
      JSON.stringify({ ...readOverrides(), ...next })
    );
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      updateProfile,
      isAuthenticated,
      getUser,
      saveUser,
    }),
    [
      user,
      loading,
      login,
      logout,
      updateProfile,
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
