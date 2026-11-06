'use client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
export function DebateCTA({ className = '', label }: { className?: string; label?: string }) {
  const { user, loading, verificationError } = useAuth();
  const destination = loading || verificationError ? '/login' : user
    ? user.acceptedRulesAt && user.ageConfirmedAt ? '/video' : '/rules'
    : '/login';
  const text = label ?? (loading ? 'Checking session…' : user ? 'Join a Debate' : 'Login to Start Debating');
  return (
    <Link href={destination} aria-disabled={loading || verificationError} tabIndex={loading || verificationError ? -1 : undefined}
      className={`${className} ${loading || verificationError ? 'pointer-events-none opacity-60' : ''}`}>
      {text}<ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}
