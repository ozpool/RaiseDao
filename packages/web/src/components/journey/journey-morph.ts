/** The whole gem morph derived from one scroll value. `progress` (0..1) spans the
 *  pinned section; this maps it to every animatable quantity the gem needs. Pure
 *  math, no Three.js — so the beat windows and curves are trivial to retune and
 *  unit-test. The scene reads this each frame and damps toward the result. */

export interface MorphState {
  fill: number; // 0..1  liquid height inside the shell
  lock: number; // 0..1  the seal ring's presence — ramps in and stays sealed
  seal: number; // 0..1  the lock flash itself (a 0→1→0 pulse at the moment it snaps)
  palette: number; // 0=cyan 1=magenta 2=gold — lerp through it for the colour story
  lift: number; // 0..1  top half rising as the gem cracks open
  pour: number; // 0..1  gold particle emission
  reseal: number; // 0..1  re-close, brighter — trust compounded
  relock: number; // 0..1  the second flash as the gem re-seals on the loop
}

// One source of truth for pacing: where each of the six beats begins (0..1). The
// captions, the rail AND the gem morph all read these, so the spoken beat and the
// gem's state can never drift apart. A short intro, then five evenly-sized action
// beats — no beat hogs the scroll, none flies by.
export const BEAT_STARTS = [0, 0.1, 0.3, 0.48, 0.66, 0.84] as const;

/** Which beat (0..5) the scroll is in — the slice that owns this progress. */
export function activeBeat(p: number): number {
  let i = 0;
  for (let b = 0; b < BEAT_STARTS.length; b++) if (p >= BEAT_STARTS[b]!) i = b;
  return i;
}

// Each beat's morph runs over the first ~75% of its slice, then holds for the rest
// (an even action→settle rhythm), so every beat feels the same weight of scroll.
const FILL: [number, number] = [0.12, 0.26];
const LOCK: [number, number] = [0.32, 0.44];
const VOTE: [number, number] = [0.5, 0.62];
const RELEASE: [number, number] = [0.68, 0.8];
const LOOP: [number, number] = [0.86, 0.98];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** 0 before the window, ramps 0→1 across it, 1 after. */
export function ramp(p: number, [a, b]: [number, number]): number {
  return clamp01((p - a) / (b - a));
}

/** A single 0→1→0 swell across the window — the lock "clunk". */
export function pulse(p: number, [a, b]: [number, number]): number {
  return Math.sin(clamp01((p - a) / (b - a)) * Math.PI);
}

/** Colour position: cyan through the early beats, cyan→magenta on the vote,
 *  magenta→gold on the release, then settles gold. */
function paletteFor(p: number): number {
  if (p < VOTE[0]) return 0;
  if (p < VOTE[1]) return ramp(p, VOTE); // 0 → 1
  if (p < RELEASE[1]) return 1 + ramp(p, RELEASE); // 1 → 2
  return 2;
}

export function morphState(p: number): MorphState {
  const drain = ramp(p, RELEASE); // release empties the liquid as gold takes over
  return {
    fill: ramp(p, FILL) * (1 - drain),
    lock: ramp(p, LOCK),
    seal: pulse(p, LOCK),
    palette: paletteFor(p),
    lift: ramp(p, RELEASE),
    pour: ramp(p, RELEASE),
    reseal: ramp(p, LOOP),
    relock: pulse(p, LOOP),
  };
}
