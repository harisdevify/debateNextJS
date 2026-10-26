'use client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

const primaryButton =
  'group pressable inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-[1rem] font-bold text-background transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[var(--shadow-glow)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0';

function Box({ children }: { children: ReactNode }) {
  return (
    <div className="mt-10 rounded-2xl border border-border bg-primary/5 p-6 text-center">
      {children}
    </div>
  );
}

/** The agreement box at the bottom of the rules page; adapts to the login state. */
export function AgreeToRules() {
  const { user, loading, acceptRules } = useAuth();
  const router = useRouter();
  const [rulesChecked, setRulesChecked] = useState(false);
  const [ageChecked, setAgeChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <Box>
        <div className="h-24" />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box>
        <p className="mb-5 text-sm leading-relaxed text-white/50">
          Create an account or log in to join debates. You will confirm the Code of Conduct and
          that you are 18 or older when you sign up.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className={primaryButton}>
            Sign Up
          </Link>
          <Link
            href="/login"
            className="pressable rounded-xl border border-white/10 px-8 py-3.5 text-[1rem] text-white/70 transition-colors hover:text-white"
          >
            Login
          </Link>
        </div>
      </Box>
    );
  }

  if (user.acceptedRulesAt && user.ageConfirmedAt) {
    return (
      <Box>
        <p className="mb-5 text-sm leading-relaxed text-white/50">
          You have accepted the Code of Conduct. Keep every debate respectful.
        </p>
        <Link href="/video" className={primaryButton}>
          Join Debate
          <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </Box>
    );
  }

  const handleAgree = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await acceptRules();
      router.push('/video');
    } catch {
      // the api interceptor already shows the error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <p className="mb-5 text-sm leading-relaxed text-white/50">
        Before your first debate, please confirm the two points below.
      </p>
      <div className="mx-auto mb-6 flex max-w-md flex-col gap-3 text-left">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={rulesChecked}
            onChange={(e) => setRulesChecked(e.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>I have read, understood and agree to follow the Code of Conduct above.</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={ageChecked}
            onChange={(e) => setAgeChecked(e.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>I confirm that I am 18 years old or older.</span>
        </label>
      </div>
      <button
        type="button"
        onClick={handleAgree}
        disabled={!rulesChecked || !ageChecked || saving}
        className={primaryButton}
      >
        {saving ? 'Saving…' : 'I Agree & Join Debate'}
        {!saving && (
          <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
        )}
      </button>
    </Box>
  );
}
