/** Cheap SVG funding indicator (UI.md cinematic-lite — cards use SVG, not live
 *  3D). A hairline track with a cyan fill proportional to raised/target, plus the
 *  numbers. Gold-cyan stays reserved; this uses the data cyan. */
import { toUSDCNum } from '@/lib/format';

export function FundingBar({ raised, target }: { raised: string; target: string }) {
  // raised/target are raw 6-decimal USDC strings (the on-chain unit); convert to
  // dollars so the bar and labels read in human money, not micro-USDC.
  const t = toUSDCNum(target);
  const r = toUSDCNum(raised);
  // The real percentage — a vault accepts contributions past its target, so this
  // can exceed 100%. The bar fill is capped at full width (you can't draw past the
  // end), but the number tells the truth and turns gold once it's over-funded.
  const pct = t > 0 ? Math.round((r / t) * 100) : 0;
  const fill = Math.min(100, pct);
  const over = pct > 100;
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
        {fill > 0 && (
          <rect x={0} y={0} width={fill} height={3} rx={1.5} fill={over ? '#FFCF6B' : '#38E0D8'} />
        )}
      </svg>
      <div className="mt-2 flex items-baseline justify-between font-mono text-caption">
        <span className="text-paper">{fmt(r)}</span>
        <span className={over ? 'text-gold-unlock' : 'text-data'}>
          {pct}%{over && ' · over-funded'}
        </span>
        <span className="text-mist">{fmt(t)}</span>
      </div>
    </div>
  );
}
