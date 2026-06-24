/** The signature object's public contract (UI.md §5). One shader, two LODs. */
export type VaultLod = 'full' | 'card';
export type VaultState = 'loading' | 'live' | 'unlocking';

export interface VaultProps {
  /** 0..1, real fundsRaised / fundsTarget. */
  fillLevel: number;
  /** `full` = hero/detail (~1.3k tris); `card` = cheap grid variant (~80 tris). */
  lod?: VaultLod;
  state?: VaultState;
  /** Set to 1 on a milestone release; the material decays it back to 0. */
  seamPulse?: number;
  /** Mocked (non-live) data renders in a visibly distinct placeholder treatment. */
  mock?: boolean;
  /** Freeze rotation and hold a static frame (prefers-reduced-motion). */
  reducedMotion?: boolean;
}

/** Triangle detail per LOD, kept under the UI.md budgets (full ≤ ~2k tris). */
export const LOD_DETAIL: Record<VaultLod, number> = { full: 3, card: 1 };
