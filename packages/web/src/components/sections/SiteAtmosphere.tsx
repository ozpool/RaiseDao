'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** The whole site sits on one fixed dark field. The composition is simple: a
 *  single large green-black section down the left ~40% (shaded within itself for
 *  depth, not split into more zones), and a couple of framed rectangle panels off
 *  to the right that sit at their own depth. Everything is near-black — depth
 *  comes from shade and soft shadow, never shine. The layers parallax slowly on
 *  scroll and pointer move so it feels alive. Stilled under reduced motion. */

// A full-height vertical section. The body gradient shades across its width and
// down its height so the single panel has internal depth. Overhangs top/bottom so
// vertical parallax never reveals a hard edge; a soft shadow raises it off the page.
function section(left: number, width: number): CSSProperties {
  return {
    position: 'absolute',
    top: '-20%',
    height: '140%',
    left: `${left}%`,
    width: `${width}%`,
    background:
      'linear-gradient(90deg, rgba(8,14,11,0.06) 0%, rgba(40,72,55,0.27) 24%, rgba(20,40,31,0.13) 58%, rgba(7,12,10,0.07) 100%), linear-gradient(180deg, rgba(46,80,61,0.13), rgba(0,0,0,0.18) 88%)',
    boxShadow: '28px 0 70px rgba(0,0,0,0.58)',
  };
}

// A defined rectangle panel — four faint edges over a near-black fill, a soft
// outer shadow for lift. Not full-height; a deliberate framed shape, not a band.
function rect(
  left: number,
  top: number,
  width: number,
  height: number,
  alpha: number,
): CSSProperties {
  return {
    position: 'absolute',
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    background: `linear-gradient(150deg, rgba(26,50,42,${alpha}), rgba(8,14,12,0.02) 78%)`,
    border: `1px solid rgba(135,170,152,${(alpha * 1.05).toFixed(3)})`,
    boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.30), 0 26px 64px rgba(0,0,0,0.48)`,
  };
}

// Three depths, back → front: a large rectangle sitting deep on the right, the
// left section in the middle plane, and a smaller rectangle nearest the viewer.
const LAYERS: { f: number; items: CSSProperties[] }[] = [
  {
    f: 0.025,
    items: [rect(52, 13, 36, 60, 0.11), rect(43, 56, 17, 32, 0.08)], // deep: large + low small
  },
  {
    f: 0.055,
    items: [section(-3, 43)], // the single left ~40% section
  },
  {
    f: 0.09,
    items: [rect(66, 38, 22, 42, 0.15)], // nearer, smaller rectangle for layering
  },
];

export function SiteAtmosphere() {
  const reduced = useReducedMotion();
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reduced) return;
    // One rAF loop drives every layer. Target = scroll + a small pointer pull;
    // we lerp toward it so motion stays smooth and the layers stay in sync.
    const px = { x: 0, y: 0 };
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      px.x = (e.clientX / window.innerWidth - 0.5) * 2;
      px.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const cur = LAYERS.map(() => ({ x: 0, y: 0 }));
    const tick = () => {
      const s = window.scrollY;
      LAYERS.forEach((layer, i) => {
        const tx = px.x * layer.f * 80;
        const ty = -s * layer.f + px.y * layer.f * 35;
        cur[i]!.x += (tx - cur[i]!.x) * 0.08;
        cur[i]!.y += (ty - cur[i]!.y) * 0.08;
        const el = layerRefs.current[i];
        if (el)
          el.style.transform = `translate3d(${cur[i]!.x.toFixed(2)}px, ${cur[i]!.y.toFixed(2)}px, 0)`;
      });
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [reduced]);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-void">
      {/* A breath of green high-left and a cooler teal low-right so the black isn't
          dead flat — no bright pool, just seated colour. */}
      <div className="absolute inset-0 bg-[radial-gradient(70rem_55rem_at_12%_-4%,rgba(32,76,56,0.08),transparent_56%),radial-gradient(64rem_56rem_at_94%_92%,rgba(24,64,72,0.05),transparent_60%)]" />
      {/* A very faint engineering grid on the deepest plane reinforces the layers. */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(130,160,150,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(130,160,150,0.022)_1px,transparent_1px)] bg-[size:76px_76px]" />

      {LAYERS.map((layer, i) => (
        <div
          key={i}
          ref={(el) => {
            layerRefs.current[i] = el;
          }}
          className="absolute inset-0 will-change-transform"
        >
          {layer.items.map((it, j) => (
            <div key={j} style={it} />
          ))}
        </div>
      ))}

      {/* Faint grain keeps the field filmic — no scanline shine. */}
      <div className="atmo-grain" />
    </div>
  );
}
