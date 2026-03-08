'use client';
import api from '@/lib/api';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
];

const perks = [
  'Join live Islamic debates instantly',
  'Secure, moderated sessions',
  'Connect with scholars worldwide',
];

export default function SignUpPage() {
  const [form, setForm] = useState(INITIAL);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      if (loading) return;
      const res = await api.post('/auth/register', form);
      if (res.status === 200 || res.status === 201) {
        toast.success('Account created successfully!');
        router.push('/login');
      }
    } catch (error) {
      toast.error(error.response?.data);
      console.error(error.response);
    } finally {
      setLoading(false);
    }
  };

  const inputWrap = 'relative';
  const iconClass =
    'absolute left-3.5 top-1/2 -translate-y-1/2 stroke-white/25 pointer-events-none';
  const inputClass = `w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] text-white border border-white/[0.08] placeholder:text-white/20 focus:outline-none focus:border-primary/60 focus:bg-white/[0.07] transition-all duration-200`;

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
          <div className="hidden lg:flex flex-col justify-center gap-8 pr-6">
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
                "And of His signs is the creation of the heavens and earth and
                the diversity of your languages and your colors."
              </p>
              <p className="text-primary/50 text-xs mt-2 font-semibold">
                — Quran 30:22
              </p>
            </div>
          </div>

          {/* ── RIGHT PANEL — FORM ── */}
          <div className="rounded-3xl border border-white/[0.08] bg-[rgba(10,24,22,0.85)] p-8 backdrop-blur-sm">
            <div className="mb-7">
              <h3 className="text-white font-black text-[1.5rem]">
                Create Account
              </h3>
              <p className="text-white/35 text-sm mt-1">
                Fill in your details to get started
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Text fields */}
              {fields.map(({ name, label, type, placeholder, icon: Icon }) => (
                <div key={name}>
                  <label className="block text-white/50 text-xs uppercase tracking-wider font-semibold mb-1.5">
                    {label}
                  </label>
                  <div className={inputWrap}>
                    <Icon size={15} className={iconClass} />
                    <input
                      type={type}
                      name={name}
                      placeholder={placeholder}
                      required
                      value={form[name]}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>
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

              {/* Password */}
              <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider font-semibold mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className={iconClass} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    placeholder="Create a strong password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-primary transition-colors duration-200"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group mt-2 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-[#0a0a0a] font-bold text-[1rem] transition-all duration-300 hover:bg-[#00d4b8] hover:shadow-[0_0_28px_rgba(0,191,166,0.45)] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a] animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  <>
                    Create Account
                    <ArrowRight
                      size={17}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
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
