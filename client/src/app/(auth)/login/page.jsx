'use client';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../hooks/useAuth';

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const { login } = useAuth();
  const router = useRouter();

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const ok = login(form.email, form.password);
    if (ok) {
      toast.success('Welcome to Islamic Debate.');
      setTimeout(() => router.push('/'), 1000);
    } else {
      toast.error('Invalid email or password.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <section className="flex-1 flex items-center justify-center py-[60px] px-4">
        <div
          className="bg-[rgba(10,24,22,0.95)] p-[30px] rounded-[10px] w-full max-w-[500px]
                     border border-[#333]"
        >
          <h2 className="text-center text-primary text-[1.6rem] font-bold mb-5">
            Login to Your Account
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1">
            <label className="text-[#ccc] font-medium mt-3">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2.5 mt-1 rounded-md bg-[#2a2a2a] text-white border-transparent
                         focus:outline-none focus:border focus:border-primary transition-colors"
            />

            <label className="text-[#ccc] font-medium mt-3">Password</label>
            <div className="relative mt-1">
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                required
                value={form.password}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-md bg-[#2a2a2a] text-white border-transparent
                           focus:outline-none focus:border focus:border-primary transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-primary transition-colors"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full mt-5 py-3 rounded-md bg-primary text-[#111] font-bold text-[1.05rem]
                         shadow-[0_6px_15px_rgba(0,191,166,0.35)] transition-all duration-300
                         hover:bg-primary-hover hover:text-white hover:shadow-[0_8px_20px_rgba(0,191,166,0.5)]"
            >
              Login
            </button>
          </form>

          <p className="mt-4 text-center text-[#ccc] text-sm">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up here
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
