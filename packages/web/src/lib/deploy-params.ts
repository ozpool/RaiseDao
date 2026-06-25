import type { DraftRecord } from './api';

/**
 * Governance + scheduling defaults the wizard doesn't collect but the factory
 * needs. The Governor uses the default block-number clock, so voting windows are
 * in blocks (~12s each on Arbitrum). These are sensible starting points for a
 * testnet campaign; tuning them per-campaign is governance's concern (#29).
 */
export const DEPLOY_DEFAULTS = {
  votingDelay: 300, // ~1 hour before voting opens
  votingPeriod: 7200, // ~1 day voting window
  proposalThreshold: 0n, // must be 0 — founders hold no soulbound votes
  quorumNumerator: 10n, // 10% of votes must participate
  timelockDelay: 172800n, // 2 days (seconds) before a passed release executes
  milestoneSpacingDays: 30, // each milestone falls due this long after the last
} as const;

const DAY = 86_400;

/** Map a saved draft into the factory's CampaignParams tuple. Milestone deadlines
 *  are derived (evenly spaced after the funding close) since the wizard collects
 *  only release shares. `founder` is the connected wallet. */
export function toCampaignParams(draft: DraftRecord, founder: `0x${string}`) {
  const fundingDeadline = BigInt(Math.floor(Date.now() / 1000) + draft.fundingDurationDays * DAY);
  const spacing = BigInt(DEPLOY_DEFAULTS.milestoneSpacingDays * DAY);
  return {
    founder,
    fundingDeadline,
    pctBps: draft.milestones.map((m) => m.pctBps),
    deadlines: draft.milestones.map((_, i) => fundingDeadline + spacing * BigInt(i + 1)),
    votingDelay: DEPLOY_DEFAULTS.votingDelay,
    votingPeriod: DEPLOY_DEFAULTS.votingPeriod,
    proposalThreshold: DEPLOY_DEFAULTS.proposalThreshold,
    quorumNumerator: DEPLOY_DEFAULTS.quorumNumerator,
    timelockDelay: DEPLOY_DEFAULTS.timelockDelay,
    tokenName: draft.tokenName,
    tokenSymbol: draft.tokenSymbol,
  };
}
