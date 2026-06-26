'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AdminCampaign } from '@/lib/api';
import { useSetHidden } from '@/hooks/useAdmin';
import { RiskBadge } from './RiskBadge';

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** One campaign row: identity, risk badge, the signals that drove the score, and
 *  the hide / un-hide control. Hiding asks for a reason (it's logged server-side). */
export function AdminCampaignRow({ c }: { c: AdminCampaign }) {
  const setHidden = useSetHidden();
  const [reason, setReason] = useState('');

  const toggle = () =>
    setHidden.mutate(
      { vault: c.vault, hidden: !c.hidden, reason: c.hidden ? '' : reason },
      { onSuccess: () => setReason('') },
    );

  return (
    <div className="rounded-2xl border border-line bg-panel/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Link
              href={`/campaigns/${c.vault}`}
              className="truncate font-sans text-small text-paper hover:text-data"
            >
              {c.title || 'Untitled campaign'}
            </Link>
            {c.hidden && (
              <span className="rounded-full border border-line px-2 py-0.5 font-mono text-caption uppercase tracking-widest text-mist">
                Hidden
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-caption text-mist">
            {short(c.founder)} · {c.status}
          </p>
        </div>
        <RiskBadge level={c.risk.level} score={c.risk.score} />
      </div>

      {c.risk.signals.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {c.risk.signals.map((s) => (
            <li
              key={s.key}
              className="rounded-full border border-line px-2.5 py-1 font-sans text-caption text-mist"
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-3">
        {!c.hidden && (
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Reason for hiding this campaign"
            placeholder="Reason (logged)"
            className="flex-1 rounded-lg border border-line bg-void/40 px-3 py-1.5 font-sans text-caption text-paper outline-none transition-colors focus:border-data"
          />
        )}
        <button
          type="button"
          onClick={toggle}
          disabled={setHidden.isPending}
          className="rounded-full border border-line px-4 py-1.5 font-mono text-caption uppercase tracking-widest text-mist transition-colors hover:text-paper disabled:opacity-40"
        >
          {setHidden.isPending ? '…' : c.hidden ? 'Un-hide' : 'Hide'}
        </button>
      </div>
    </div>
  );
}
