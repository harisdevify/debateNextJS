'use client';
import { useAuth } from '@/hooks/useAuth';
import { TextField } from '@/components/ui/TextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';

const highlights = [
  { icon: ShieldCheck, text: 'Fully moderated sessions' },
  { icon: Users, text: '2,400+ active debaters' },
  { icon: Zap, text: 'Join a debate in seconds' },
];

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, user, loading: authLoading, verificationError } = useAuth();
  useEffect(() => {
    if (!authLoading && user) router.replace('/profile');
  }, [authLoading, user, router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // router push ke alawa, use api call only
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      await login(form);
      toast.success('Login successfully!');
      router.replace('/profile');
      router.refresh();
    } catch {
      // the api interceptor already shows the error toast
    } finally {
      setLoading(false);
    }
  };

 
  if (authLoading || user) return <div role="status" className="flex min-h-[50vh] items-center justify-center text-sm text-white/60">Checking your session…</div>;
   return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <section className="relative flex-1 flex items-center justify-center px-4 py-16">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px]"
            style={{
              background:
                'radial-gradient(ellipse, rgba(0,191,166,0.1) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px]"
            style={{
              background:
                'radial-gradient(ellipse, rgba(0,191,166,0.05) 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative z-10 w-full max-w-[860px] grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* form panel enters second, slightly later */}
          {/* ── LEFT PANEL ── */}
          <div className="hidden lg:flex flex-col gap-8 pr-6 stagger">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-5 rounded-full
                              border border-[rgba(0,191,166,0.3)] bg-[rgba(0,191,166,0.08)]
                              text-primary text-xs font-semibold uppercase tracking-wider"
              >
                Welcome Back
              </div>
              <h2 className="text-[clamp(2rem,3.5vw,2.8rem)] font-black text-white leading-[1.15] mb-4">
                Continue the{' '}
                <span
                  className="text-primary"
                  style={{ textShadow: '0 0 30px rgba(0,191,166,0.35)' }}
                >
                  Conversation.
                </span>
              </h2>
              <p className="text-white/40 text-[0.95rem] leading-relaxed max-w-[340px]">
                Log back in and pick up where you left off. Your debates, your
                profile, your voice — all waiting for you.
              </p>
            </div>

            {/* Highlights */}
            <div className="flex flex-col gap-3">
              {highlights.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                                  bg-[rgba(0,191,166,0.1)] border border-[rgba(0,191,166,0.15)]"
                  >
                    <Icon size={15} className="stroke-primary" />
                  </div>
                  <span className="text-white/50 text-sm">{text}</span>
                </div>
              ))}
            </div>

            {/* Quote */}
            <div className="p-5 rounded-2xl border border-[rgba(0,191,166,0.15)] bg-[rgba(0,191,166,0.04)]">
              <p className="text-white/30 text-xs leading-relaxed italic">
                &ldquo;Invite to the way of your Lord with wisdom and good
                instruction, and argue with them in a way that is best.&rdquo;
              </p>
              <p className="text-primary/50 text-xs mt-2 font-semibold">
                — Quran 16:125
              </p>
            </div>
          </div>

          {/* ── RIGHT PANEL — FORM ── */}
          <div className="rounded-3xl border border-white/[0.08] bg-[rgba(10,24,22,0.85)] p-8 backdrop-blur-sm fade-up d-2">
            <div className="mb-7">
              <h3 className="text-white font-black text-[1.5rem]">Login</h3>
              <p className="text-white/35 text-sm mt-1">
                Enter your credentials to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <TextField label="Email" icon={Mail} type="email" name="email" autoComplete="email" placeholder="Enter your email" required value={form.email} onChange={handleChange} />
              <TextField label="Password" icon={Lock} type={showPass ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Enter your password" required value={form.password} onChange={handleChange}
                trailing={<button type="button" onClick={() => setShowPass((value) => !value)} aria-label={showPass ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/60 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">{showPass ? <EyeOff size={17} /> : <Eye size={17} />}</button>} />
              {verificationError && <p role="status" className="text-sm text-amber-300">Session verification failed. You can still try signing in.</p>}
              {/* Submit */}
              <PrimaryButton type="submit" busy={loading} busyLabel="Logging in…">Login <ArrowRight size={18} aria-hidden="true" /></PrimaryButton>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <span className="text-white/20 text-xs">or</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* Register CTA */}
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                         border border-white/[0.08] bg-white/[0.03] text-white/60 text-sm font-medium
                         transition-all duration-200 hover:bg-white/[0.06] hover:text-white hover:border-white/[0.14]"
            >
              Don&apos;t have an account? Sign up
            </Link>

            <p className="mt-4 text-center text-white/20 text-xs">
              By continuing you agree to our{' '}
              <Link
                href="/rules"
                className="text-primary/60 hover:text-primary transition-colors"
              >
                Code of Conduct
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
