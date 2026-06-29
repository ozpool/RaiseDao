import { Color } from 'three';

/** The colour story as three stops sampled by the morph's `palette` value
 *  (0 = cyan custody, 1 = magenta governance, 2 = gold release). Every coloured
 *  layer — shell attenuation, core, edges, liquid — reads the same stops so they
 *  shift in lockstep. Hand a Color in and out to avoid per-frame allocation. */
export interface PaletteStops {
  atten: Color[];
  core: Color[];
  edge: Color[];
  liquid: Color[];
  waterline: Color[];
}

const hex = (a: string, b: string, c: string) => [new Color(a), new Color(b), new Color(c)];

export function buildPalette(): PaletteStops {
  return {
    atten: hex('#bfeaff', '#e29bff', '#ffd98a'),
    core: hex('#3fe9e0', '#d06bf5', '#ffcf6b'),
    edge: hex('#7ff4ec', '#e08bff', '#ffd98a'),
    liquid: hex('#15c7d6', '#b84ff0', '#ffc24d'),
    waterline: hex('#c7f8ff', '#f3c9ff', '#fff0c2'),
  };
}

/** Lerp `out` to the colour at position `p` (0..2) across the three stops. */
export function sampleStops(out: Color, stops: Color[], p: number): Color {
  const clamped = Math.max(0, Math.min(stops.length - 1, p));
  const i = Math.floor(clamped);
  const j = Math.min(stops.length - 1, i + 1);
  return out.copy(stops[i]!).lerp(stops[j]!, clamped - i);
}
