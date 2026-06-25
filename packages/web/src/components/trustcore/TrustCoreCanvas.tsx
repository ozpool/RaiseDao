'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { TrustCore } from './TrustCore';

export interface TrustCoreCanvasProps {
  reducedMotion?: boolean;
}

/** Owns the R3F canvas for the Trust Core. Isometric-ish camera to echo the
 *  voxel reference look; lights tuned so neutral cubes read as brushed metal and
 *  a cool rim picks out every silhouette. Selective bloom (luminance-thresholded)
 *  haloes only the emissive accent cubes. Perf: lighter core on mobile, dpr
 *  clamped (UI.md §5), and the frame loop pauses once the hero scrolls offscreen. */
export function TrustCoreCanvas({ reducedMotion = false }: TrustCoreCanvasProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(window.matchMedia('(max-width: 768px)').matches);
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), {
      rootMargin: '120px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Static (render-on-demand) when reduced-motion or scrolled away — no GPU spin.
  const animate = !reducedMotion && inView;

  return (
    <div ref={wrap} style={{ width: '100%', height: '100%' }}>
      <Canvas
        dpr={mobile ? [1, 1.5] : [1, 1.75]}
        frameloop={animate ? 'always' : 'demand'}
        camera={{ position: [7.2, 5.7, 7.2], fov: 36 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        role="img"
        aria-label="The Vault core — a cluster of cubes representing escrowed funds"
      >
        {/* Void-coloured fog seats the cluster in depth — far cubes fade out. */}
        <fog attach="fog" args={['#0A0B0E', 7.5, 17]} />
        {/* Hemisphere lifts the top (cyan sky) and underside (magenta ground) so the
            cube reads from every angle, and tints it to the theme. */}
        <hemisphereLight args={['#7fe9ff', '#2a1840', 1.0]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 6, 3]} intensity={2.6} />
        <directionalLight position={[-2, -5, -1]} intensity={0.9} color="#9a6bff" />
        {/* Cool rim from behind/opposite the camera — keeps the back edge of every
            cube lit so the silhouette never vanishes into the void. */}
        <directionalLight position={[-5, 2, -5]} intensity={1.8} color="#6fd8ff" />
        <pointLight position={[-3.5, -2, 2.5]} intensity={24} color="#3fe9e0" />
        <pointLight position={[2.5, -1, -3]} intensity={14} color="#c863f0" />
        <TrustCore reducedMotion={reducedMotion} quality={mobile ? 'low' : 'high'} />
        <EffectComposer>
          <Bloom
            mipmapBlur
            intensity={mobile ? 0.9 : 1.1}
            luminanceThreshold={1.0}
            luminanceSmoothing={0.3}
            radius={0.75}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export default TrustCoreCanvas;
