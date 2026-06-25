import { Color } from 'three';

/** The Trust Core's static layout: a rounded-cube cluster of instanced cubes
 *  with deliberate porosity (gaps) so it reads as an airy sci-fi core, not a
 *  solid block. Generated once with a seeded PRNG so the layout is stable across
 *  renders (no hydration flicker). Most cubes are neutral; a sparse set carry the
 *  data accents — cyan/blue, plus magenta/pink for depth (UI.md §2). */
export interface CoreData {
  positions: Float32Array; // xyz per instance, in local units
  colors: Float32Array; // rgb per instance (linear-ish, set via Color)
  fillHeight: Float32Array; // 0..1 normalised Y, for the funding waterline
  count: number;
  radius: number; // max distance of any cube from centre (for scatter falloff)
}

// Mulberry32 — a tiny deterministic PRNG so the cluster is identical every build.
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NEUTRAL_LIGHT = '#AEB8CC'; // cool brushed metal, faintly blue
const NEUTRAL_DARK = '#262C3A'; // cool shadow block
const ACCENTS = ['#3FE9E0', '#4A6BFF', '#C863F0', '#FF8FD6']; // cyan, blue, magenta, pink

export function buildCore(seed = 1337): CoreData {
  const rand = mulberry32(seed);
  const N = 5; // grid spans -N..N on each axis — denser cluster, more cubes
  const bound = N + 0.6;
  const spacing = 0.42;
  const pos: number[] = [];
  const col: number[] = [];
  const fill: number[] = [];
  const c = new Color();

  for (let x = -N; x <= N; x++) {
    for (let y = -N; y <= N; y++) {
      for (let z = -N; z <= N; z++) {
        // Superquadric (exponent 4) keeps cells inside a rounded cube.
        const inside =
          Math.abs(x / bound) ** 4 + Math.abs(y / bound) ** 4 + Math.abs(z / bound) ** 4 <= 1;
        if (!inside) continue;
        if (rand() < 0.22) continue; // light porosity — keep it dense but breathing

        pos.push(x * spacing, y * spacing, z * spacing);
        fill.push((y + N) / (2 * N)); // 0 at the bottom, 1 at the top

        const accent = ACCENTS[Math.floor(rand() * ACCENTS.length)] ?? NEUTRAL_LIGHT;
        const hex = rand() < 0.2 ? accent : rand() < 0.5 ? NEUTRAL_LIGHT : NEUTRAL_DARK;
        c.set(hex);
        col.push(c.r, c.g, c.b);
      }
    }
  }

  return {
    positions: new Float32Array(pos),
    colors: new Float32Array(col),
    fillHeight: new Float32Array(fill),
    count: pos.length / 3,
    radius: bound * spacing,
  };
}
