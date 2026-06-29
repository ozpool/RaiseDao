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

/** Beat 4 — Release (`RaiseVault.releaseMilestone()`). Once the vote passes the
 *  gem cracks and molten value pours from the girdle seam: a continuous stream of
 *  gold points that fall under gravity and fade as they go. `pour` gates the
 *  emission so it ramps in with the release and the stream feels heavy and slow,
 *  not a snap. Pooled — the same points recycle, one draw call, no per-pass alloc. */

const GOLD = new Color('#ffc24d');
const FALL = 1.6; // how far a particle falls before recycling (stays in frame)
const SPEED = 0.22; // slow, heavy flow

export interface GoldPourProps {
  reducedMotion?: boolean;
  count?: number;
}

export function GoldPour({ reducedMotion = false, count = 220 }: GoldPourProps) {
  const points = useRef<Points>(null);

  // Per-particle: an angle around the girdle and a phase offset so the stream is
  // continuous rather than pulsing in unison.
  const seed = useMemo(() => {
    const angle = new Float32Array(count);
    const phase = new Float32Array(count);
    const radius = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      angle[i] = (i / count) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.5;
      phase[i] = Math.sin(i * 78.233) * 0.5 + 0.5;
      radius[i] = 0.55 + (Math.sin(i * 43.21) * 0.5 + 0.5) * 0.4;
    }
    return { angle, phase, radius };
  }, [count]);

  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);

  const mat = useMemo(
    () =>
      new PointsMaterial({
        size: 0.06,
        color: GOLD,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        sizeAttenuation: true,
      }),
    [],
  );

  useFrame((state) => {
    if (!points.current) return;
    const m = reducedMotion
      ? { pour: 0, reseal: 0 }
      : morphState(useJourneyStore.getState().progress);
    const pour = m.pour * (1 - m.reseal); // pour stops as the loop re-seals the gem
    if (pour <= 0.001) {
      points.current.visible = false;
      return;
    }
    points.current.visible = true;
    const t = state.clock.elapsedTime;
    const attr = geo.getAttribute('position') as Float32BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      // Each particle cycles 0→1 down the fall, offset by its phase.
      const f = (t * SPEED + seed.phase[i]!) % 1;
      const drift = 1 - f * 0.5; // converge slightly as it falls
      arr[i * 3] = Math.cos(seed.angle[i]!) * seed.radius[i]! * drift;
      arr[i * 3 + 1] = -f * FALL; // from the girdle (y≈0) downward
      arr[i * 3 + 2] = Math.sin(seed.angle[i]!) * seed.radius[i]! * drift;
    }
    attr.needsUpdate = true;
    mat.opacity = pour; // heavier as the release ramps in
  });

  return <points ref={points} geometry={geo} material={mat} />;
}
