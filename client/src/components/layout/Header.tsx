'use client';
import { useAuth } from '@/hooks/useAuth';
import { AppModal } from '@/components/ui/AppModal';
import { AlertTriangle, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useEffect,
  useState,
  useTransition,
  type MouseEvent,
} from 'react';
import { toast } from 'sonner';

export default function Header() {
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { user, logout, loading, verificationError } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // The active debate page already provides the debate flow and its controls.
  const isDebatePage = pathname === '/video' || pathname.startsWith('/video/');

  // Close sidebar on route change
  useEffect(() => {
    startTransition(() => {
      setSidebarOpen(false);
    });
  }, [pathname]);

  // Allow closing the mobile drawer from the keyboard.
  useEffect(() => {
    if (!sidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [sidebarOpen]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    setSidebarOpen(false);
    setLogoutOpen(true);
  };

  const confirmLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      setLogoutOpen(false);
      toast.success('You have been logged out.');
      router.push('/login');
    } catch {
      toast.error('Could not log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const navLinkClass = (href: string) =>
    `nav-link pressable min-h-9 inline-flex items-center rounded-lg px-2.5 py-1.5 text-[0.875rem] transition-colors duration-200 hover:text-primary
     ${pathname === href ? 'active text-primary font-semibold' : 'text-white/80'}`;

  const sidebarLinkClass = (href: string) =>
    `flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-xl text-[0.95rem] font-medium transition-all duration-200
     ${
       pathname === href
         ? 'bg-primary/15 text-primary border border-primary/30'
         : 'text-white/80 hover:bg-white/5 hover:text-primary'
     }`;

  const navLinks = [
    ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: 'Admin' }] : []),
    { href: '/', label: 'Home' },
    { href: '/rules', label: 'Rules' },
    ...(loading || verificationError
      ? []
      : user
      ? [
          { href: '/profile', label: 'Profile' },
          { href: '/history', label: 'History' },
          ...(!isDebatePage ? [{ href: '/video', label: 'Debate' }] : []),
        ]
      : [
          { href: '/register', label: 'Sign Up' },
          { href: '/login', label: 'Login' },
        ]),
  ];

  return (
    <>
      <AppModal open={logoutOpen} onClose={() => setLogoutOpen(false)} closeDisabled={loggingOut} title="Log out?" description="Are you sure you want to log out of your account?" size="sm" footer={
        <>
          <button type="button" disabled={loggingOut} onClick={() => setLogoutOpen(false)} className="min-h-9 rounded-lg border border-white/15 px-4 text-sm font-medium text-white/75 hover:bg-white/5">Cancel</button>
          <button type="button" disabled={loggingOut} onClick={() => void confirmLogout()} className="min-h-9 rounded-lg bg-red-500/90 px-4 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">{loggingOut ? 'Logging out…' : 'Log out'}</button>
        </>
      }>
        <p className="text-sm leading-6 text-white/65">You can sign back in at any time.</p>
      </AppModal>
      {/* ── Top bar: glass + hairline border ── */}
      <header className="glass sticky top-0 z-50 border-b border-white/10">
        <div className="max-container flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="pressable flex items-center gap-2.5"
            aria-label="Debate home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-primary-dark shadow-[0_4px_16px_rgba(0,217,189,0.35)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#06231e]" />
            </span>
            <span className="text-xl font-bold tracking-tight text-white">
              Debate
              <span className="text-primary">.</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={href === '/video' ? 'ml-2 inline-flex min-h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-background transition-colors hover:bg-primary-hover' : navLinkClass(href)}>
                {label}
              </Link>
            ))}

            {!loading && user && (
              <button
                type="button"
                onClick={handleLogout}
                className="pressable ml-1 min-h-9 rounded-lg border border-white/10 px-3 py-1.5 text-[0.875rem] text-white/70 transition-all duration-200 hover:border-red-400/30 hover:text-red-300"
              >
                Logout
              </button>
            )}
          </nav>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="pressable flex size-11 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-primary/40 md:hidden"
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
            aria-controls="mobile-navigation"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {user?.lastWarningAt && (
        <div role="status" className="border-b border-amber-400/20 bg-amber-400/[0.07]">
          <div className="max-container flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 text-sm">
            <AlertTriangle size={16} className="shrink-0 text-amber-300" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-amber-100/85">
              Conduct warning · {new Date(user.lastWarningAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            <Link href="/rules" className="inline-flex min-h-9 items-center rounded-md px-2 font-semibold text-amber-200 underline underline-offset-4 hover:text-amber-100">
              Review debate rules
            </Link>
          </div>
        </div>
      )}
      {/* ── Mobile Sidebar ── */}

      {/* Backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out md:hidden
          ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer — spring easing */}
      <aside
        id="mobile-navigation"
        aria-label="Mobile navigation"
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen}
        className={`fixed top-0 right-0 z-[70] flex h-dvh w-[min(320px,calc(100vw-2rem))] flex-col
                    border-l border-white/[0.08] bg-[#0a1210]/95 backdrop-blur-xl
                    shadow-[-8px_0_40px_rgba(0,0,0,0.5)]
                    transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <span className="text-lg font-bold text-white">
            Debate<span className="text-primary">.</span>
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="pressable flex size-11 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Links — staggered entrance */}
        <nav className="stagger flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={sidebarLinkClass(href)} onClick={() => setSidebarOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-white/[0.06] px-3 pt-3 pb-6">
          {loading || verificationError ? (
            <span role="status" className="block px-4 py-3 text-center text-sm text-white/60">Checking session…</span>
          ) : user ? (
            <button
              onClick={handleLogout}
              className="pressable mb-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2.5 font-medium text-red-400 transition-colors hover:bg-red-400/20 hover:text-red-300"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="pressable flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 font-bold text-[#06231e] transition-colors hover:bg-primary-hover"
            >
              Login
            </Link>
          )}

          <p className="mt-4 text-center text-xs text-white/25">
            Islamic Debate Platform
          </p>
        </div>
      </aside>
    </>
  );
}
