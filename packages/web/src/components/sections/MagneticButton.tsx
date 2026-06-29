'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';

/** A link that drifts toward the cursor within its bounds, then springs back on
 *  leave — the premium "magnetic" feel. Gated to fine pointers, so touch devices
 *  get a plain tap target with no transform logic. Pair with a transform
 *  transition in className for the spring-back. */
export interface MagneticButtonProps {
  href: string;
  children: ReactNode;
  className?: string;
  strength?: number;
}

export function MagneticButton({
  href,
  children,
  className = '',
  strength = 0.3,
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || !window.matchMedia('(pointer: fine)').matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };

  const reset = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <Link ref={ref} href={href} onMouseMove={handleMove} onMouseLeave={reset} className={className}>
      {children}
    </Link>
  );
}
