'use client';

import { useEffect, useRef, useState } from 'react';
import { SECTIONS } from './whitepaper-content';

/** Sticky table-of-contents sidebar for the white paper. Tracks which section is
 *  in view (scroll spy via IntersectionObserver), highlights its link, and slides
 *  a glowing accent bar to sit beside the active item. Desktop only; the page
 *  keeps an inline list for narrow screens. */
export function WhitePaperNav() {
  const [active, setActive] = useState(SECTIONS[0]?.id ?? '');
  const [bar, setBar] = useState({ top: 0, height: 0 });
  const items = useRef<Record<string, HTMLAnchorElement | null>>({});

  // Which section is in view. The rootMargin biases the "active" band to the
  // upper third of the viewport, so a section lights up as its heading reaches
  // the top rather than only when it's centred.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive((visible[0].target as HTMLElement).id);
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Slide the moving bar to the active link (measured, so wrapped titles fit).
  useEffect(() => {
    const el = items.current[active];
    if (el) setBar({ top: el.offsetTop, height: el.offsetHeight });
  }, [active]);

  return (
    <nav aria-label="On this page" className="hidden lg:block">
      <div className="sticky top-24">
        <p className="mb-4 font-mono text-caption uppercase tracking-widest text-mist">
          On this page
        </p>
        <div className="relative">
          {/* The static track and the moving accent bar that rides to the active item. */}
          <span className="absolute left-0 top-0 h-full w-px bg-line" aria-hidden />
          <span
            aria-hidden
            className="absolute left-0 w-0.5 rounded-full bg-data transition-all duration-300 ease-out"
            style={{ top: bar.top, height: bar.height, boxShadow: '0 0 8px var(--color-data)' }}
          />
          <ul className="flex flex-col">
            {SECTIONS.map((s) => {
              const on = s.id === active;
              return (
                <li key={s.id}>
                  <a
                    ref={(el) => {
                      items.current[s.id] = el;
                    }}
                    href={`#${s.id}`}
                    aria-current={on ? 'true' : undefined}
                    className={`block py-2 pl-4 font-sans text-small leading-snug transition-colors ${
                      on ? 'text-data' : 'text-mist hover:text-paper'
                    }`}
                  >
                    <span className="mr-2 font-mono text-caption text-mist">{s.num}</span>
                    {s.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
