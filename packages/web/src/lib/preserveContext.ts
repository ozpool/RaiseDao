import type { RootState } from '@react-three/fiber';

/** R3F `onCreated` handler that keeps a WebGL canvas alive across a lost context.
 *  Two canvases (hero + journey) plus dev hot-reloads can exhaust the browser's
 *  GPU context slots, which fires `webglcontextlost` and otherwise leaves the
 *  canvas permanently black. Calling preventDefault tells the browser the page
 *  will recover, which lets it fire `webglcontextrestored` and rebuild the scene
 *  instead of giving up. Purely defensive; no effect when nothing is lost. */
export function preserveContext({ gl }: RootState): void {
  const canvas = gl.domElement;
  canvas.addEventListener(
    'webglcontextlost',
    (e) => {
      e.preventDefault();
    },
    false,
  );
}
