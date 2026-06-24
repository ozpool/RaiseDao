'use client';

import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Mounts Lenis once at the root and drives its RAF loop. When the user prefers
 *  reduced motion we never instantiate it, so scrolling stays fully native. */
export function LenisProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis();
    let frame = 0;
    const raf = (time: number): void => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduced]);

  return <>{children}</>;
}
