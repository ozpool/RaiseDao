'use client';

import { Canvas } from '@react-three/fiber';
import { TrustCore } from './TrustCore';

export interface TrustCoreCanvasProps {
  reducedMotion?: boolean;
}

/** Owns the R3F canvas for the Trust Core. Isometric-ish camera to echo the
 *  voxel reference look; lights tuned so neutral cubes read as brushed metal and
 *  the accent cubes glow against the void. dpr clamped per UI.md §5. */
export function TrustCoreCanvas({ reducedMotion = false }: TrustCoreCanvasProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      camera={{ position: [4.7, 3.7, 4.7], fov: 38 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label="The Vault core — a cluster of cubes representing escrowed funds"
    >
      {/* Void-coloured fog seats the cluster in depth — far cubes fade out. */}
      <fog attach="fog" args={['#0A0B0E', 7.5, 17]} />
      {/* Hemisphere lifts both the top (cyan sky) and the underside (magenta ground)
          so the cube reads from every angle, and tints it to the theme. */}
      <hemisphereLight args={['#7fe9ff', '#2a1840', 1.0]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 3]} intensity={2.6} />
      <directionalLight position={[-2, -5, -1]} intensity={0.9} color="#9a6bff" />
      <pointLight position={[-3.5, -2, 2.5]} intensity={24} color="#3fe9e0" />
      <pointLight position={[2.5, -1, -3]} intensity={14} color="#c863f0" />
      <TrustCore reducedMotion={reducedMotion} />
    </Canvas>
  );
}

export default TrustCoreCanvas;
