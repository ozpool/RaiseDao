import { BufferGeometry, Float32BufferAttribute } from 'three';

/** Builds a round brilliant-cut diamond as a faceted geometry: a flat table on
 *  top, a ring of crown facets down to the widest girdle, then pavilion facets
 *  converging to the culet point at the bottom. Returned non-indexed so each
 *  facet keeps its own flat normal — that hard-edged faceting is what makes a
 *  refractive material throw sparkle. Centred on the origin, ~unit radius. */
export function buildBrilliant(segments = 16): BufferGeometry {
  const TABLE_R = 0.58;
  const GIRDLE_R = 1.0;
  const CROWN_H = 0.42; // table plane height above the girdle
  const PAVILION_D = 1.05; // culet depth below the girdle

  const table: number[][] = [];
  const girdle: number[][] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    table.push([c * TABLE_R, CROWN_H, s * TABLE_R]);
    // Girdle ring offset by half a step so crown/pavilion facets zig-zag like a
    // real brilliant rather than reading as a smooth cone.
    const ao = a + Math.PI / segments;
    girdle.push([Math.cos(ao) * GIRDLE_R, 0, Math.sin(ao) * GIRDLE_R]);
  }
  const tableCenter = [0, CROWN_H, 0];
  const culet = [0, -PAVILION_D, 0];

  const pos: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => pos.push(...a, ...b, ...c);

  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    // Flat table fan.
    tri(tableCenter, table[i]!, table[j]!);
    // Crown: two facets bridging table edge to the offset girdle points.
    tri(table[i]!, girdle[i]!, table[j]!);
    tri(table[j]!, girdle[i]!, girdle[j]!);
    // Pavilion facet down to the culet.
    tri(girdle[i]!, culet, girdle[j]!);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geometry.computeVertexNormals(); // per-facet flat normals (non-indexed)
  return geometry;
}
