'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AdminPanel } from '@/components/admin/AdminPanel';
export default function AdminPage() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <main className="p-8" role="status">
        Checking access...
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
