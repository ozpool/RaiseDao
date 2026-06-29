'use client';

import {
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';

/** Wraps content so it materialises (blur + rise) the first time it scrolls into
 *  view. The `.reveal`/`.is-in` CSS lives in globals; this just toggles the class
 *  via an IntersectionObserver and disconnects after the first reveal. Honours
 *  reduced motion through the CSS guard, so it stays inert there. `as` picks the
 *  tag (e.g. 'li' inside an <ol>); createElement keeps the polymorphism cheap for
 *  the type-checker. */
export interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number; // stagger, ms
  as?: 'div' | 'li' | 'article' | 'section';
}

export function Reveal({ children, className = '', delay = 0, as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add('is-in');
          io.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref: ref as Ref<HTMLElement>,
      className: `reveal ${className}`,
      style: { transitionDelay: `${delay}ms` } as CSSProperties,
    },
    children,
  );
}
