'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import type { Mesh } from 'three';
import { buildBrilliant } from './brilliant-cut';

export interface VaultGemProps {
  reducedMotion?: boolean;
  /** Lower-cost transmission on mobile / low-power. */
  quality?: 'high' | 'low';
}

/** The vault as a refractive brilliant-cut diamond: a glass shell that bends the
 *  environment light through its facets, with a brighter gem trapped inside whose
 *  glow reads as the funds held in escrow. Slow counter-rotation gives the light
 *  something to play across. The beat-driven morph (fill, palette, gold release)
 *  arrives next; this is the resting object. */
export function VaultGem({ reducedMotion = false, quality = 'high' }: VaultGemProps) {
  const shell = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);
  const geo = useMemo(() => buildBrilliant(16), []);
  const low = quality === 'low';

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    if (shell.current) shell.current.rotation.y += dt * 0.25;
    if (core.current) {
      core.current.rotation.y -= dt * 0.18;
      core.current.scale.setScalar(0.55 + Math.sin(t * 1.2) * 0.02); // a slow heartbeat
    }
  });

  return (
    <group>
      {/* Trapped inner light — the escrowed funds, glowing cyan through the glass. */}
      <mesh ref={core} geometry={geo} scale={0.55}>
        <meshBasicMaterial color="#3fe9e0" toneMapped={false} />
      </mesh>
      {/* Refractive diamond shell. */}
      <mesh ref={shell} geometry={geo}>
        <MeshTransmissionMaterial
          transmission={1}
          thickness={1.6}
          roughness={0.04}
          ior={2.42}
          chromaticAberration={0.55}
          anisotropicBlur={0.3}
          distortion={0.12}
          distortionScale={0.3}
          temporalDistortion={0.08}
          color="#dff4ff"
          samples={low ? 4 : 8}
          resolution={low ? 256 : 512}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
