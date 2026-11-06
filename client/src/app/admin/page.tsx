'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AdminPanel } from '@/components/admin/AdminPanel';
export default function AdminPage() {
  const { user, loading, verificationError, retrySession } = useAuth();
  if (loading)
    return (
      <main className="p-8" role="status">
        Checking access...
      </main>
    );
  if (verificationError) return (
    <main role="alert" className="mx-auto my-16 max-w-md rounded-xl border border-amber-400/25 p-6 text-center text-white/80">
      <h1 className="text-lg font-semibold">Could not verify administrator access</h1>
      <p className="mt-2 text-sm text-white/60">The authentication server may be unavailable. Your session has not been cleared.</p>
      <button className="mt-4 rounded-lg bg-primary px-4 py-2 text-background" onClick={() => void retrySession()}>Retry</button>
    </main>
  );
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
