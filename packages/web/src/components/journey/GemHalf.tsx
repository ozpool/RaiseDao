'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import {
  EdgesGeometry,
  MathUtils,
  type Group,
  type Mesh,
  type LineBasicMaterial,
  type MeshPhysicalMaterial,
} from 'three';
import { buildGemHalf } from './gem-geometry';
import { useJourneyStore } from './useJourneyStore';
import { morphState } from './journey-morph';
import { buildPalette, sampleStops } from './journey-palette';

/** One refractive half of the gem. Both halves spin together; on the release beat
 *  the top half lifts and tilts off the girdle so the gem cracks open and the gold
 *  pours from the seam. Each half samples the shared colour story for its shell
 *  attenuation and glowing edges, so the two pieces stay perfectly in step. */

const LIFT_MAX = 0.5; // how far the lid rises at full release (kept in frame)

export interface GemHalfProps {
  part: 'top' | 'bottom';
  reducedMotion?: boolean;
  low?: boolean;
}

export function GemHalf({ part, reducedMotion = false, low = false }: GemHalfProps) {
  const group = useRef<Group>(null);
  const shell = useRef<Mesh>(null);
  const edgeMat = useRef<LineBasicMaterial>(null);
  const geo = useMemo(() => buildGemHalf(part, 8, 0.95, 1.35), [part]);
  const edges = useMemo(() => new EdgesGeometry(geo, 1), [geo]);
  const pal = useMemo(() => buildPalette(), []);
  const palette = useRef(0);

  useFrame((_, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.1);
    const m = reducedMotion
      ? { palette: 0, lift: 0, reseal: 0 }
      : morphState(useJourneyStore.getState().progress);

    if (!reducedMotion) group.current.rotation.y += dt * 0.18; // both halves, synced
    if (part === 'top') {
      // Lifts open on release, then descends back as the loop re-seals it.
      const open = m.lift * (1 - m.reseal);
      group.current.position.y = open * LIFT_MAX;
      group.current.rotation.x = open * 0.12; // a slight tilt as it opens
    }

    palette.current = MathUtils.damp(palette.current, m.palette, 5, dt);
    const sm = shell.current?.material as MeshPhysicalMaterial | undefined;
    if (sm?.attenuationColor) sampleStops(sm.attenuationColor, pal.atten, palette.current);
    if (edgeMat.current) sampleStops(edgeMat.current.color, pal.edge, palette.current);
  });

  return (
    <group ref={group}>
      <mesh ref={shell} geometry={geo}>
        <MeshTransmissionMaterial
          backside
          transmission={1}
          thickness={1.4}
          roughness={0.02}
          ior={2.42}
          chromaticAberration={0.06}
          anisotropicBlur={0.1}
          distortion={0.02}
          distortionScale={0.2}
          temporalDistortion={0.04}
          color="#eaf6ff"
          attenuationColor="#9fe4ff"
          attenuationDistance={4.5}
          iridescence={1}
          iridescenceIOR={1.4}
          iridescenceThicknessRange={[100, 800]}
          samples={low ? 4 : 6}
          resolution={low ? 160 : 320}
          toneMapped={false}
        />
      </mesh>
      <lineSegments geometry={edges} scale={1.004}>
        <lineBasicMaterial ref={edgeMat} color="#7ff4ec" toneMapped={false} />
      </lineSegments>
    </group>
  );
}
