import type { ReactNode } from 'react';
import { Header } from '@/components/chrome/Header';
import { Footer } from '@/components/chrome/Footer';
import { SiteAtmosphere } from '@/components/sections/SiteAtmosphere';
import { CommandPalette } from '@/components/chrome/CommandPalette';
import { PageTransition } from '@/components/chrome/PageTransition';

/** Chrome for the marketing/product site. The isolated /lab bench lives outside
 *  this group, so it renders full-bleed with no header or footer. The cinematic
 *  atmosphere sits behind every page so the whole site reads as one living space;
 *  product pages place their content on solid panels so it stays legible on top. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteAtmosphere />
      <CommandPalette />
      <Header />
      <main id="main" tabIndex={-1}>
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </>
  );
}
