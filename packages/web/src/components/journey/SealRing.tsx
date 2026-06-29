'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { TorusGeometry, MeshBasicMaterial, Color, MathUtils, type Mesh } from 'three';
import { useJourneyStore } from './useJourneyStore';
import { morphState } from './journey-morph';

/** Beat 2 — Lock. Once the milestone target is met the funds are sealed: a ring
 *  snaps shut around the girdle with a flash — the "clunk" that says even the
 *  founder can't reach in now. `lock` ramps the ring in from a wider radius down
 *  onto the waist and holds it there; `seal` (a 0→1→0 pulse) is the bright flash
 *  at the instant it seats. Bloom haloes the flash for free. */

const COLOR = new Color('#dffcff');

export interface SealRingProps {
  reducedMotion?: boolean;
}

export function SealRing({ reducedMotion = false }: SealRingProps) {
  const ring = useRef<Mesh>(null);
  const geo = useMemo(() => new TorusGeometry(0.97, 0.035, 12, 64), []);
  const mat = useMemo(
    () => new MeshBasicMaterial({ color: COLOR, transparent: true, opacity: 0, toneMapped: false }),
    [],
  );
  const lit = useRef(0);

  useFrame((_, delta) => {
    if (!ring.current) return;
    const m = reducedMotion
      ? { lock: 1, seal: 0, relock: 0 }
      : morphState(useJourneyStore.getState().progress);
    const dt = Math.min(delta, 0.1);
    lit.current = MathUtils.damp(lit.current, m.lock, 8, dt);

    // Seats from a wider ring (1.25×) down onto the girdle as it locks.
    ring.current.scale.setScalar(1 + (1 - lit.current) * 0.25);
    // Faint when merely present, blinding white at either flash (lock + re-seal).
    mat.opacity = lit.current * 0.5 + (m.seal + m.relock) * 0.9;
    ring.current.visible = mat.opacity > 0.01;
  });

  return <mesh ref={ring} geometry={geo} material={mat} rotation={[Math.PI / 2, 0, 0]} />;
}
