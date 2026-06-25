import { Color } from 'three';

/** The Trust Core's static layout: a rounded-cube cluster of instanced cubes
 *  with deliberate porosity (gaps) so it reads as an airy sci-fi core, not a
 *  solid block. Cubes are NOT uniform — they shrink toward the surface and a
 *  shell of tiny "dust" cubes breaks up the edges, so the silhouette is uneven
 *  and organic instead of a clean box. Generated once with a seeded PRNG so the
 *  layout is stable across renders (no hydration flicker). Most cubes are
 *  neutral; a sparse set carry the data accents — cyan/blue, plus magenta/pink
 *  for depth (UI.md §2). */
export interface CoreData {
  positions: Float32Array; // xyz per instance, in local units
  colors: Float32Array; // rgb per instance (linear-ish, set via Color)
  scales: Float32Array; // per-instance edge length, in local units
  emissive: Float32Array; // per-instance emissive strength; >0 only on accents
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

const NEUTRAL_LIGHT = '#C2CCE0'; // cool brushed metal, lifted so the silhouette reads
const NEUTRAL_DARK = '#323A4C'; // cool shadow block, lifted off the void
const ACCENTS = ['#3FE9E0', '#4A6BFF', '#C863F0', '#FF8FD6']; // cyan, blue, magenta, pink

export interface CoreOptions {
  /** 'low' thins the grid and dust for mobile/low-power devices. */
  quality?: 'high' | 'low';
}

export function buildCore(seed = 1337, { quality = 'high' }: CoreOptions = {}): CoreData {
  const rand = mulberry32(seed);
  const low = quality === 'low';
  const N = low ? 4 : 5; // grid spans -N..N on each axis
  const bound = N + 0.6;
  const spacing = 0.4; // a touch tighter so the whole core sits inside the frame
  const pos: number[] = [];
  const col: number[] = [];
  const scl: number[] = [];
  const emi: number[] = [];
  const fill: number[] = [];
  const c = new Color();
  let maxR = 0;

  // One place to push a cube so the structural body and the dust share colour /
  // emissive logic. accentBias raises the odds a dust mote glows (they twinkle).
  const push = (px: number, py: number, pz: number, size: number, accentBias: number) => {
    pos.push(px, py, pz);
    scl.push(size);
    fill.push((py / spacing + N) / (2 * N)); // 0 at the bottom, 1 at the top
    const accent = ACCENTS[Math.floor(rand() * ACCENTS.length)] ?? NEUTRAL_LIGHT;
    const isAccent = rand() < 0.18 + accentBias;
    const hex = isAccent ? accent : rand() < 0.5 ? NEUTRAL_LIGHT : NEUTRAL_DARK;
    c.set(hex);
    col.push(c.r, c.g, c.b);
    // Only accents emit, with variance so the bloom field breathes.
    emi.push(isAccent ? 2.2 + rand() * 1.8 : 0);
    const r = Math.hypot(px, py, pz);
    if (r > maxR) maxR = r;
  };

  // 1) Structural body — rounded-cube grid, cubes shrinking toward the surface
  //    and thinning out (more porous at the edges) so it ends in broken detail.
  for (let x = -N; x <= N; x++) {
    for (let y = -N; y <= N; y++) {
      for (let z = -N; z <= N; z++) {
        const rNorm = Math.hypot(x, y, z) / bound; // 0 centre → ~1 surface
        // Superquadric (exponent 4) keeps cells inside a rounded cube.
        const inside =
          Math.abs(x / bound) ** 4 + Math.abs(y / bound) ** 4 + Math.abs(z / bound) ** 4 <= 1;
        if (!inside) continue;
        // Porosity grows with radius: dense heart, airy crumbling shell.
        if (rand() < 0.1 + 0.42 * rNorm * rNorm) continue;

        // Big in the body (~0.3), small at the rim (~0.15), with jitter.
        const size = (0.3 - 0.15 * rNorm) * (0.78 + rand() * 0.5);
        push(x * spacing, y * spacing, z * spacing, size, 0);
      }
    }
  }

  // 2) Dust shell — hundreds of tiny motes scattered just outside the body, on a
  //    rounded-cube surface with jitter, so the edges dissolve into sparks.
  const DUST = low ? 150 : 340;
  const surf = bound * spacing;
  for (let i = 0; i < DUST; i++) {
    // Random direction; bias each axis toward the cube faces for a boxier shell.
    const dx = rand() * 2 - 1;
    const dy = rand() * 2 - 1;
    const dz = rand() * 2 - 1;
    const len = Math.hypot(dx, dy, dz) || 1;
    const shell = 0.92 + rand() * 0.5; // 0.92–1.42 of the body radius
    const px = (dx / len) * surf * shell;
    const py = (dy / len) * surf * shell;
    const pz = (dz / len) * surf * shell;
    const size = 0.04 + rand() * 0.09; // dust: tiny
    push(px, py, pz, size, 0.25);
  }

  return {
    positions: new Float32Array(pos),
    colors: new Float32Array(col),
    scales: new Float32Array(scl),
    emissive: new Float32Array(emi),
    fillHeight: new Float32Array(fill),
    count: pos.length / 3,
    radius: maxR,
  };
}
