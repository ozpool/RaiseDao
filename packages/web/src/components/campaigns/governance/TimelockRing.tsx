'use client';

import { useEffect, useRef, useState } from 'react';
import { ProposalState } from '@/hooks/useBallot';

const R = 26;
const CIRC = 2 * Math.PI * R;

/** A draining ring for the timelock between a passing vote and when its release
 *  can be executed. `eta` is the unix second the lock opens (0 until queued). The
 *  ring drains over the window first observed when the page opened, with a live
 *  mm:ss countdown; at zero it flips to "Execute unlocked" in gold. Executing the
 *  release itself is #31 — this only shows when it's allowed. */
export function TimelockRing({ eta, state }: { eta: bigint; state: number | undefined }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const windowRef = useRef<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  if (state === ProposalState.Executed) {
    return (
      <p className="mt-3 font-mono text-caption uppercase tracking-widest text-gold-unlock">
        Released
      </p>
    );
  }
  if (eta === 0n) return null; // not queued yet — nothing to count down

  const etaSec = Number(eta);
  const remaining = etaSec - now;
  if (windowRef.current === null && remaining > 0) windowRef.current = remaining;
  const window = windowRef.current ?? 1;
  const unlocked = remaining <= 0;
  const fraction = unlocked ? 0 : Math.min(remaining / window, 1);

  return (
    <div className="mt-3 flex items-center gap-3">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" stroke="var(--color-line)" strokeWidth="4" />
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          stroke={unlocked ? 'var(--color-gold-unlock)' : 'var(--color-data)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div>
        <p className="font-mono text-caption uppercase tracking-widest text-mist">Timelock</p>
        <p className={`font-mono text-small ${unlocked ? 'text-gold-unlock' : 'text-paper'}`}>
          {unlocked ? 'Execute unlocked' : countdown(remaining)}
        </p>
      </div>
    </div>
  );
}

function countdown(seconds: number): string {
  const s = Math.max(seconds, 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
