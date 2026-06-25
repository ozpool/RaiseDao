import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector2 } from 'three';

/** Tracks the pointer over the R3F canvas in normalised device coords, plus a
 *  `hovering` flag so the core can spring its cubes home when the cursor leaves.
 *  Returns refs (no re-renders) so the frame loop allocates nothing. Disabled
 *  under reduced motion. */
export function useCorePointer(enabled: boolean) {
  const { gl } = useThree();
  const pointer = useRef(new Vector2());
  const hovering = useRef(false);
  // Memo so consumers get a stable object across renders.
  const handle = useMemo(() => ({ pointer, hovering }), []);

  useEffect(() => {
    if (!enabled) {
      hovering.current = false;
      return;
    }
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      hovering.current = true;
    };
    const leave = () => (hovering.current = false);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [gl, enabled]);

  return handle;
}
