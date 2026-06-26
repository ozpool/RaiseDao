/**
 * Off-chain scam-risk heuristics (#35). Deliberately a *signal* surface, not a
 * verdict: it scores a campaign from cheap, already-indexed data so an admin can
 * triage what to review. It never touches funds or votes — it only ranks.
 *
 * Each signal contributes points; the total (capped at 100) maps to a level.
 * Inputs are pre-aggregated by the store so this stays pure and unit-testable.
 */

export interface ScoreInput {
  status: string;
  verified: boolean;
  raiseTarget: string; // decimal USDC; parsed loosely — heuristic, not accounting
  /** Milestone schedule shares in basis points, in order. */
  schedule: number[];
  /** Total campaigns this founder has launched (incl. this one). */
  founderCampaignCount: number;
  /** How many of the founder's campaigns have failed. */
  founderFailedCount: number;
  /** Days since the founder's first seen campaign — a wallet-age proxy. */
  founderTenureDays: number;
}

export interface ScoreSignal {
  key: string;
  label: string;
  points: number;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ScoreResult {
  score: number;
  level: RiskLevel;
  signals: ScoreSignal[];
}

function levelFor(score: number): RiskLevel {
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

export function scoreCampaign(input: ScoreInput): ScoreResult {
  const signals: ScoreSignal[] = [];
  const add = (key: string, label: string, points: number) => signals.push({ key, label, points });

  if (input.founderFailedCount > 0) {
    const n = input.founderFailedCount;
    add(
      'prior-failures',
      `${n} prior failed raise${n > 1 ? 's' : ''} by this founder`,
      Math.min(40, n * 25),
    );
  }

  const firstShare = input.schedule[0] ?? 0;
  if (firstShare >= 6000) {
    add(
      'front-loaded',
      `Front-loaded schedule — ${(firstShare / 100).toFixed(0)}% released first`,
      20,
    );
  }

  if (!input.verified) {
    add('unverified', 'Founder identity unverified', 10);
  }

  if (input.founderTenureDays >= 0 && input.founderTenureDays < 7) {
    add('new-wallet', 'New founder wallet (under 7 days old)', 15);
  }

  const target = Number(input.raiseTarget);
  if (Number.isFinite(target) && target > 1_000_000) {
    add('high-target', 'Unusually high raise target', 10);
  }

  if (input.founderCampaignCount > 3) {
    add('many-campaigns', `Founder runs ${input.founderCampaignCount} campaigns`, 10);
  }

  const score = Math.min(
    100,
    signals.reduce((sum, s) => sum + s.points, 0),
  );
  return { score, level: levelFor(score), signals };
}
