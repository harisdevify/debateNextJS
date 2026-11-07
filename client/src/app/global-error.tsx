'use client';
import { RotateCcw } from 'lucide-react';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body className="flex min-h-screen items-center justify-center bg-[#070b0a] px-4 font-sans text-[#f5f7f6]">
    <main className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111b19] p-8 text-center">
      <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl border border-[#00d9bd]/25 bg-[#00d9bd]/10 text-[#00d9bd]"><RotateCcw size={23} /></div>
      <h1 className="text-xl font-semibold">We hit an unexpected error</h1>
      <p className="mt-2 text-sm leading-6 text-white/60">The application could not recover automatically. Please try again.</p>
      <button type="button" onClick={() => reset()} className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#00d9bd] px-5 text-sm font-semibold text-[#070b0a]">Try again</button>
    </main>
  </body></html>;
}
