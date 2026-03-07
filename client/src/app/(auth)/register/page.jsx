'use client';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../hooks/useAuth';

const INITIAL = {
  fullname: '',
  gender: '',
  education: '',
  country: '',
  email: '',
  password: '',
};

export default function SignUpPage() {
  const [form, setForm] = useState(INITIAL);
  const [showPass, setShowPass] = useState(false);
  const { saveUser } = useAuth();
  const router = useRouter();

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    saveUser(form);
    toast.success('Account created successfully!');
    setTimeout(() => router.push('/login'), 1000);
  };

  const inputClass =
    'w-full px-3 py-2.5 mt-1 rounded-md bg-[#2a2a2a] text-white border-transparent focus:outline-none focus:border focus:border-primary transition-colors';

  return (
    <div className="flex flex-col min-h-screen">
      <section className="flex-1 flex items-center justify-center py-[60px] px-4">
        <div className="bg-[rgba(10,24,22,0.95)] p-[30px] rounded-[10px] w-full max-w-[500px] border border-[#333]">
          <h2 className="text-center text-primary text-[1.6rem] font-bold mb-5">
            Create an Account
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1">
            {[
              {
                label: 'Full Name',
                name: 'fullname',
                type: 'text',
                placeholder: 'Enter your full name',
              },
              {
                label: 'Education',
                name: 'education',
                type: 'text',
                placeholder: 'Enter your education',
              },
              {
                label: 'Country',
                name: 'country',
                type: 'text',
                placeholder: 'Enter your country',
              },
              {
                label: 'Email',
                name: 'email',
                type: 'email',
                placeholder: 'Enter your email',
              },
            ].map(({ label, name, type, placeholder }) => (
              <div key={name}>
                <label className="text-[#ccc] font-medium mt-3 block">
                  {label}
                </label>
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
            ))}

            <label className="text-[#ccc] font-medium mt-3 block">Gender</label>
            <select
              name="gender"
              required
              value={form.gender}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            <label className="text-[#ccc] font-medium mt-3 block">
              Password
            </label>
            <div className="relative mt-1">
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                placeholder="Create a password"
                required
                value={form.password}
                onChange={handleChange}
                className={`${inputClass} pr-10`}
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
                         hover:bg-primary-hover hover:text-white"
            >
              Sign Up
            </button>
          </form>

          <p className="mt-4 text-center text-[#ccc] text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
