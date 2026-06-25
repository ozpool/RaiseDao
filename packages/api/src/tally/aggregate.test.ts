import { describe, it, expect } from 'vitest';
import { aggregateTallies, type VoteLike } from './aggregate.js';

const v = (proposalId: string, support: number, weight: string): VoteLike => ({
  proposalId,
  support,
  weight,
});

describe('aggregateTallies', () => {
  it('sums weights into for / against / abstain per proposal', () => {
    const tallies = aggregateTallies([
      v('1', 1, '100'),
      v('1', 1, '50'),
      v('1', 0, '30'),
      v('1', 2, '10'),
    ]);
    expect(tallies).toHaveLength(1);
    expect(tallies[0]).toMatchObject({
      proposalId: '1',
      forVotes: '150',
      againstVotes: '30',
      abstainVotes: '10',
      voters: 4,
    });
  });

  it('keeps separate proposals separate', () => {
    const tallies = aggregateTallies([v('1', 1, '100'), v('2', 0, '200')]);
    const byId = Object.fromEntries(tallies.map((t) => [t.proposalId, t]));
    expect(byId['1']).toMatchObject({ forVotes: '100', againstVotes: '0' });
    expect(byId['2']).toMatchObject({ forVotes: '0', againstVotes: '200' });
  });

  it('sums uint256 weights beyond Number.MAX_SAFE_INTEGER without precision loss', () => {
    const big = '9007199254740993'; // 2^53 + 1, not exactly representable as a float
    const tallies = aggregateTallies([v('1', 1, big), v('1', 1, big)]);
    expect(tallies[0]!.forVotes).toBe('18014398509481986');
  });

  it('treats a malformed weight as zero rather than throwing', () => {
    const tallies = aggregateTallies([v('1', 1, 'not-a-number'), v('1', 1, '5')]);
    expect(tallies[0]!.forVotes).toBe('5');
  });

  it('returns an empty list for no votes', () => {
    expect(aggregateTallies([])).toEqual([]);
  });
});
