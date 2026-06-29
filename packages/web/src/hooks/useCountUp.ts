'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

/** Animate a number from 0 up to `target` once, on mount / when the target lands.
 *  An ease-out curve makes it decelerate into the final value (the "counter
 *  cascade" dashboards use). Returns `null` when there's no target. Reduced motion
 *  snaps straight to the value — no animation. */
export function useCountUp(target: number | null, duration = 1100): number | null {
  const reduced = useReducedMotion();
  const [value, setValue] = useState<number | null>(target);
  const raf = useRef(0);

  useEffect(() => {
    if (target === null || Number.isNaN(target)) {
      setValue(target);
      return;
    }
    if (reduced) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, reduced, duration]);

  return value;
}
