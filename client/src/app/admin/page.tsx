'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { PageState } from '@/components/ui/PageState';
export default function AdminPage() {
  const { user, loading, verificationError, retrySession } = useAuth();
  if (loading)
    return <PageState title="Checking access…" description="Verifying administrator permissions." />;
  if (verificationError) return <PageState status="alert" title="Could not verify administrator access" description="The authentication server may be unavailable. Your session has not been cleared." action={<button className="min-h-11 rounded-xl bg-primary px-5 text-background" onClick={() => void retrySession()}>Retry</button>} />;
  if (!user)
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Please log in</h1>
        <p className="my-4">An administrator account is required.</p>
        <Link href="/login" className="text-primary underline">
          Go to login
        </Link>
      </main>
    );
  if (user.role !== 'ADMIN')
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Admin access required</h1>
        <p className="my-4">This page is available to administrators only.</p>
        <Link href="/" className="text-primary underline">
          Back to home
        </Link>
      </main>
    );
  return <AdminPanel />;
}
