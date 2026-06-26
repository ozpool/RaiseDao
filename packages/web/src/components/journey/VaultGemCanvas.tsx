'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { VaultGem } from './VaultGem';

export interface VaultGemCanvasProps {
  reducedMotion?: boolean;
}

/** Owns the R3F canvas for the diamond vault. A small studio of light bars
 *  (Lightformers, no external HDRI) gives the refraction something to bend and
 *  the facets something to catch; bloom haloes the trapped inner glow and the
 *  brightest sparkle. Lighter transmission + paused frame loop when offscreen. */
export function VaultGemCanvas({ reducedMotion = false }: VaultGemCanvasProps) {
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

  const animate = !reducedMotion && inView;

  return (
    <div ref={wrap} style={{ width: '100%', height: '100%' }}>
      <Canvas
        dpr={mobile ? [1, 1.5] : [1, 1.75]}
        frameloop={animate ? 'always' : 'demand'}
        camera={{ position: [0, 0.3, 5], fov: 35 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        role="img"
        aria-label="The vault — a diamond holding escrowed funds"
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 2]} intensity={2.2} />
        <pointLight position={[-3.5, -2, 2.5]} intensity={22} color="#3fe9e0" />
        <pointLight position={[3, -1, -3]} intensity={12} color="#c863f0" />

        <VaultGem reducedMotion={reducedMotion} quality={mobile ? 'low' : 'high'} />

        {/* Self-contained light studio for the refraction to sample. */}
        <Environment resolution={mobile ? 128 : 256}>
          <Lightformer
            form="rect"
            intensity={3}
            position={[0, 3, 2]}
            scale={[5, 1.5, 1]}
            color="#aee9ff"
          />
          <Lightformer
            form="rect"
            intensity={2}
            position={[-4, 0, 1]}
            scale={[1, 5, 1]}
            color="#ffffff"
          />
          <Lightformer
            form="rect"
            intensity={1.6}
            position={[4, -1, 1]}
            scale={[1, 5, 1]}
            color="#f0d3a0"
          />
        </Environment>

        <EffectComposer>
          <Bloom mipmapBlur intensity={mobile ? 0.8 : 1.0} luminanceThreshold={0.85} radius={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export default VaultGemCanvas;
