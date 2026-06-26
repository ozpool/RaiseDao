'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  InstancedBufferAttribute,
  Object3D,
  Plane,
  Sphere,
  Vector3,
  type InstancedMesh,
} from 'three';
import { buildCore, type CoreOptions } from './core-geometry';
import { patchEmissive } from './core-material';
import { useCorePointer } from './useCorePointer';

// Geometry is a unit box; real edge length is set per-instance from data.scales.
const SCATTER_RADIUS = 1.7; // cursor influence radius — wider so more motes react
const SCATTER_PUSH = 0.9; // base push at the cursor's centre (scaled per cube below)
const SPRING_TAU = 0.13; // spring time constant (s) for push-out / return
const IDLE_AMP = 0.02; // amplitude of the per-cube alive-at-rest drift
const PARALLAX = 0.1; // subtle whole-core lean — only while the cursor is on the core
// Smaller cubes (the dust shell) scatter far; the structural body barely shifts,
// so the interaction reads as kicking up sparks, not shoving the whole block.
const PUSH_REF_SIZE = 0.18; // scale at which the push multiplier is ~1
const PUSH_MIN = 0.35; // floor for big structural cubes (move little)
const PUSH_MAX = 4; // ceiling for the tiniest motes (fly far)

export interface TrustCoreProps {
  reducedMotion?: boolean;
  quality?: CoreOptions['quality'];
}

/** The instanced voxel core: a stable cluster with idle breathing rotation,
 *  per-instance emissive driving the bloom, cursor-scatter (cubes near the
 *  pointer push outward, quadratic falloff, then spring back), and a gentle
 *  parallax lean. Reduced-motion freezes everything to the resting frame. */
export function TrustCore({ reducedMotion = false, quality = 'high' }: TrustCoreProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const data = useMemo(() => buildCore(1337, { quality }), [quality]);
  const dummy = useMemo(() => new Object3D(), []);
  const ptr = useCorePointer(!reducedMotion);

  // Live per-instance positions (spring toward the scatter target each frame).
  const cur = useMemo(() => new Float32Array(data.positions), [data]);
  const scratch = useMemo(
    () => ({
      plane: new Plane(),
      cursor: new Vector3(),
      n: new Vector3(),
      d: new Vector3(),
      sphere: new Sphere(),
    }),
    [],
  );

  // Seed colours, emissive, scales, and base matrices once the mesh exists.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.geometry.setAttribute('aEmissive', new InstancedBufferAttribute(data.emissive, 1));
    const c = new Color();
    for (let i = 0; i < data.count; i++) {
      c.fromArray(data.colors, i * 3);
      mesh.setColorAt(i, c);
      dummy.position.fromArray(data.positions, i * 3);
      dummy.scale.setScalar(data.scales[i] ?? 0.2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [data, dummy]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh || reducedMotion) return;
    const t = state.clock.elapsedTime;
    const hovering = ptr.hovering.current;
    const ease = 1 - Math.exp(-delta / 0.25);

    // "On the core" = the pointer ray actually passes through the cluster's
    // bounding sphere, not merely somewhere in the canvas. Based on the core
    // centre + radius, so it's stable regardless of this frame's spin/scatter.
    let onCore = false;
    if (hovering) {
      state.raycaster.setFromCamera(ptr.pointer.current, state.camera);
      scratch.sphere.set(mesh.position, data.radius * 1.12); // margin covers the dust shell
      onCore = state.raycaster.ray.intersectsSphere(scratch.sphere);
    }

    // Parallax: a subtle lean toward the cursor, only while actually on the core.
    mesh.position.x += ((onCore ? ptr.pointer.current.x * PARALLAX : 0) - mesh.position.x) * ease;
    mesh.position.y +=
      ((onCore ? ptr.pointer.current.y * PARALLAX * 0.7 : 0) - mesh.position.y) * ease;
    mesh.rotation.y = t * 0.15; // slow turntable
    mesh.scale.setScalar(1 + Math.sin(t * 0.8) * 0.02); // breathing
    mesh.updateMatrixWorld();

    // Cursor in the cluster's local frame — only resolved when on the core.
    let active = false;
    if (onCore) {
      state.camera.getWorldDirection(scratch.n);
      scratch.plane.setFromNormalAndCoplanarPoint(scratch.n, mesh.position);
      if (state.raycaster.ray.intersectPlane(scratch.plane, scratch.cursor)) {
        mesh.worldToLocal(scratch.cursor);
        active = true;
      }
    }

    const k = 1 - Math.exp(-delta / SPRING_TAU); // frame-rate-independent spring
    const { cursor, d } = scratch;
    for (let i = 0; i < data.count; i++) {
      const j = i * 3;
      const bx = data.positions[j]!,
        by = data.positions[j + 1]!,
        bz = data.positions[j + 2]!;
      let tx = bx,
        ty = by,
        tz = bz;
      if (active) {
        d.set(bx - cursor.x, by - cursor.y, bz - cursor.z);
        const dist = d.length();
        if (dist < SCATTER_RADIUS) {
          let f = 1 - dist / SCATTER_RADIUS;
          f *= f; // quadratic falloff — nearest fly furthest
          const size = data.scales[i] ?? 0.2;
          // Tiny motes fly far; the structural body barely shifts.
          const boost = Math.min(PUSH_MAX, Math.max(PUSH_MIN, (PUSH_REF_SIZE / size) ** 1.6));
          const mag = (SCATTER_PUSH * f * boost) / (dist || 1e-3);
          tx += d.x * mag;
          ty += d.y * mag;
          tz += d.z * mag;
        }
      }
      cur[j]! += (tx - cur[j]!) * k;
      cur[j + 1]! += (ty - cur[j + 1]!) * k;
      cur[j + 2]! += (tz - cur[j + 2]!) * k;
      const ph = i * 0.7; // cosmetic idle drift so the cluster shimmers at rest
      dummy.position.set(
        cur[j]! + Math.sin(t * 0.8 + ph) * IDLE_AMP,
        cur[j + 1]! + Math.cos(t * 0.6 + ph) * IDLE_AMP,
        cur[j + 2]!,
      );
      dummy.scale.setScalar(data.scales[i] ?? 0.2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, data.count]}>
      <boxGeometry args={[1, 1, 1]} />
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
