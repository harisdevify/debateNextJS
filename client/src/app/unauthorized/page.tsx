import { LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import { StatusPage } from '@/components/ui/StatusPage';

export default function UnauthorizedPage() {
  return <StatusPage eyebrow="401 · Sign in required" title="Sign in to continue" description="This page is only available to signed-in members." icon={LockKeyhole} action={<Link href="/login" className="inline-flex min-h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-background">Sign in</Link>} />;
}
