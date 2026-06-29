/** A cheap SVG "vault gem" gauge — the same diamond language as the hero, but a
 *  static SVG (UI.md cinematic-lite: cards use SVG fill, never live 3D). The gem
 *  fills with a glowing liquid to the live funding percentage, and its colour
 *  tracks the campaign status: cyan while funding, gold once it succeeds/releases,
 *  a muted steel if it failed. Sits in the detail page's right column. */

import { toUSDCNum } from '@/lib/format';

const STATUS_HUE: Record<string, string> = {
  funding: '#38E0D8',
  active: '#38E0D8',
  pending: '#38E0D8',
  passed: '#FFCF6B',
  succeeded: '#FFCF6B',
  released: '#FFCF6B',
  failed: '#8A93A0',
};

// Diamond corners — top, right, bottom, left — over a 120×160 canvas.
const DIAMOND = '60,8 112,80 60,152 8,80';
const TOP = 8;
const BOTTOM = 152;

export function FundingGem({
  raised,
  target,
  status,
}: {
  raised: string;
  target: string;
  status: string;
}) {
  const t = toUSDCNum(target);
  const r = toUSDCNum(raised);
  // True percent (can pass 100% — the vault takes contributions past target). The
  // liquid can't rise above the gem, so the waterline caps at full while the label
  // shows the real figure and the gem glows gold once over-funded.
  const pct = t > 0 ? Math.max(0, Math.round((r / t) * 100)) : 0;
  const fill = Math.min(100, pct);
  const over = pct > 100;
  const hue = over ? '#FFCF6B' : (STATUS_HUE[status] ?? '#38E0D8');
  // Liquid surface: the higher the funding, the higher the waterline.
  const waterline = BOTTOM - (fill / 100) * (BOTTOM - TOP);

  return (
    <svg
      viewBox="0 0 120 160"
      className="mx-auto block w-36"
      role="img"
      aria-label={`${pct}% funded`}
    >
      <defs>
        <clipPath id="gemClip">
          <polygon points={DIAMOND} />
        </clipPath>
        <linearGradient id="gemLiquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hue} stopOpacity="0.85" />
          <stop offset="100%" stopColor={hue} stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* Glass interior + the rising liquid, both clipped to the diamond. */}
      <g clipPath="url(#gemClip)">
        <rect x="0" y="0" width="120" height="160" fill="rgba(120,150,170,0.06)" />
        <rect x="0" y={waterline} width="120" height="160" fill="url(#gemLiquid)" />
        {pct > 0 && <rect x="0" y={waterline} width="120" height="1.5" fill={hue} opacity="0.9" />}
      </g>

      {/* Facets: girdle line + the four ridge lines, faint so they read as glass. */}
      <line x1="8" y1="80" x2="112" y2="80" stroke={hue} strokeOpacity="0.25" strokeWidth="0.8" />
      <line x1="60" y1="8" x2="60" y2="152" stroke={hue} strokeOpacity="0.18" strokeWidth="0.8" />
      <polygon
        points={DIAMOND}
        fill="none"
        stroke={hue}
        strokeOpacity="0.8"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* The number, centred in the gem. */}
      <text
        x="60"
        y="84"
        textAnchor="middle"
        className="fill-paper font-sans"
        style={{ fontSize: '22px', fontWeight: 700 }}
      >
        {pct}%
      </text>
      <text
        x="60"
        y="100"
        textAnchor="middle"
        className="fill-mist font-mono"
        style={{ fontSize: '7px', letterSpacing: '0.15em' }}
      >
        FUNDED
      </text>
    </svg>
  );
}
