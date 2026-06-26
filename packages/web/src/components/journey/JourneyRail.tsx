'use client';

import { BEATS, ACCENT_BG } from './beats';

/** A thin vertical scroll-progress rail down the right edge: a fill that tracks
 *  overall progress, a tick per beat that lights in its accent colour as it
 *  becomes active, and a small BEAT n / 6 readout. Purely a wayfinding aid. */
export function JourneyRail({ progress, active }: { progress: number; active: number }) {
  return (
    <div className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 lg:block">
      <div className="relative flex flex-col items-center gap-0">
        <div className="relative h-48 w-px bg-line">
          <div
            className="absolute left-0 top-0 w-px bg-paper/60"
            style={{ height: `${progress * 100}%` }}
          />
          {BEATS.map((beat, i) => (
            <span
              key={beat.id}
              className={[
                'absolute -left-[3px] block h-1.5 w-1.5 rounded-full transition-colors duration-300',
                i <= active ? ACCENT_BG[beat.accent] : 'bg-line',
              ].join(' ')}
              style={{ top: `${(i / (BEATS.length - 1)) * 100}%` }}
            />
          ))}
        </div>
        <p className="mt-4 font-mono text-caption uppercase tracking-widest text-mist">
          {String(active).padStart(2, '0')}
          <span className="text-mist/40"> / {String(BEATS.length - 1).padStart(2, '0')}</span>
        </p>
      </div>
    </div>
  );
}
