import type { MeshStandardMaterial } from 'three';

/** Inject a per-instance emissive term into the standard material. InstancedMesh
 *  has no native per-instance emissive, so accent cubes can't "glow" on their own
 *  out of the box. We add an `aEmissive` instanced attribute and add
 *  `vColor * vEmissive` to the emissive radiance — only accents (strength > 0)
 *  light up, which is exactly what the selective bloom keys off of. */
export function patchEmissive(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aEmissive;\nvarying float vEmissive;',
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEmissive = aEmissive;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vEmissive;')
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor * vEmissive;',
      );
  };
}
