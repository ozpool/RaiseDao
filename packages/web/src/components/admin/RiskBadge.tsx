import type { RiskLevel } from '@/lib/api';

const STYLES: Record<RiskLevel, string> = {
  high: 'bg-signal/10 text-signal border-signal/40',
  medium: 'bg-data/10 text-data border-data/40',
  low: 'border-line text-mist',
};

/** Compact risk pill: level + numeric score, colour-keyed by severity. */
export function RiskBadge({ level, score }: { level: RiskLevel; score: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-caption uppercase tracking-widest ${STYLES[level]}`}
    >
      {level} · {score}
    </span>
  );
}
