'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const authed = isAuthenticated();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    toast.success('You have been logged out.');
    setSidebarOpen(false);
  };

  const navLinkClass = (href) =>
    `relative px-2.5 py-1.5 transition-all duration-300 hover:text-primary hover:-translate-y-px
     ${pathname === href ? 'text-primary font-semibold' : 'text-white'}`;

  const sidebarLinkClass = (href) =>
    `flex items-center gap-3 px-4 py-3.5 rounded-xl text-[1rem] font-medium transition-all duration-200
     ${
       pathname === href
         ? 'bg-[rgba(0,191,166,0.15)] text-primary border border-[rgba(0,191,166,0.3)]'
         : 'text-white/80 hover:bg-white/5 hover:text-primary'
     }`;

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/rules', label: 'Rules' },
    ...(authed
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
      <header className="sticky top-0 z-50 border-b border-[rgba(0,191,166,0.25)] transition-all duration-300 bg-[rgba(10,24,22,0.9)] backdrop-blur-[14px] py-2">
        <div className="container flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <h1 className="font-bold text-primary text-xl">Debate</h1>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-5">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={navLinkClass(href)}>
                {label}
              </Link>
            ))}
            {authed && (
              <a
                href="#"
                onClick={handleLogout}
                className="relative px-2.5 py-1.5 text-white transition-all duration-300 hover:text-primary hover:-translate-y-px"
              >
                Logout
              </a>
            )}
          </nav>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[5px] rounded-lg
                       hover:bg-white/5 transition-colors"
            aria-label="Open menu"
          >
            <span className="block w-6 h-[2px] bg-white rounded-full transition-all duration-300" />
            <span className="block w-4 h-[2px] bg-primary rounded-full transition-all duration-300" />
            <span className="block w-6 h-[2px] bg-white rounded-full transition-all duration-300" />
          </button>
        </div>
      </header>

      {/* ── Mobile Sidebar ── */}

      {/* Backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden
          ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-[70] h-full w-[280px] flex flex-col
                    bg-[rgba(10,24,22,0.98)] border-l border-[rgba(0,191,166,0.2)]
                    shadow-[-8px_0_40px_rgba(0,0,0,0.5)]
                    transition-transform duration-300 ease-in-out md:hidden
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,191,166,0.15)]">
          <Link href="/" className="font-bold text-primary text-lg">
            Debate
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/60
                       hover:text-white hover:bg-white/10 transition-all duration-200 text-xl leading-none"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 flex flex-col gap-1.5 px-3 py-4 overflow-y-auto">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={sidebarLinkClass(href)}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-6 pt-2 border-t border-[rgba(0,191,166,0.15)]">
          {authed ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                         bg-[rgba(255,60,60,0.1)] border border-[rgba(255,60,60,0.25)]
                         text-red-400 font-medium transition-all duration-200
                         hover:bg-[rgba(255,60,60,0.2)] hover:text-red-300"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                         bg-primary text-[#111] font-bold transition-all duration-200
                         hover:bg-[#009e8a]"
            >
              Login
            </Link>
          )}
          <p className="text-center text-white/20 text-xs mt-4">
            © 2025 Islamic Debate Platform
          </p>
        </div>
      </aside>
    </>
  );
}
