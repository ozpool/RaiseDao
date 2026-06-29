'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  AdditiveBlending,
  Color,
  type Points,
} from 'three';
import { useJourneyStore } from './useJourneyStore';
import { morphState } from './journey-morph';

/** Beat 2 — the celebration burst at the lock. When the seal snaps, a spray of
 *  sparks blows outward from the girdle, confirming the funds are sealed. The
 *  spray expands with `lock` (so it streaks out as you scroll through the beat)
 *  and is lit by `seal` (the 0→1→0 flash, so it flares bright then fades). Scrub
 *  back and it retracts — fully scroll-safe. Additive points, one draw call. */

export interface LockBurstProps {
  reducedMotion?: boolean;
  count?: number;
}

export function LockBurst({ reducedMotion = false, count = 90 }: LockBurstProps) {
  const points = useRef<Points>(null);

  // Each spark gets a fixed random direction, biased toward the waist plane so
  // the burst reads as a ring detonation rather than a uniform sphere.
  const dirs = useMemo(() => {
    const d = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.6;
      const r = 0.6 + (Math.sin(i * 78.233) * 0.5 + 0.5) * 0.4; // varied reach
      d[i * 3] = Math.cos(a) * r;
      d[i * 3 + 1] = Math.sin(i * 43.21) * 0.45; // flattened vertical spread
      d[i * 3 + 2] = Math.sin(a) * r;
    }
    return d;
  }, [count]);

  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);

  const mat = useMemo(
    () =>
      new PointsMaterial({
        size: 0.05,
        color: new Color('#d6fbff'),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        sizeAttenuation: true,
      }),
    [],
  );

  useFrame(() => {
    if (!points.current) return;
    const m = reducedMotion
      ? { lock: 0, seal: 0 }
      : morphState(useJourneyStore.getState().progress);
    const spread = 0.97 + m.lock * 1.6; // from the girdle outward
    const attr = geo.getAttribute('position') as Float32BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count * 3; i++) arr[i] = dirs[i]! * spread;
    attr.needsUpdate = true;
    mat.opacity = m.seal; // visible only during the flash
    points.current.visible = m.seal > 0.01;
  });

  return <points ref={points} geometry={geo} material={mat} />;
}
