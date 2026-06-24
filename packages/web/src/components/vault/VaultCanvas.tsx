'use client';

import { Canvas } from '@react-three/fiber';
import { VaultMesh } from './VaultMesh';
import type { VaultProps } from './types';

/** Owns the R3F canvas. dpr clamped per UI.md §5; the void background matches the
 *  page so the square canvas edge is defined only by its hairline border. The
 *  camera sits back enough to frame the displaced sphere with breathing room. */
export function VaultCanvas(props: VaultProps): React.JSX.Element {
  // Reduced motion has nothing to animate, so render on demand (R3F re-renders on
  // each prop commit) — the GPU idles at 0 draw calls between changes.
  const reduced = props.reducedMotion ?? false;
  const fillPct = Math.round(Math.min(1, Math.max(0, props.fillLevel)) * 100);
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={reduced ? 'demand' : 'always'}
      camera={{ position: [0, 0, 3.2], fov: 40 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label={`The Vault — funding level ${fillPct}%, state ${props.state ?? 'live'}`}
    >
      <VaultMesh {...props} />
    </Canvas>
  );
}

export default VaultCanvas;
