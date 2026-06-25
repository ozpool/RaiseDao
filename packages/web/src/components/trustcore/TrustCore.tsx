'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Color,
  InstancedBufferAttribute,
  Object3D,
  Plane,
  Vector2,
  Vector3,
  type InstancedMesh,
  type MeshStandardMaterial,
} from 'three';
import { buildCore } from './core-geometry';

// Geometry is a unit box; real edge length is set per-instance from data.scales.
const SCATTER_RADIUS = 1.35; // cursor influence radius, in local units
const SCATTER_PUSH = 0.85; // furthest a cube flies at the cursor's centre
const SPRING_TAU = 0.13; // spring time constant (s) for push-out / return
const IDLE_AMP = 0.02; // amplitude of the per-cube alive-at-rest drift

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

/** The instanced voxel core: a stable cluster with idle breathing rotation,
 *  per-instance emissive driving the bloom, and cursor-scatter — cubes near the
 *  pointer push outward (quadratic falloff, nearest fly furthest) then spring
 *  back when it leaves. Reduced-motion freezes everything to the resting frame. */
export function TrustCore({ reducedMotion = false }: TrustCoreProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const data = useMemo(() => buildCore(), []);
  const dummy = useMemo(() => new Object3D(), []);
  const { camera, gl } = useThree();

  // Live per-instance positions (spring toward the scatter target each frame).
  const cur = useMemo(() => new Float32Array(data.positions), [data]);
  // Cursor tracking, all in refs so the frame loop allocates nothing.
  const pointer = useRef(new Vector2());
  const hovering = useRef(false);
  const scratch = useMemo(
    () => ({ plane: new Plane(), cursor: new Vector3(), normal: new Vector3(), d: new Vector3() }),
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

  // Track the pointer over the canvas; leaving lets the cubes spring home.
  useEffect(() => {
    if (reducedMotion) return;
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      hovering.current = true;
    };
    const leave = () => (hovering.current = false);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [gl, reducedMotion]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh || reducedMotion) return;
    const t = state.clock.elapsedTime;
    mesh.rotation.y = t * 0.15; // slow turntable
    mesh.scale.setScalar(1 + Math.sin(t * 0.8) * 0.02); // breathing
    mesh.updateMatrixWorld();

    // Cursor in the cluster's local frame (matches the base positions).
    let active = false;
    if (hovering.current) {
      camera.getWorldDirection(scratch.normal);
      scratch.plane.setFromNormalAndCoplanarPoint(scratch.normal, mesh.position);
      state.raycaster.setFromCamera(pointer.current, camera);
      if (state.raycaster.ray.intersectPlane(scratch.plane, scratch.cursor)) {
        mesh.worldToLocal(scratch.cursor);
        active = true;
      }
    }

    // Frame-rate-independent spring factor.
    const k = 1 - Math.exp(-delta / SPRING_TAU);
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
          const mag = (SCATTER_PUSH * f) / (dist || 1e-3);
          tx += d.x * mag;
          ty += d.y * mag;
          tz += d.z * mag;
        }
      }
      // Spring the live position toward the target.
      cur[j]! += (tx - cur[j]!) * k;
      cur[j + 1]! += (ty - cur[j + 1]!) * k;
      cur[j + 2]! += (tz - cur[j + 2]!) * k;
      // Cosmetic idle drift so the cluster shimmers even at rest.
      const ph = i * 0.7;
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
