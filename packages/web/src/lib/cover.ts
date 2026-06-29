/** A deterministic cover "image" for a campaign, derived from its vault address —
 *  campaigns carry no uploaded hero image, so we generate a distinct on-brand
 *  gradient per address instead. Same vault → same cover every render (no flicker,
 *  no network). Picks one of the palette accents and an angle from a tiny hash. */

// A wide on-brand palette so each campaign reads as its own colour. Every entry
// is a bright accent (a) paired with a deep shadow (b) for the gradient. Spread
// across the wheel and de-duplicated by hue so neighbours in the list look
// distinct. Picked by a hash of the vault address, so a campaign's colour is
// stable across renders.
const ACCENTS: { a: string; b: string }[] = [
  { a: '#3FE9E0', b: '#10495f' }, // cyan
  { a: '#2FD0C4', b: '#0f4a44' }, // teal
  { a: '#34D399', b: '#0f4435' }, // emerald
  { a: '#4ADE80', b: '#15482a' }, // green
  { a: '#A3E635', b: '#3a4a12' }, // lime
  { a: '#D9E021', b: '#4a4a0f' }, // chartreuse
  { a: '#E8B86D', b: '#5e3f17' }, // gold
  { a: '#FBBF24', b: '#5a3f0c' }, // amber
  { a: '#FB923C', b: '#5a300f' }, // orange
  { a: '#F97362', b: '#5a201c' }, // coral
  { a: '#FB7185', b: '#5a1a28' }, // salmon
  { a: '#F43F5E', b: '#560f22' }, // rose
  { a: '#EC4899', b: '#530f37' }, // pink
  { a: '#E85AD0', b: '#511148' }, // fuchsia
  { a: '#C863F0', b: '#451f63' }, // magenta
  { a: '#A974FF', b: '#341d5a' }, // amethyst
  { a: '#7C5CFF', b: '#241d49' }, // violet
  { a: '#8B7BFF', b: '#262150' }, // periwinkle
  { a: '#6366F1', b: '#1e1f57' }, // indigo
  { a: '#5B8DEF', b: '#15274f' }, // royal
  { a: '#3B82F6', b: '#11305a' }, // blue
  { a: '#38BDF8', b: '#0f3a52' }, // sky
  { a: '#22D3EE', b: '#0d3f4d' }, // aqua
  { a: '#5EEAD4', b: '#114a43' }, // mint
  { a: '#86EFAC', b: '#1c4a30' }, // sage
  { a: '#FACC15', b: '#534409' }, // sunflower
  { a: '#FF8A4C', b: '#562a10' }, // tangerine
  { a: '#FF6B9D', b: '#54142f' }, // flamingo
  { a: '#D08CFF', b: '#3d1f55' }, // orchid
  { a: '#9F7AEA', b: '#2e2150' }, // lavender
  { a: '#60A5FA', b: '#142c52' }, // cornflower
  { a: '#4FD1C5', b: '#0f4742' }, // turquoise
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
