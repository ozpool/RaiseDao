/** On-chain milestone lifecycle, mirrored from RaiseVault (issue #7). */
export enum MilestoneStatus {
  Pending = 0,
  Active = 1,
  Passed = 2,
  Failed = 3,
  Released = 4,
}

/** GovToken base units minted per 1 USDC (6-decimal) contributed. */
export const GOV_TOKEN_RATE = 1n;

/** Basis-points denominator (100% = 10_000 bps). */
export const BPS_DENOMINATOR = 10_000n;

/** Governor parameters, mirrored in MilestoneGovernor (issue #8). */
export const GOVERNOR = {
  /** Delay between proposal and voting start, in days. */
  votingDelayDays: 1n,
  /** Voting window length, in days. */
  votingPeriodDays: 3n,
  /** Quorum as a fraction of total supply, in basis points (30%). */
  quorumBps: 3_000n,
  /** Execution timelock after a passing vote, in days. */
  timelockDelayDays: 2n,
} as const;
