'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  InstancedBufferAttribute,
  Object3D,
  type InstancedMesh,
  type MeshStandardMaterial,
} from 'three';
import { buildCore } from './core-geometry';

const CUBE = 0.3; // cube edge length in local units

export interface TrustCoreProps {
  reducedMotion?: boolean;
}

/** Inject a per-instance emissive term into the standard material. InstancedMesh
 *  has no native per-instance emissive, so accent cubes can't "glow" on their own
 *  out of the box. We add an `aEmissive` instanced attribute and add
 *  `vColor * vEmissive` to the emissive radiance — only accents (strength > 0)
 *  light up, which is exactly what the selective bloom keys off of. */
function patchEmissive(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aEmissive;\nvarying float vEmissive;',
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEmissive = aEmissive;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vEmissive;')
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor * vEmissive;',
      );
  };
}

/** The instanced voxel core. Stable cluster, idle breathing rotation, and a
 *  per-instance emissive that drives the selective bloom in the canvas.
 *  Cursor-scatter and the funding waterline arrive in later stages. */
export function TrustCore({ reducedMotion = false }: TrustCoreProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const data = useMemo(() => buildCore(), []);
  const dummy = useMemo(() => new Object3D(), []);

  // Seed the per-instance colours, emissive, and base matrices once the mesh exists.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.geometry.setAttribute('aEmissive', new InstancedBufferAttribute(data.emissive, 1));
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
      <meshStandardMaterial
        vertexColors
        roughness={0.4}
        metalness={0.15}
        toneMapped={false}
        onBeforeCompile={patchEmissive}
      />
    </instancedMesh>
  );
}
