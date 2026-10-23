'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// NOTE: rewritten for Next.js — the previous version used react-router-dom's
// <Navigate>, which does not exist in Next.js and would crash the app.
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const authed = isAuthenticated();

  useEffect(() => {
    if (!authed) router.replace('/login');
  }, [authed, router]);

  if (!authed) return null;

  return children;
}
