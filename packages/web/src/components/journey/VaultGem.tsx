'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { EdgesGeometry, type Mesh } from 'three';
import { buildGem } from './gem-geometry';

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
  const geo = useMemo(() => buildGem(8, 0.95, 1.35), []); // taller, elegant ◇
  const edges = useMemo(() => new EdgesGeometry(geo, 1), [geo]);
  const low = quality === 'low';

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    if (shell.current) shell.current.rotation.y += dt * 0.25;
    if (core.current) {
      core.current.rotation.y -= dt * 0.18;
      core.current.scale.setScalar(0.3 + Math.sin(t * 1.2) * 0.015); // a slow heartbeat
    }
  });

  return (
    <group>
      {/* A small focal glow at the heart — the escrowed funds, seen through the
          glass. Kept small so the refraction reads, not a solid cyan fill. */}
      <mesh ref={core} geometry={geo} scale={0.3}>
        <meshBasicMaterial color="#3fe9e0" toneMapped={false} />
      </mesh>
      {/* Refractive diamond shell — backside on for truer double-refraction, the
          chromatic aberration dialled back, and a film of iridescence for the
          holographic rainbow that plays across the facets. */}
      <mesh ref={shell} geometry={geo}>
        <MeshTransmissionMaterial
          backside
          transmission={1}
          thickness={2}
          roughness={0.02}
          ior={2.42}
          chromaticAberration={0.06}
          anisotropicBlur={0.1}
          distortion={0.02}
          distortionScale={0.2}
          temporalDistortion={0.04}
          color="#eaf6ff"
          attenuationColor="#bfeaff"
          attenuationDistance={2.5}
          iridescence={1}
          iridescenceIOR={1.32}
          iridescenceThicknessRange={[120, 420]}
          samples={low ? 4 : 10}
          resolution={low ? 256 : 768}
          toneMapped={false}
        />
      </mesh>
      {/* Glowing facet edges — bloom turns these thin emissive lines into the neon
          outline that makes the gem read as lit, not just transparent. */}
      <lineSegments geometry={edges} scale={1.004}>
        <lineBasicMaterial color="#7ff4ec" toneMapped={false} />
      </lineSegments>
    </group>
  );
}
