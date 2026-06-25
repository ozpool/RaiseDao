'use client';

import { milestoneTotal, type WizardMilestone } from './wizard-types';

const W = 120;
const H = 160;
const VX = 30; // vault body left
const VW = 60; // vault body width
const VTOP = 16;
const VBOT = 144;
const VH = VBOT - VTOP;

/** A wireframe vault that gains a horizontal facet per milestone, each band's
 *  height proportional to its release share — the schedule made tangible without
 *  paying for live 3D (UI.md cinematic-lite: cards/previews use cheap SVG). When
 *  shares don't yet sum to 100% the remainder shows as an empty, dashed cap. */
export function VaultWireframe({ milestones }: { milestones: WizardMilestone[] }) {
  const total = milestoneTotal(milestones);
  let cum = 0; // percent accumulated from the bottom
  const bands = milestones.map((m, i) => {
    const pct = Number.isFinite(m.pct) ? Math.max(0, m.pct) : 0;
    const yBottom = VBOT - (cum / 100) * VH;
    cum += pct;
    const yTop = VBOT - (Math.min(cum, 100) / 100) * VH;
    return { i, pct, yTop, height: Math.max(0, yBottom - yTop), opacity: 0.18 + i * 0.12 };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Vault preview">
      <defs>
        <clipPath id="vaultBody">
          <rect x={VX} y={VTOP} width={VW} height={VH} rx={12} />
        </clipPath>
      </defs>

      {/* Empty remainder above the filled facets. */}
      <rect x={VX} y={VTOP} width={VW} height={VH} rx={12} fill="#13151A" />

      <g clipPath="url(#vaultBody)">
        {bands.map((b) => (
          <g key={b.i}>
            <rect
              x={VX}
              y={b.yTop}
              width={VW}
              height={b.height}
              fill="#38E0D8"
              fillOpacity={Math.min(b.opacity, 0.7)}
            />
            <line x1={VX} y1={b.yTop} x2={VX + VW} y2={b.yTop} stroke="#0A0B0E" strokeWidth={1} />
            {b.height > 9 && (
              <text
                x={VX + VW / 2}
                y={b.yTop + b.height / 2 + 3}
                textAnchor="middle"
                className="fill-paper font-mono"
                style={{ fontSize: 8 }}
              >
                {b.pct}%
              </text>
            )}
          </g>
        ))}
      </g>

      {/* Vault outline + a hairline cap so it reads as a vessel. */}
      <rect
        x={VX}
        y={VTOP}
        width={VW}
        height={VH}
        rx={12}
        fill="none"
        stroke={total === 100 ? '#38E0D8' : '#23262E'}
        strokeWidth={1.5}
      />
      <text
        x={W / 2}
        y={VBOT + 12}
        textAnchor="middle"
        className="fill-mist font-mono"
        style={{ fontSize: 7, letterSpacing: 1 }}
      >
        {total}% ALLOCATED
      </text>
    </svg>
  );
}
