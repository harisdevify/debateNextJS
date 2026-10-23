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

// Name/gender/education/country are saved in the DB (PATCH /auth/me).
// The avatar has no DB column yet, so it stays in localStorage.
const OVERRIDES_KEY = 'debate:profile-overrides';
const OVERRIDE_FIELDS = ['avatar'];

const readOverrides = () => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = JSON.parse(localStorage.getItem(OVERRIDES_KEY)) || {};
    // ignore anything else an older version may have saved
    return Object.fromEntries(
      OVERRIDE_FIELDS.filter((k) => stored[k] !== undefined).map((k) => [
        k,
        stored[k],
      ])
    );
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

  const updateProfile = useCallback(async (fields) => {
    const res = await api.patch('/auth/me', fields);
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
