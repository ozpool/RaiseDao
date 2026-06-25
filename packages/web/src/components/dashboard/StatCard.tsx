const ACCENT: Record<string, string> = {
  data: 'text-data',
  signal: 'text-signal',
  gold: 'text-gold-unlock',
  mist: 'text-mist',
  paper: 'text-paper',
};

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: keyof typeof ACCENT;
}

/** Single-number stat in the branded card shell. accent picks the token color for
 *  the value; defaults to paper (neutral). */
export function StatCard({ label, value, accent = 'paper' }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-panel/40 p-5">
      <p className="font-mono text-caption uppercase tracking-widest text-mist">{label}</p>
      <p className={`mt-1 font-display text-data-lg font-semibold ${ACCENT[accent]}`}>{value}</p>
    </div>
  );
}
