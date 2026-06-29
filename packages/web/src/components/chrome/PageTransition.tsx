'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Fades + lifts each route in on navigation. Re-keying on the pathname replays
 *  the CSS entrance (defined in globals) whenever the route changes, so pages
 *  don't hard-cut. Reduced motion collapses the animation via the global CSS net. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
