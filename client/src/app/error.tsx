'use client';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { StatusPage } from '@/components/ui/StatusPage';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StatusPage eyebrow="Unexpected error" title="Something went wrong" description="This page couldn't load. Your account and existing debates have not been changed." icon={AlertCircle} action={
    <button type="button" onClick={() => reset()} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-background hover:bg-primary-hover"><RotateCcw size={15} /> Try again</button>
  } />;
}
