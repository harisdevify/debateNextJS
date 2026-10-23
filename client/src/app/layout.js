import Header from '@/components/layout/Header';
import { Geist, Geist_Mono } from 'next/font/google';
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

export const metadata = {
  title: 'Debate — Islamic Discussion Platform',
  description:
    'Engage in respectful, guided Islamic debates through live video and text.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased scrollbar-thin`}
      >
        <Header />
        {children}
        {/* <Footer developer="M Haris" /> */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
