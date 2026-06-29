'use client';

import { formatUnits } from 'viem';

/** Progress of For-votes toward the quorum threshold. The quorum line sits at a
 *  fixed 80% mark so there's visible headroom past it; the fill grows toward the
 *  tick and only turns gold once quorum is reached — the "we have the votes"
 *  moment. Ratios are computed in BigInt space (votes are uint256) then reduced
 *  to a capped percentage for layout. */
const QUORUM_MARK = 80; // percent of the bar width where the threshold tick sits

export function QuorumBar({ forVotes, quorum }: { forVotes: bigint; quorum: bigint }) {
  const met = quorum > 0n ? forVotes >= quorum : forVotes > 0n;
  const ratio = quorum > 0n ? Number((forVotes * 1000n) / quorum) / 1000 : met ? 1 : 0;
  const fillPct = Math.min(ratio * QUORUM_MARK, 100);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between font-mono text-caption text-mist">
        <span>For votes</span>
        <span className={met ? 'text-gold-unlock' : 'text-mist'}>
          {met ? 'Quorum met' : 'Quorum not yet met'}
        </span>
      </div>
      <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-void/60">
        <div
          className={`h-full rounded-full transition-all duration-500 ${met ? 'bg-gold-unlock' : 'bg-data'}`}
          style={{ width: `${fillPct}%` }}
        />
        {/* the quorum threshold tick */}
        <span
          className="absolute top-0 h-full w-px bg-paper/60"
          style={{ left: `${QUORUM_MARK}%` }}
          aria-hidden
        />
      </div>
      <p className="mt-1 font-mono text-caption text-mist">
        {fmt(forVotes)} / {quorum > 0n ? fmt(quorum) : '—'} needed
      </p>
    </div>
  );
}

function fmt(weight: bigint): string {
  return Number(formatUnits(weight, 6)).toLocaleString();
}
