'use client';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X } from 'lucide-react';
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
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    startTransition(() => {
      setSidebarOpen(false);
    });
  }, [pathname]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = async (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    await logout(); // clears the cookie on the server, then the local state
    toast.success('You have been logged out.');
    setSidebarOpen(false);
    router.push('/login');
  };

  const navLinkClass = (href: string) =>
    `nav-link pressable px-3 py-1.5 text-[0.95rem] transition-colors duration-200 hover:text-primary
     ${pathname === href ? 'active text-primary font-semibold' : 'text-white/80'}`;

  const sidebarLinkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-[1rem] font-medium transition-all duration-200
     ${
       pathname === href
         ? 'bg-primary/15 text-primary border border-primary/30'
         : 'text-white/80 hover:bg-white/5 hover:text-primary'
     }`;

  const navLinks = [
    ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: 'Admin' }] : []),
    { href: '/', label: 'Home' },
    { href: '/rules', label: 'Rules' },
    ...(user
      ? [
          { href: '/profile', label: 'Profile' },
          { href: '/video', label: 'Debate' },
        ]
      : [
          { href: '/register', label: 'Sign Up' },
          { href: '/login', label: 'Login' },
        ]),
  ];

  return (
    <>
      {/* ── Top bar: glass + hairline border ── */}
      <header className="glass sticky top-0 z-50 border-b border-white/[0.06]">
        <div className="max-container flex h-16 items-center justify-between">
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
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={navLinkClass(href)}>
                {label}
              </Link>
            ))}

            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="pressable ml-1 rounded-full border border-white/10 px-4 py-1.5 text-[0.9rem] text-white/70 transition-all duration-200 hover:border-red-400/30 hover:text-red-300"
              >
                Logout
              </button>
            )}
          </nav>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="pressable flex h-10 w-10 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/5 md:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {user?.lastWarningAt && <div role="status" className="border-b border-amber-300/20 bg-amber-300/10 px-4 py-3 text-center text-sm text-foreground">You have a conduct warning dated {new Date(user.lastWarningAt).toLocaleDateString()}. <Link href="/rules" className="font-semibold underline">Review debate rules</Link>.</div>}
      {/* ── Mobile Sidebar ── */}

      {/* Backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out md:hidden
          ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer — spring easing */}
      <aside
        className={`fixed top-0 right-0 z-[70] flex h-full w-[280px] flex-col
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
            className="pressable flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Links — staggered entrance */}
        <nav className="stagger flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={sidebarLinkClass(href)}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-white/[0.06] px-3 pt-3 pb-6">
          {user ? (
            <button
              onClick={handleLogout}
              className="pressable mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 font-medium text-red-400 transition-colors hover:bg-red-400/20 hover:text-red-300"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-[#06231e] transition-colors hover:bg-primary-hover"
            >
              Login
            </Link>
          )}

          <p className="mt-4 text-center text-xs text-white/25">
            © 2025 Islamic Debate Platform
          </p>
        </div>
      </aside>
    </>
  );
}
