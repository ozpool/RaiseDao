'use client';

import { useRef, type ReactNode } from 'react';

/** A card that lights up where the cursor is — a radial glow tracks the pointer
 *  via CSS vars, the border brightens, and the whole card lifts. Pure transform +
 *  opacity, so it stays smooth. The glow colour is per-card so each accent reads
 *  distinctly. Reduced motion: the lift transition is collapsed by the global CSS
 *  net; the glow only appears on hover, which touch devices never trigger. */
export interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  glow?: string; // rgba for the spotlight tint
}

export function SpotlightCard({
  children,
  className = '',
  glow = 'rgba(63,233,224,0.14)',
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={`group relative overflow-hidden rounded-lg border border-line bg-paper/[0.02] transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1 hover:border-mist/30 hover:bg-paper/[0.04] ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(20rem 20rem at var(--mx, 50%) var(--my, 0%), ${glow}, transparent 70%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
