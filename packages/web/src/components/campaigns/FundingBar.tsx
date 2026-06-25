/** Cheap SVG funding indicator (UI.md cinematic-lite — cards use SVG, not live
 *  3D). A hairline track with a cyan fill proportional to raised/target, plus the
 *  numbers. Gold-cyan stays reserved; this uses the data cyan. */
export function FundingBar({ raised, target }: { raised: string; target: string }) {
  const t = Number(target);
  const r = Number(raised);
  const pct = t > 0 ? Math.min(100, Math.round((r / t) * 100)) : 0;
  const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `$${n}`);

  return (
    <div>
      <svg
        viewBox="0 0 100 3"
        className="w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${pct}% funded`}
      >
        <rect x={0} y={0} width={100} height={3} rx={1.5} fill="#23262E" />
        {pct > 0 && <rect x={0} y={0} width={pct} height={3} rx={1.5} fill="#38E0D8" />}
      </svg>
      <div className="mt-2 flex items-baseline justify-between font-mono text-caption">
        <span className="text-paper">{fmt(r)}</span>
        <span className="text-data">{pct}%</span>
        <span className="text-mist">{fmt(t)}</span>
      </div>
    </div>
  );
}
