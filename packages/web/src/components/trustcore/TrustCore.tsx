'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Object3D, type InstancedMesh } from 'three';
import { buildCore } from './core-geometry';

const CUBE = 0.3; // cube edge length in local units

export interface TrustCoreProps {
  reducedMotion?: boolean;
}

/** The instanced voxel core. Stage 1: a stable cluster with an idle breathing
 *  rotation. Cursor-scatter and the funding waterline arrive in later stages. */
export function TrustCore({ reducedMotion = false }: TrustCoreProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const data = useMemo(() => buildCore(), []);
  const dummy = useMemo(() => new Object3D(), []);

  // Seed the per-instance colours and base matrices once the mesh exists.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const c = new Color();
    for (let i = 0; i < data.count; i++) {
      c.fromArray(data.colors, i * 3);
      mesh.setColorAt(i, c);
      dummy.position.fromArray(data.positions, i * 3);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [data, dummy]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh || reducedMotion) return;
    const t = state.clock.elapsedTime;
    mesh.rotation.y = t * 0.15; // slow turntable
    mesh.scale.setScalar(1 + Math.sin(t * 0.8) * 0.02); // breathing
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, data.count]}>
      <boxGeometry args={[CUBE, CUBE, CUBE]} />
      <meshStandardMaterial vertexColors roughness={0.45} metalness={0.12} />
    </instancedMesh>
  );
}
