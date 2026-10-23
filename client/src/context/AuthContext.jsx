'use client';
import api from '@/lib/api';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const AuthContext = createContext(null);

// Profile edits/avatar are not stored in the DB yet (no endpoint),
// so they live in localStorage until a PATCH /auth/me exists.
const OVERRIDES_KEY = 'debate:profile-overrides';
const OVERRIDE_FIELDS = ['fullname', 'gender', 'education', 'country', 'avatar'];

const readOverrides = () => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY)) || {};
  } catch {
    return {};
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Source of truth is the server: the cookie is httpOnly, so ask /auth/me.
  useEffect(() => {
    let active = true;
    api
      .get('/auth/me', { silent: true })
      .then((res) => active && setUser(res.data))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await api.post('/auth/login', credentials);
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

  const saveUser = useCallback((data) => {
    const next = {};
    OVERRIDE_FIELDS.forEach((key) => {
      if (data?.[key] !== undefined) next[key] = data[key];
    });
    localStorage.setItem(
      OVERRIDES_KEY,
      JSON.stringify({ ...readOverrides(), ...next })
    );
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, isAuthenticated, getUser, saveUser }),
    [user, loading, login, logout, isAuthenticated, getUser, saveUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
