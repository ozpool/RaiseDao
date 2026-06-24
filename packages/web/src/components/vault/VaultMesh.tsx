import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, IcosahedronGeometry, Mesh, ShaderMaterial, GLSL3 } from 'three';
import vertexShader from './vault.vert.glsl';
import fragmentShader from './vault.frag.glsl';
import { useVaultUniforms } from './useVaultUniforms';
import { LOD_DETAIL, type VaultProps } from './types';

const ROTATION_PER_SECOND = (Math.PI * 2) / 40; // ~1 revolution / 40s (UI.md §7)

/** Per-triangle barycentric coords (1,0,0)(0,1,0)(0,0,1) so the fragment shader
 *  can find seams. Requires a non-indexed geometry (each tri owns its vertices). */
function buildGeometry(detail: number): IcosahedronGeometry {
  const geometry = new IcosahedronGeometry(1, detail).toNonIndexed();
  const count = geometry.getAttribute('position').count;
  const bary = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const corner = i % 3;
    bary[i * 3 + corner] = 1;
  }
  geometry.setAttribute('bary', new BufferAttribute(bary, 3));
  return geometry as IcosahedronGeometry;
}

/** The Vault geometry + its one GLSL material. Rotates around Y (which keeps the
 *  vertical fill waterline horizontal in world space) unless reduced motion. */
export function VaultMesh(props: VaultProps): React.JSX.Element {
  const meshRef = useRef<Mesh>(null);
  const detail = LOD_DETAIL[props.lod ?? 'full'];
  const geometry = useMemo(() => buildGeometry(detail), [detail]);
  const { uniforms, applyFrame } = useVaultUniforms();

  const material = useMemo(
    () => new ShaderMaterial({ uniforms, vertexShader, fragmentShader, glslVersion: GLSL3 }),
    [uniforms],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_state, delta) => {
    if (document.hidden) return; // pause when the tab is hidden (browser-only loop)
    const dt = Math.min(delta, 0.1); // clamp after a stall so nothing jumps
    applyFrame(props, dt);
    const mesh = meshRef.current;
    if (mesh && !props.reducedMotion) mesh.rotation.y += ROTATION_PER_SECOND * dt;
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}
