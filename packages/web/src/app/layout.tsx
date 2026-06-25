import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { Web3Providers } from '@/components/providers/Web3Providers';
import { LenisProvider } from '@/components/providers/LenisProvider';

// Display face for oversized editorial headlines and the wordmark (UI.md §2).
// Variable woff2 self-hosted — one file covers the 200–700 weight axis.
const display = localFont({
  src: './fonts/ClashDisplay-Variable.woff2',
  variable: '--font-clash',
  weight: '200 700',
  display: 'swap',
});

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
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <Web3Providers>
          <LenisProvider>{children}</LenisProvider>
        </Web3Providers>
      </body>
    </html>
  );
}
