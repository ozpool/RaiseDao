'use client';

import { BEATS, ACCENT_TEXT } from './beats';

/** The editorial callouts, pinned to the lower-left of the journey viewport. All
 *  six render stacked; the active one materialises in, each line blurring into
 *  focus and rising in turn (label, then title, then body), so the copy feels
 *  like it condenses into existence rather than hard-swapping. Inactive captions
 *  blur back out. */
export function JourneyCaptions({ active }: { active: number }) {
  return (
    <div className="pointer-events-none relative h-full">
      {BEATS.map((beat, i) => {
        const on = i === active;
        // Each line shares the same transition but fires on its own delay, so the
        // caption assembles top-to-bottom instead of arriving all at once.
        const line = [
          'transition-[opacity,transform,filter] duration-700 ease-out',
          on ? 'opacity-100 translate-y-0 blur-0' : 'translate-y-3 opacity-0 blur-[8px]',
        ].join(' ');
        const delayed = (ms: number) => ({ transitionDelay: on ? `${ms}ms` : '0ms' });

        return (
          <div
            key={beat.id}
            aria-hidden={!on}
            className={[
              'absolute left-0 top-0 max-w-md',
              'transition-[transform] duration-700 ease-out',
              on ? 'translate-y-0' : 'pointer-events-none translate-y-2',
            ].join(' ')}
          >
            <p
              className={`${line} font-mono text-caption uppercase tracking-widest ${ACCENT_TEXT[beat.accent]}`}
              style={delayed(0)}
            >
              {beat.num} <span className="text-mist">/ {beat.label}</span>
            </p>
            <h2
              className={`${line} mt-3 font-display text-h1 font-semibold leading-[1.05] tracking-tight text-paper lg:text-display`}
              style={delayed(90)}
            >
              {beat.title}
            </h2>
            <p
              className={`${line} mt-4 max-w-md font-sans text-body leading-relaxed text-mist`}
              style={delayed(180)}
            >
              {beat.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}
