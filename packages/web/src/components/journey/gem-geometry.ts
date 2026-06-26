import { BufferGeometry, Float32BufferAttribute } from 'three';

/** A symmetric faceted bipyramid — two pyramids joined at a central girdle ring,
 *  so it's mirror-symmetric top-to-bottom (the clean ◇ crystal silhouette rather
 *  than a flat-topped brilliant cut). Non-indexed so each facet keeps a flat
 *  normal — sharp facets are what give a refractive material its cut-gem sparkle.
 *  Centred on the origin; `radius` is the girdle half-width, `height` each apex. */
export function buildGem(sides = 8, radius = 1, height = 1.18): BufferGeometry {
  const girdle: number[][] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    girdle.push([Math.cos(a) * radius, 0, Math.sin(a) * radius]);
  }
  const top = [0, height, 0];
  const bottom = [0, -height, 0];

  const pos: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => pos.push(...a, ...b, ...c);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    tri(top, girdle[i]!, girdle[j]!); // upper pyramid facet
    tri(bottom, girdle[j]!, girdle[i]!); // lower pyramid facet (wound the other way)
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geometry.computeVertexNormals(); // flat per-facet normals (non-indexed)
  return geometry;
}
