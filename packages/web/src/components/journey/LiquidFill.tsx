'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ShaderMaterial, Color, MathUtils, type BufferGeometry } from 'three';
import { useJourneyStore } from './useJourneyStore';
import { morphState } from './journey-morph';
import { buildPalette, sampleStops } from './journey-palette';

/** Beat 1 — Fill (`RaiseVault.contribute()`). An inner copy of the gem rendered
 *  with a clip shader: every fragment above the world-space waterline is
 *  discarded, so the liquid surface stays flat and horizontal no matter how the
 *  glass shell spins around it — it reads as real fluid under gravity, not a
 *  scaling mesh. A bright `smoothstep` band at the surface is what bloom catches.
 *  The level is driven by scroll progress and damped, never snapped. */

const vertex = /* glsl */ `
  varying float vWorldY;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldY = wp.y;                       // world height — fixed cut plane vs. spin
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragment = /* glsl */ `
  uniform float uLevel;
  uniform float uBottom;
  uniform float uOpacity;
  uniform vec3 uLiquid;
  uniform vec3 uWaterline;
  varying float vWorldY;
  void main() {
    if (vWorldY > uLevel) discard;        // nothing above the surface
    float surface = smoothstep(uLevel - 0.10, uLevel, vWorldY);   // bright meniscus
    float depth = smoothstep(uBottom, uLevel, vWorldY);           // darker toward floor
    vec3 col = mix(uLiquid * 0.55, uLiquid, depth);
    col = mix(col, uWaterline, surface);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

// World-space Y range the level sweeps. EMPTY sits below the bottom apex (all
// discarded), FULL above the top apex (all kept) for the gem at scale 0.9.
const EMPTY = -1.32;
const FULL = 1.26;

export interface LiquidFillProps {
  geometry: BufferGeometry;
  reducedMotion?: boolean;
}

export function LiquidFill({ geometry, reducedMotion = false }: LiquidFillProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uLevel: { value: EMPTY },
          uBottom: { value: EMPTY },
          uOpacity: { value: 0.92 },
          uLiquid: { value: new Color('#15c7d6') },
          uWaterline: { value: new Color('#c7f8ff') },
        },
      }),
    [],
  );

  const fill = useRef(0);
  const palette = useRef(0);
  const pal = useMemo(() => buildPalette(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const m = morphState(useJourneyStore.getState().progress);
    fill.current = MathUtils.damp(fill.current, reducedMotion ? 1 : m.fill, 6, dt);
    material.uniforms.uLevel!.value = EMPTY + (FULL - EMPTY) * fill.current;
    // Liquid tracks the same colour story as the shell: cyan → magenta → gold.
    palette.current = MathUtils.damp(palette.current, m.palette, 5, dt);
    sampleStops(material.uniforms.uLiquid!.value, pal.liquid, palette.current);
    sampleStops(material.uniforms.uWaterline!.value, pal.waterline, palette.current);
  });

  return <mesh geometry={geometry} scale={0.9} material={material} renderOrder={1} />;
}
