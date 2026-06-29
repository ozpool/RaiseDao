'use client';

import { useCountUp } from '@/hooks/useCountUp';

const ACCENT: Record<string, { text: string; bar: string }> = {
  data: { text: 'text-data', bar: 'bg-data' },
  signal: { text: 'text-signal', bar: 'bg-signal' },
  gold: { text: 'text-gold-unlock', bar: 'bg-gold-unlock' },
  mist: { text: 'text-mist', bar: 'bg-mist' },
  paper: { text: 'text-paper', bar: 'bg-mist' },
};

interface StatCardProps {
  label: string;
  /** Static display value (used when `count` is not given). */
  value?: string | number;
  /** Numeric target to count up to; `format` turns the live value into text. */
  count?: number;
  format?: (n: number) => string;
  accent?: keyof typeof ACCENT;
}

/** A control-room stat tile: a count-up value that ticks from 0 on reveal, a thin
 *  accent edge for depth, and a solid panel so the number stays legible over the
 *  atmosphere. Pass `count`+`format` for animated numbers (currency, totals), or a
 *  plain `value` for static text. */
export function StatCard({ label, value, count, format, accent = 'paper' }: StatCardProps) {
  // Animate either an explicit `count` or a numeric `value`.
  const target = count ?? (typeof value === 'number' ? value : null);
  const live = useCountUp(target);
  const acc = ACCENT[accent] ?? ACCENT.paper!;

  let display: string | number;
  if (target !== null && live !== null) {
    display = format ? format(live) : String(Math.round(live));
  } else {
    display = value ?? '—';
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel/70 p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${acc.bar} opacity-70`} aria-hidden />
      <p className="font-mono text-caption uppercase tracking-widest text-mist">{label}</p>
      <p className={`mt-1 font-display text-data-lg font-semibold tabular-nums ${acc.text}`}>
        {display}
      </p>
    </div>
  );
}
