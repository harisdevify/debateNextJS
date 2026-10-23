'use client';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Camera,
  Edit3,
  Mail,
  MapPin,
  Mars,
  Save,
  ShieldCheck,
  User,
  Venus,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

const AVATAR_COLORS = [
  'from-[#00bfa6] to-[#007a6a]',
  'from-[#6366f1] to-[#4338ca]',
  'from-[#f59e0b] to-[#b45309]',
  'from-[#ec4899] to-[#be185d]',
  'from-[#3b82f6] to-[#1d4ed8]',
];

function getAvatarColor(name = '') {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i] ?? AVATAR_COLORS[0];
}

function getInitials(name = '') {
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

const inputClass = `w-full px-4 py-3 rounded-xl bg-white/[0.05] text-white border border-white/[0.08]
   placeholder:text-white/25 focus:outline-none focus:border-primary/60
   focus:bg-white/[0.07] transition-all duration-200`;

function ProfileContent() {
  const { getUser, saveUser } = useAuth();
  const storedUser = getUser();
  const [form, setForm] = useState({
    fullname: storedUser?.fullname || '',
    gender: storedUser?.gender || '',
    education: storedUser?.education || '',
    country: storedUser?.country || '',
  });
  const [avatarSrc, setAvatarSrc] = useState(storedUser?.avatar || null);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef(null);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarSrc(ev.target.result);
      saveUser({ ...storedUser, ...form, avatar: ev.target.result });
      toast.success('Profile picture updated!');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const unchanged =
      form.fullname === storedUser?.fullname &&
      form.gender === storedUser?.gender &&
      form.education === storedUser?.education &&
      form.country === storedUser?.country;

    if (unchanged) {
      toast.error('Nothing to save.');
      return;
    }
    saveUser({ ...storedUser, ...form });
    toast.success('Profile updated!');
    setEditing(false);
  };

  const avatarGrad = getAvatarColor(form.fullname);
  const initials = getInitials(form.fullname);

  const infoItems = [
    { icon: Mail, label: 'Email', value: storedUser?.email || '—' },
    {
      icon: form.gender === 'female' ? Venus : Mars,
      label: 'Gender',
      value: form.gender
        ? form.gender.charAt(0).toUpperCase() + form.gender.slice(1)
        : '—',
    },
    { icon: BookOpen, label: 'Education', value: form.education || '—' },
    { icon: MapPin, label: 'Country', value: form.country || '—' },
  ];

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <section className="relative flex-1 px-4 py-16">
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
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px]"
            style={{
              background:
                'radial-gradient(ellipse, rgba(0,191,166,0.1) 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-[900px] mx-auto">
          {/* ── TOP PROFILE CARD ── */}
          <div
            className="relative rounded-3xl overflow-hidden border border-white/[0.08] mb-6
                          bg-[rgba(10,24,22,0.85)]"
          >
            {/* Banner */}
            <div
              className="h-36 w-full"
              style={{
                background:
                  'linear-gradient(135deg, rgba(0,191,166,0.25) 0%, rgba(0,100,90,0.15) 50%, rgba(10,24,22,0.8) 100%)',
                backgroundImage:
                  'radial-gradient(rgba(0,191,166,0.15) 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
            />

            {/* Avatar + Name row */}
            <div className="px-7 pb-7">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14">
                {/* Avatar */}
                <div className="relative w-fit">
                  <div
                    className={`w-24 h-24 rounded-2xl border-4 border-[rgba(10,24,22,1)]
                                flex items-center justify-center overflow-hidden
                                bg-gradient-to-br ${avatarGrad} shadow-xl`}
                  >
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-black text-white">
                        {initials}
                      </span>
                    )}
                  </div>
                  {/* camera button */}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center
                               bg-primary text-[#0a0a0a] shadow-lg
                               transition-all duration-200 hover:scale-110 hover:shadow-[0_0_16px_rgba(0,191,166,0.5)]"
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* Name + badge */}
                <div className="flex-1 sm:pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-white leading-tight">
                      {form.fullname || 'Your Name'}
                    </h1>
                    <span
                      className="flex items-center gap-1 px-2.5 py-0.5 rounded-full
                                     bg-[rgba(0,191,166,0.12)] border border-[rgba(0,191,166,0.25)]
                                     text-primary text-xs font-semibold"
                    >
                      <ShieldCheck size={11} />
                      Verified Member
                    </span>
                  </div>
                  <p className="text-white/40 text-sm mt-1">
                    {form.education || 'No education set'} ·{' '}
                    {form.country || 'No country set'}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 sm:pb-1">
                  <button
                    type="button"
                    onClick={() => setEditing((p) => !p)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                                border transition-all duration-200
                                ${
                                  editing
                                    ? 'bg-white/10 border-white/20 text-white'
                                    : 'bg-[rgba(0,191,166,0.1)] border-[rgba(0,191,166,0.25)] text-primary hover:bg-[rgba(0,191,166,0.2)]'
                                }`}
                  >
                    <Edit3 size={14} />
                    {editing ? 'Cancel' : 'Edit Profile'}
                  </button>
                  <Link
                    href="/video"
                    className="group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
                               bg-primary text-[#0a0a0a] transition-all duration-200
                               hover:bg-[#00d4b8] hover:shadow-[0_0_20px_rgba(0,191,166,0.4)]"
                  >
                    <Video size={14} />
                    Debate
                    <ArrowRight
                      size={13}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── BOTTOM GRID: Info + Edit Form ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Info Card */}
            <div className="rounded-2xl border border-white/[0.07] bg-[rgba(10,24,22,0.8)] p-6">
              <h2 className="text-white font-bold text-[1rem] mb-5 flex items-center gap-2">
                <User size={16} className="stroke-primary" />
                Profile Details
              </h2>
              <div className="flex flex-col gap-3">
                {infoItems.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl
                               bg-white/[0.03] border border-white/[0.05]"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center
                                    bg-[rgba(0,191,166,0.1)] border border-[rgba(0,191,166,0.12)] shrink-0"
                    >
                      <Icon size={15} className="stroke-primary" />
                    </div>
                    <div>
                      <p className="text-white/35 text-[0.7rem] uppercase tracking-wider font-semibold">
                        {label}
                      </p>
                      <p className="text-white text-[0.9rem] font-medium leading-tight">
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Member since */}
              <div
                className="mt-5 flex items-center gap-2 px-4 py-3 rounded-xl
                              bg-[rgba(0,191,166,0.05)] border border-[rgba(0,191,166,0.12)]"
              >
                <Calendar size={14} className="stroke-primary/60 shrink-0" />
                <p className="text-white/35 text-xs">
                  Member since <span className="text-white/60">2025</span>
                </p>
              </div>
            </div>

            {/* Edit Form Card */}
            <div
              className={`rounded-2xl border bg-[rgba(10,24,22,0.8)] p-6 transition-all duration-300
                            ${editing ? 'border-[rgba(0,191,166,0.25)]' : 'border-white/[0.07]'}`}
            >
              <h2 className="text-white font-bold text-[1rem] mb-5 flex items-center gap-2">
                <Edit3 size={16} className="stroke-primary" />
                Edit Profile
                {!editing && (
                  <span className="text-white/25 text-xs font-normal ml-1">
                    — click &ldquo;Edit Profile&rdquo; to unlock
                  </span>
                )}
              </h2>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-white/50 text-xs uppercase tracking-wider font-semibold mb-1.5">
                    Full Name
                  </label>
                  <input
                    name="fullname"
                    type="text"
                    required
                    value={form.fullname}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    disabled={!editing}
                    className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                  />
                </div>

                <div>
                  <label className="block text-white/50 text-xs uppercase tracking-wider font-semibold mb-1.5">
                    Gender
                  </label>
                  <select
                    name="gender"
                    required
                    value={form.gender}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/50 text-xs uppercase tracking-wider font-semibold mb-1.5">
                    Education
                  </label>
                  <input
                    name="education"
                    type="text"
                    required
                    value={form.education}
                    onChange={handleChange}
                    placeholder="e.g. Islamic Studies"
                    disabled={!editing}
                    className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                  />
                </div>

                <div>
                  <label className="block text-white/50 text-xs uppercase tracking-wider font-semibold mb-1.5">
                    Country
                  </label>
                  <input
                    name="country"
                    type="text"
                    required
                    value={form.country}
                    onChange={handleChange}
                    placeholder="Enter your country"
                    disabled={!editing}
                    className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                  />
                </div>

                {editing && (
                  <button
                    type="submit"
                    className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-xl
                               bg-primary text-[#0a0a0a] font-bold text-[0.95rem]
                               transition-all duration-300
                               hover:bg-[#00d4b8] hover:shadow-[0_0_24px_rgba(0,191,166,0.4)]"
                  >
                    <Save size={16} />
                    Save Changes
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Auth gate ─────────────────────────────── */
export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return null;
  // ProfileContent seeds its form from the user on first render
  return <ProfileContent key={user.id} />;
}
