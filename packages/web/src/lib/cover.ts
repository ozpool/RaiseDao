/** A deterministic cover "image" for a campaign, derived from its vault address —
 *  campaigns carry no uploaded hero image, so we generate a distinct on-brand
 *  gradient per address instead. Same vault → same cover every render (no flicker,
 *  no network). Picks one of the palette accents and an angle from a tiny hash. */

const ACCENTS: { a: string; b: string }[] = [
  { a: '#3FE9E0', b: '#10495f' }, // cyan
  { a: '#C863F0', b: '#451f63' }, // magenta
  { a: '#E8B86D', b: '#5e3f17' }, // gold
  { a: '#7C5CFF', b: '#241d49' }, // violet
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface Cover {
  background: string;
  accent: string;
}

export function coverFor(seed: string): Cover {
  const h = hash(seed || 'raisedao');
  const acc = ACCENTS[h % ACCENTS.length]!;
  const angle = h % 360;
  const background = [
    `radial-gradient(120% 100% at 18% 0%, ${acc.a}33, transparent 55%)`,
    `radial-gradient(130% 120% at 100% 100%, ${acc.b}88, transparent 62%)`,
    `linear-gradient(${angle}deg, #0d1014, #14181f)`,
  ].join(', ');
  return { background, accent: acc.a };
}
