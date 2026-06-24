import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { LenisProvider } from '@/components/providers/LenisProvider';
import { Header } from '@/components/chrome/Header';
import { Footer } from '@/components/chrome/Footer';

// Self-hosted at build time (zero layout shift, no external request at runtime).
const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RaiseDAO — milestone-gated crowdfunding',
  description:
    'Funds release tranche by tranche, only when investors vote each milestone through. Fail a milestone and the rest refunds pro rata.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <LenisProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </LenisProvider>
      </body>
    </html>
  );
}
