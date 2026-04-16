import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import React from 'react';
import './globals.css';
import QueryProvider from '../components/QueryProvider';
import { Analytics } from '@vercel/analytics/next';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'xolto — Used electronics copilot',
  description:
    'Buy used electronics without overpaying. xolto scans listings, estimates fair value, flags risks, and guides seller outreach.',
};

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.className}>
      <body>
        <QueryProvider>{children}</QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
