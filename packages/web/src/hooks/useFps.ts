'use client';

import { useEffect, useState } from 'react';

/** Sampled frames-per-second, updated twice a second. Used on /lab as an honest
 *  performance readout while testing the Vault under CPU throttling. */
export function useFps(): number {
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const loop = (now: number): void => {
      frames += 1;
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return fps;
}
