'use client';

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Tracks the user's reduced-motion preference, updating if they change it
 *  mid-session. Starts `false` so server and first client render agree (no
 *  hydration mismatch); the effect corrects it on mount. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const update = (): void => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return reduced;
}
