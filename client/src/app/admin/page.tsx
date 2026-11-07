'use client';
import Link from 'next/link';
import { LockKeyhole, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { PageState } from '@/components/ui/PageState';
import { LoadingShell } from '@/components/ui/LoadingShell';
import { StatusPage } from '@/components/ui/StatusPage';

export default function AdminPage() {
  const { user, loading, verificationError, retrySession } = useAuth();

  if (loading) return <LoadingShell label="Checking administrator access…" skeleton variant="admin" />;
  if (verificationError) return <PageState status="alert" title="Could not verify administrator access" description="The authentication server may be unavailable. Your session has not been cleared." action={<button type="button" className="min-h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-background" onClick={() => void retrySession()}>Retry</button>} />;
  if (!user) return <StatusPage eyebrow="401 · Sign in required" title="Sign in to continue" description="An administrator account is required to access the moderation workspace." icon={LockKeyhole} action={<Link href="/login" className="inline-flex min-h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-background">Sign in</Link>} />;
  if (user.role !== 'ADMIN') return <StatusPage eyebrow="403 · Access restricted" title="Admin access required" description="You do not have permission to view moderation reports or manage accounts." icon={ShieldAlert} />;
  return <AdminPanel />;
}
