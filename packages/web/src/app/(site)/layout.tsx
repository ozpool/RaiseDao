import type { ReactNode } from 'react';
import { Header } from '@/components/chrome/Header';
import { Footer } from '@/components/chrome/Footer';

/** Chrome for the marketing/product site. The isolated /lab bench lives outside
 *  this group, so it renders full-bleed with no header or footer. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}
