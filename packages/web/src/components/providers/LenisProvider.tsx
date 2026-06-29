'use client';

import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Mounts Lenis once at the root and drives it from GSAP's ticker — a single RAF
 *  loop shared with ScrollTrigger, so the smooth scroll and the journey's
 *  scrubbing never fight over two schedulers (the cause of micro-jank). A gentle
 *  lerp keeps it smooth without feeling floaty. Reduced motion: never instantiate,
 *  scrolling stays fully native. */
export function LenisProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, touchMultiplier: 1.2 });
    lenis.on('scroll', ScrollTrigger.update);

    const onTick = (time: number) => lenis.raf(time * 1000); // gsap ticker is in seconds
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, [reduced]);

  return <>{children}</>;
}
