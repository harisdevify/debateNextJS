'use client';
import api from '@/lib/api';
import { TextField } from '@/components/ui/TextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import {
  ArrowRight,
  BookOpen,
   Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';

const INITIAL = {
  fullname: '',
  gender: '',
  education: '',
  country: '',
  email: '',
  password: '',
};

const fields = [
  {
    name: 'fullname',
    label: 'Full Name',
    type: 'text',
    placeholder: 'Enter your full name',
    icon: User,
  },
  {
    name: 'education',
    label: 'Education',
    type: 'text',
    placeholder: 'e.g. Islamic Studies',
    icon: BookOpen,
  },
  {
    name: 'country',
    label: 'Country',
    type: 'text',
    placeholder: 'Enter your country',
    icon: MapPin,
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'Enter your email',
    icon: Mail,
  },
] as const;

const perks = [
  'Join live Islamic debates instantly',
  'Secure, moderated sessions',
  'Connect with scholars worldwide',
];

export default function SignUpPage() {
  const [form, setForm] = useState(INITIAL);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState({ acceptRules: false, confirmAge: false });
  const router = useRouter();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      const res = await api.post('/auth/register', { ...form, ...consent });
      if (res.status === 200 || res.status === 201) {
        toast.success('Account created successfully!');
        router.push('/login');
      }
    } catch (error) {
      // the api interceptor already shows the error toast
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full min-h-12 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-white outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25';

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
            className="absolute bottom-0 right-0 w-[400px] h-[400px]"
            style={{
              background:
                'radial-gradient(ellipse, rgba(0,191,166,0.05) 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative z-10 w-full max-w-[920px] grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ── LEFT PANEL ── */}
          <div className="hidden lg:flex flex-col justify-center gap-8 pr-6 stagger">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-5 rounded-full border border-[rgba(0,191,166,0.3)] bg-[rgba(0,191,166,0.08)] text-primary text-xs font-semibold uppercase tracking-wider">
                Get Started
              </div>
              <h2 className="text-[clamp(2rem,3.5vw,2.8rem)] font-black text-white leading-[1.15] mb-4">
                Join the Debate.
                <br />
                <span
                  className="text-primary"
                  style={{ textShadow: '0 0 30px rgba(0,191,166,0.35)' }}
                >
                  Make Your Voice Heard.
                </span>
              </h2>
              <p className="text-white/40 text-[0.95rem] leading-relaxed max-w-[340px]">
                Create your account and start engaging in structured, respectful
                Islamic discussions with scholars around the world.
              </p>
            </div>

            {/* Perks */}
            <div className="flex flex-col gap-3">
              {perks.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="stroke-primary shrink-0" />
                  <span className="text-white/55 text-sm">{p}</span>
                </div>
              ))}
            </div>

            {/* decorative card */}
            <div className="p-5 rounded-2xl border border-[rgba(0,191,166,0.15)] bg-[rgba(0,191,166,0.04)]">
              <p className="text-white/30 text-xs leading-relaxed italic">
                &ldquo;And of His signs is the creation of the heavens and earth and
                the diversity of your languages and your colors.&rdquo;
              </p>
              <p className="text-primary/50 text-xs mt-2 font-semibold">
                — Quran 30:22
              </p>
            </div>
          </div>

          {/* ── RIGHT PANEL — FORM ── */}
          <div className="rounded-3xl border border-white/[0.08] bg-[rgba(10,24,22,0.85)] p-8 backdrop-blur-sm fade-up d-2">
            <div className="mb-7">
              <h3 className="text-white font-black text-[1.5rem]">
                Create Account
              </h3>
              <p className="text-white/35 text-sm mt-1">
                Fill in your details to get started
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {fields.map(({ name, label, type, placeholder, icon: Icon }) => (
                <TextField key={name} label={label} icon={Icon} type={type} name={name} placeholder={placeholder} required value={form[name]} onChange={handleChange} autoComplete={name === 'email' ? 'email' : 'on'} />
              ))}

              {/* Gender */}
              <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider font-semibold mb-1.5">
                  Gender
                </label>
                <select
                  name="gender"
                  required
                  value={form.gender}
                  onChange={handleChange}
                  className={`${inputClass} pl-4`}
                >
                  <option value="" className="bg-[#0a0a0a]">
                    Select gender
                  </option>
                  <option value="male" className="bg-[#0a0a0a]">
                    Male
                  </option>
                  <option value="female" className="bg-[#0a0a0a]">
                    Female
                  </option>
                </select>
              </div>

              <TextField label="Password" icon={Lock} type={showPass ? 'text' : 'password'} name="password" autoComplete="new-password" placeholder="Create a strong password" required value={form.password} onChange={handleChange}
                trailing={<button type="button" onClick={() => setShowPass((value) => !value)} aria-label={showPass ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/60 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">{showPass ? <EyeOff size={17} /> : <Eye size={17} />}</button>} />

              {/* Rules + age confirmation (also enforced by the API) */}
              <div className="flex flex-col gap-3 pt-1">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-white/60">
                  <input
                    type="checkbox"
                    required
                    checked={consent.acceptRules}
                    onChange={(e) =>
                      setConsent((p) => ({ ...p, acceptRules: e.target.checked }))
                    }
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>
                    I have read and agree to the{' '}
                    <Link
                      href="/rules"
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      Code of Conduct
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-white/60">
                  <input
                    type="checkbox"
                    required
                    checked={consent.confirmAge}
                    onChange={(e) =>
                      setConsent((p) => ({ ...p, confirmAge: e.target.checked }))
                    }
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>I confirm that I am 18 years old or older.</span>
                </label>
              </div>

              <PrimaryButton type="submit" busy={loading} busyLabel="Creating account…">Create Account <ArrowRight size={18} aria-hidden="true" /></PrimaryButton>
            </form>

            <p className="mt-5 text-center text-white/30 text-sm">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-primary hover:text-[#00d4b8] transition-colors font-semibold"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
