'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { preserveContext } from '@/lib/preserveContext';
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
        dpr={mobile ? [1, 1.25] : [1, 1.5]}
        frameloop={animate ? 'always' : 'demand'}
        camera={{ position: [0, 0.2, 5.6], fov: 36 }}
        onCreated={preserveContext}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        role="img"
        aria-label="The vault — a diamond holding escrowed funds"
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[3, 4, 2]} intensity={1.9} />
        {/* Four chromatic lights around the gem — each one paints a different band
            of the iridescent spectrum, so the facets catch cyan, magenta, violet
            and gold at once instead of one flat tint. Dialled back so it reads
            jewel-like, not over-lit. */}
        <pointLight position={[-3.5, -2, 2.5]} intensity={17} color="#3fe9e0" />
        <pointLight position={[3, -1, -3]} intensity={11} color="#c863f0" />
        <pointLight position={[2.5, 3, 2]} intensity={8} color="#7c5cff" />
        <pointLight position={[-2, 2.5, -2]} intensity={7} color="#ffcf6b" />

        {/* Centred, seated just slightly low so the whole gem + gold pour stay in
            frame and the upper captions still clear it. */}
        <group position={[0, -0.15, 0]}>
          <VaultGem reducedMotion={reducedMotion} quality={mobile ? 'low' : 'high'} />
        </group>

        {/* Self-contained light studio for the refraction to sample. */}
        <Environment resolution={mobile ? 96 : 192}>
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
          {/* A magenta bar low and behind — colour spills up through the girdle. */}
          <Lightformer
            form="rect"
            intensity={1.8}
            position={[0, -3, -2]}
            scale={[4, 1.2, 1]}
            color="#e98bff"
          />
        </Environment>

        <EffectComposer>
          <Bloom
            mipmapBlur
            intensity={mobile ? 0.8 : 0.95}
            luminanceThreshold={0.82}
            radius={0.7}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export default VaultGemCanvas;
