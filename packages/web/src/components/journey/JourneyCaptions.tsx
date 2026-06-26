'use client';

import { BEATS, ACCENT_TEXT } from './beats';

/** The editorial callouts, pinned to the lower-left of the journey viewport. All
 *  six render stacked; only the active beat is visible, cross-fading as the core
 *  morphs behind them. The mono number + label carry the beat's accent colour. */
export function JourneyCaptions({ active }: { active: number }) {
  return (
    <div className="pointer-events-none relative h-full">
      {BEATS.map((beat, i) => (
        <div
          key={beat.id}
          aria-hidden={i !== active}
          className={[
            'absolute bottom-0 left-0 max-w-xl',
            'transition-[opacity,transform] duration-500 ease-out',
            i === active
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-6 opacity-0',
          ].join(' ')}
        >
          <p
            className={`font-mono text-caption uppercase tracking-widest ${ACCENT_TEXT[beat.accent]}`}
          >
            {beat.num} <span className="text-mist">/ {beat.label}</span>
          </p>
          <h2 className="mt-3 font-display text-h1 font-semibold leading-[1.05] tracking-tight text-paper lg:text-display">
            {beat.title}
          </h2>
          <p className="mt-4 max-w-md font-sans text-body leading-relaxed text-mist">{beat.body}</p>
        </div>
      ))}
    </div>
  );
}
