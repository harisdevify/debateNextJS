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
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { TextField } from '@/components/ui/TextField';
import { SelectField } from '@/components/ui/SelectField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PageState } from '@/components/ui/PageState';
import type { ProfileFields } from '@/types';

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


function ProfileContent() {
  const { getUser, saveUser, updateProfile } = useAuth();
  const storedUser = getUser();
  const [form, setForm] = useState<ProfileFields>({
    fullname: storedUser?.fullname || '',
    gender: storedUser?.gender || '',
    education: storedUser?.education || '',
    country: storedUser?.country || '',
  });
  const [avatarSrc, setAvatarSrc] = useState<string | null>(
    storedUser?.avatar || null
  );
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      toast.error('Choose an image smaller than 2 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result !== 'string') return;
      setAvatarSrc(result);
      saveUser({ avatar: result });
      toast.success('Profile picture updated!');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
    try {
      await updateProfile(form);
      toast.success('Profile updated!');
      setEditing(false);
    } catch {
      // the api interceptor already shows the error toast
    }
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

  const toggleEdit = () => {
    if (editing) {
      // Dismiss unsaved changes without changing the stored user profile.
      setForm({
        fullname: storedUser?.fullname || '',
        gender: storedUser?.gender || '',
        education: storedUser?.education || '',
        country: storedUser?.country || '',
      });
    }
    setEditing((current) => !current);
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary">Your account</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Profile</h1>
          <p className="mt-1 text-sm text-white/50">Manage your details and return to your conversations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/history" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-medium text-white/75 transition-colors hover:border-primary/30 hover:text-white">
            <Calendar size={15} aria-hidden="true" /> History
          </Link>
          <Link href="/video" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-background transition-colors hover:bg-primary-hover">
            <Video size={15} aria-hidden="true" /> Start debate <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <section aria-label="Account overview" className="flex flex-col gap-4 rounded-2xl border border-white/12 bg-[#111b19] p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <div className="relative w-fit shrink-0">
          <div className={`flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br ${avatarGrad} sm:size-24`}>
            {avatarSrc ? (
              // Avatar is a local data URL; next/image cannot optimize it.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt="Profile picture" className="size-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{initials}</span>
            )}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()}
            aria-label="Change profile picture" title="Change profile picture"
            className="absolute -bottom-2 -right-2 flex size-9 items-center justify-center rounded-lg border-2 border-[#111b19] bg-primary text-background transition-colors hover:bg-primary-hover">
            <Camera size={16} aria-hidden="true" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            aria-label="Upload profile picture" onChange={handleAvatarChange} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-xl font-semibold text-white sm:text-2xl">{form.fullname || 'Your name'}</h2>
          <p className="mt-1 break-all text-sm text-white/55">{storedUser?.email || '—'}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-1 text-xs font-medium text-primary">
            <ShieldCheck size={13} aria-hidden="true" /> Community member
          </span>
        </div>
        <button type="button" onClick={toggleEdit}
          aria-expanded={editing} aria-controls="profile-edit-form"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-white/15 px-3 text-sm font-semibold text-white/80 transition-colors hover:border-primary/35 hover:text-primary sm:self-center">
          <Edit3 size={15} aria-hidden="true" /> {editing ? 'Cancel editing' : 'Edit profile'}
        </button>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="profile-details-heading" className="min-w-0 rounded-2xl border border-white/12 bg-[#111b19] p-4 sm:p-5">
          <h2 id="profile-details-heading" className="flex items-center gap-2 text-base font-semibold text-white">
            <User size={17} className="text-primary" aria-hidden="true" /> Personal details
          </h2>
          <p className="mt-1 text-xs text-white/45">Information associated with your account.</p>
          <dl className="mt-4 divide-y divide-white/10">
            {infoItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-primary">
                  <Icon size={15} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-white/45">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-medium text-white/90">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="profile-form-heading" className={`min-w-0 rounded-2xl border bg-[#111b19] p-4 transition-colors sm:p-5 ${editing ? 'border-primary/35' : 'border-white/12'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="profile-form-heading" className="flex items-center gap-2 text-base font-semibold text-white">
                <Edit3 size={17} className="text-primary" aria-hidden="true" /> Edit details
              </h2>
              <p className="mt-1 text-xs leading-5 text-white/45">
                {editing ? 'Update your details below and save changes.' : 'Select Edit profile above to change your details.'}
              </p>
            </div>
            {!editing && <span className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-xs text-white/45">Read only</span>}
          </div>

          <form id="profile-edit-form" onSubmit={handleSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField label="Full Name" name="fullname" type="text" required value={form.fullname}
                onChange={handleChange} placeholder="Enter your full name" disabled={!editing} />
            </div>
            <SelectField label="Gender" name="gender" required value={form.gender}
              onChange={handleChange} disabled={!editing}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </SelectField>
            <TextField label="Education" name="education" type="text" required value={form.education}
              onChange={handleChange} placeholder="e.g. Islamic Studies" disabled={!editing} />
            <div className="sm:col-span-2">
              <TextField label="Country" name="country" type="text" required value={form.country}
                onChange={handleChange} placeholder="Enter your country" disabled={!editing} />
            </div>
            {editing && (
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4 sm:col-span-2">
                <PrimaryButton type="submit" className="!w-auto min-w-32"><Save size={15} aria-hidden="true" /> Save changes</PrimaryButton>
                <button type="button" onClick={toggleEdit} className="min-h-10 rounded-lg border border-white/15 px-3 text-sm font-medium text-white/70 hover:bg-white/5">Cancel</button>
              </div>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}

/* ── Auth gate ─────────────────────────────── */
export default function ProfilePage() {
  const { user, loading, verificationError, retrySession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !verificationError && !user) router.replace('/login');
  }, [loading, verificationError, user, router]);

  if (loading) return <PageState title="Checking your session…" />;
  if (verificationError) return <PageState status="alert" title="Could not verify your session" description="Check your connection, then retry." action={<button onClick={() => void retrySession()} className="min-h-11 rounded-xl bg-primary px-5 text-background">Retry connection</button>} />;
  if (!user) return null;
  // ProfileContent seeds its form from the user on first render
  return <ProfileContent key={user.id} />;
}
