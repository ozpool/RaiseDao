/** The minimal shape of a vote the aggregator needs — a subset of the Vote model
 *  so the pure function has no Mongoose dependency and stays unit-testable. */
export interface VoteLike {
  proposalId: string;
  support: number; // 0 against, 1 for, 2 abstain
  weight: string; // snapshot voting power as a decimal string (uint256)
}

/** Token-weighted totals for one proposal. Weights are kept as decimal strings
 *  because they're uint256 — they can exceed Number.MAX_SAFE_INTEGER, so we sum
 *  with BigInt and never coerce to a float. */
export interface Tally {
  proposalId: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  voters: number;
}

/** Fold a flat list of votes into per-proposal tallies. Pure: same input → same
 *  output, no DB, no clock — this is what the route and the socket snapshot both
 *  call, and what the unit tests exercise directly. */
export function aggregateTallies(votes: VoteLike[]): Tally[] {
  const byProposal = new Map<
    string,
    { for: bigint; against: bigint; abstain: bigint; n: number }
  >();

  for (const vote of votes) {
    const acc = byProposal.get(vote.proposalId) ?? { for: 0n, against: 0n, abstain: 0n, n: 0 };
    const weight = safeBigInt(vote.weight);
    if (vote.support === 1) acc.for += weight;
    else if (vote.support === 0) acc.against += weight;
    else if (vote.support === 2) acc.abstain += weight;
    acc.n += 1;
    byProposal.set(vote.proposalId, acc);
  }

  return [...byProposal.entries()].map(([proposalId, acc]) => ({
    proposalId,
    forVotes: acc.for.toString(),
    againstVotes: acc.against.toString(),
    abstainVotes: acc.abstain.toString(),
    voters: acc.n,
  }));
}

/** A malformed weight must not crash the whole tally — treat it as zero. */
function safeBigInt(value: string): bigint {
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}
