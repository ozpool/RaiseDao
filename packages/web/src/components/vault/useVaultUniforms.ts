import { useMemo, useRef } from 'react';
import { Color, type IUniform } from 'three';
import type { VaultProps } from './types';

/** Token colors the shader needs, kept in one place (UI.md §2). */
const COLORS = {
  base: '#13151A', // panel
  fill: '#3A5BE0', // signal, deepened so the cyan edge reads as the energy
  data: '#38E0D8', // cyan data accent — rim + waterline glow
  gold: '#E8B86D', // gold-unlock
  mist: '#8A8F9C', // mist
};

export interface VaultUniforms {
  uFillLevel: IUniform<number>;
  uSeamPulse: IUniform<number>;
  uUnlock: IUniform<number>;
  uPlaceholder: IUniform<number>;
  uFresnelPow: IUniform<number>;
  uColorBase: IUniform<Color>;
  uColorFill: IUniform<Color>;
  uColorData: IUniform<Color>;
  uColorGold: IUniform<Color>;
  uColorMist: IUniform<Color>;
  [uniform: string]: IUniform;
}

const approach = (current: number, target: number, delta: number, rate: number): number =>
  current + (target - current) * Math.min(1, delta * rate);

/**
 * Owns the shader uniforms and advances them each frame. Returns a stable
 * uniforms object plus `applyFrame`, which smooths the fill waterline, eases the
 * unlock/placeholder tints, and fires-then-decays the gold seam pulse. Under
 * reduced motion the pulse is held at 0 (UI.md §5) — the static frame stays calm.
 */
export function useVaultUniforms() {
  const uniforms = useMemo<VaultUniforms>(
    () => ({
      uFillLevel: { value: 0 },
      uSeamPulse: { value: 0 },
      uUnlock: { value: 0 },
      uPlaceholder: { value: 0 },
      uFresnelPow: { value: 3.0 },
      uColorBase: { value: new Color(COLORS.base) },
      uColorFill: { value: new Color(COLORS.fill) },
      uColorData: { value: new Color(COLORS.data) },
      uColorGold: { value: new Color(COLORS.gold) },
      uColorMist: { value: new Color(COLORS.mist) },
    }),
    [],
  );

  const pulse = useRef(0);
  const lastSeamProp = useRef(0);

  const applyFrame = (props: VaultProps, delta: number): void => {
    // Under reduced motion every value snaps to its target — no eased sweep of
    // the waterline or tint when a control changes (UI.md §1, WCAG 2.3.3).
    const reduced = props.reducedMotion ?? false;
    const ease = (current: number, target: number, rate: number): number =>
      reduced ? target : approach(current, target, delta, rate);

    const fill = Math.min(1, Math.max(0, props.fillLevel));
    uniforms.uFillLevel.value = ease(uniforms.uFillLevel.value, fill, 4);

    const unlockTarget = props.state === 'unlocking' ? 1 : 0;
    uniforms.uUnlock.value = ease(uniforms.uUnlock.value, unlockTarget, 3);

    const placeholderTarget = props.mock ? 1 : props.state === 'loading' ? 0.6 : 0;
    uniforms.uPlaceholder.value = ease(uniforms.uPlaceholder.value, placeholderTarget, 3);

    const seamProp = props.seamPulse ?? 0;
    if (!reduced && seamProp > lastSeamProp.current) pulse.current = seamProp;
    lastSeamProp.current = seamProp;

    pulse.current = reduced ? 0 : Math.max(0, pulse.current - delta); // ~1s decay
    uniforms.uSeamPulse.value = pulse.current;
  };

  return { uniforms, applyFrame };
}
