import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import { AuthProvider } from '@/context/AuthContext';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Debate — Islamic Discussion Platform',
  description:
    'Engage in respectful, guided Islamic debates through live video and text.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased scrollbar-thin flex min-h-screen flex-col`}
      >
        <AuthProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-background">Skip to main content</a>
          <Header />
          <main id="main-content" className="min-w-0 flex-1">{children}</main>
          <Footer developer="M Haris" />
        </AuthProvider>
        <Toaster
          richColors
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(13, 22, 20, 0.92)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
              color: '#f5f7f6',
            },
          }}
        />
      </body>
    </html>
  );
}
