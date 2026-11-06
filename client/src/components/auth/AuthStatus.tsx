'use client';
import { useAuth } from '@/hooks/useAuth';

export function AuthStatus({ children }: { children: React.ReactNode }) {
  const { loading, verificationError, retrySession } = useAuth();
  if (loading) return <div role="status" className="mx-auto flex min-h-[45vh] max-w-md items-center justify-center px-5 text-center text-sm text-white/60">Checking your session…</div>;
  if (verificationError) return (
    <section role="alert" className="mx-auto my-16 max-w-md rounded-2xl border border-amber-400/25 bg-amber-400/5 p-6 text-center">
      <h2 className="text-lg font-semibold text-white">Could not verify your session</h2>
      <p className="mt-2 text-sm text-white/60">The server may be unreachable or your browser may be blocking cookies. Your session has not been cleared.</p>
      <button onClick={() => void retrySession()} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Retry connection</button>
    </section>
  );
  return <>{children}</>;
}
