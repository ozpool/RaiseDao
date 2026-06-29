'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { buildGem } from './gem-geometry';
import { LiquidFill } from './LiquidFill';
import { SealRing } from './SealRing';
import { LockBurst } from './LockBurst';
import { GemHalf } from './GemHalf';
import { GoldPour } from './GoldPour';
import { useJourneyStore } from './useJourneyStore';
import { morphState } from './journey-morph';
import { buildPalette, sampleStops } from './journey-palette';

export interface VaultGemProps {
  reducedMotion?: boolean;
  /** Lower-cost transmission on mobile / low-power. */
  quality?: 'high' | 'low';
}

/** The vault, dramatized. A refractive gem split into two halves: liquid rises as
 *  funds enter, a ring seals and sparks burst as it locks, the palette flips to
 *  magenta on the vote, then the top half cracks open and gold pours on release.
 *  The shells live in GemHalf; this composes them with the core, liquid, seal and
 *  pour, and owns the whole-gem "clunk" and the core's colour + heartbeat. */
export function VaultGem({ reducedMotion = false, quality = 'high' }: VaultGemProps) {
  const root = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const coreMat = useRef<MeshBasicMaterial>(null);
  const geo = useMemo(() => buildGem(8, 0.95, 1.35), []); // taller, elegant ◇
  const low = quality === 'low';
  const clunk = useRef(0);
  const pal = useMemo(() => buildPalette(), []);
  const palette = useRef(0); // damped colour-story position (0 cyan → 1 magenta → 2 gold)

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    const m = morphState(useJourneyStore.getState().progress);
    if (core.current) {
      core.current.rotation.y -= dt * 0.12;
      // Slow heartbeat, then swells ~12% larger on the loop — trust compounded.
      const heartbeat = 0.3 + Math.sin(t * 1.2) * 0.015;
      core.current.scale.setScalar(heartbeat * (1 + m.reseal * 0.12));
    }
    // The "clunk": a squash-and-settle bump at each seal flash (lock + re-seal).
    if (root.current) {
      clunk.current = MathUtils.damp(clunk.current, Math.max(m.seal, m.relock), 10, dt);
      root.current.scale.setScalar(1 + clunk.current * 0.04);
    }
    // The core tracks the same colour story as the shells (sampled in GemHalf),
    // and glows brighter as it re-seals so bloom haloes the compounded core.
    palette.current = MathUtils.damp(palette.current, m.palette, 5, dt);
    if (coreMat.current) {
      sampleStops(coreMat.current.color, pal.core, palette.current);
      // Push the core well above 1.0 so it floods the glass interior with colour
      // (and haloes through bloom) instead of reading as a small dark heart.
      coreMat.current.color.multiplyScalar(1.7 + m.reseal * 0.6);
    }
  });

  return (
    <group ref={root}>
      {/* The glowing heart — the escrowed funds seen through the glass. Sized up
          so its colour fills the interior and lifts the gem out of the dark, while
          still leaving the facets and refraction readable around it. */}
      <mesh ref={core} geometry={geo} scale={0.46}>
        <meshBasicMaterial ref={coreMat} color="#3fe9e0" toneMapped={false} />
      </mesh>
      {/* Beat 1 — the escrowed funds rising as a glowing liquid inside the glass. */}
      <LiquidFill geometry={geo} reducedMotion={reducedMotion} />
      {/* Beat 2 — the seal ring snapping shut, and the spark burst that confirms it. */}
      <SealRing reducedMotion={reducedMotion} />
      <LockBurst reducedMotion={reducedMotion} count={low ? 40 : 90} />
      {/* Beat 4 — gold pouring from the seam once the top half cracks open. */}
      <GoldPour reducedMotion={reducedMotion} count={low ? 70 : 220} />
      {/* The refractive shell, split at the girdle so the lid can lift on release. */}
      <GemHalf part="bottom" reducedMotion={reducedMotion} low={low} />
      <GemHalf part="top" reducedMotion={reducedMotion} low={low} />
    </group>
  );
}
