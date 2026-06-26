'use client';

import { useAdminAudit } from '@/hooks/useAdmin';

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** The moderation log: who hid/un-hid what, and why. Read-only. */
export function AuditTrail() {
  const { data: entries } = useAdminAudit();
  if (!entries || entries.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-mono text-caption uppercase tracking-widest text-mist">Audit trail</h2>
      <ol className="divide-y divide-line rounded-2xl border border-line bg-panel/40">
        {entries.map((e, i) => (
          <li
            key={`${e.vault}-${e.at}-${i}`}
            className="flex items-center justify-between gap-4 px-5 py-3"
          >
            <span className="min-w-0 font-sans text-caption text-mist">
              <span className="text-paper">{e.action}</span> {short(e.vault)}
              {e.reason ? ` — ${e.reason}` : ''}
            </span>
            <span className="shrink-0 font-mono text-caption text-mist">
              {short(e.admin)} · {new Date(e.at).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
