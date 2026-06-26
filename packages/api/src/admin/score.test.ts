import { describe, it, expect } from 'vitest';
import { scoreCampaign, type ScoreInput } from './score.js';

const base = (overrides: Partial<ScoreInput> = {}): ScoreInput => ({
  status: 'funding',
  verified: true,
  raiseTarget: '50000',
  schedule: [3000, 3000, 4000],
  founderCampaignCount: 1,
  founderFailedCount: 0,
  founderTenureDays: 100,
  ...overrides,
});

const keys = (input: ScoreInput) => scoreCampaign(input).signals.map((s) => s.key);

describe('scoreCampaign', () => {
  it('scores a clean, established campaign as low risk with no signals', () => {
    const r = scoreCampaign(base());
    expect(r.score).toBe(0);
    expect(r.level).toBe('low');
    expect(r.signals).toHaveLength(0);
  });

  it('flags prior failed raises and scales the points', () => {
    expect(keys(base({ founderFailedCount: 1 }))).toContain('prior-failures');
    expect(scoreCampaign(base({ founderFailedCount: 1 })).score).toBe(25);
    // two failures score more, but never beyond the per-signal cap of 40
    expect(scoreCampaign(base({ founderFailedCount: 9 })).signals[0]!.points).toBe(40);
  });

  it('flags a front-loaded schedule (>=60% released first)', () => {
    expect(keys(base({ schedule: [7000, 3000] }))).toContain('front-loaded');
    expect(keys(base({ schedule: [5000, 5000] }))).not.toContain('front-loaded');
  });

  it('flags an unverified founder and a fresh wallet', () => {
    expect(keys(base({ verified: false }))).toContain('unverified');
    expect(keys(base({ founderTenureDays: 3 }))).toContain('new-wallet');
    expect(keys(base({ founderTenureDays: 30 }))).not.toContain('new-wallet');
  });

  it('combines signals into a high-risk verdict', () => {
    const r = scoreCampaign(
      base({ founderFailedCount: 1, verified: false, schedule: [8000, 2000] }),
    );
    expect(r.score).toBe(55); // 25 + 10 + 20
    expect(r.level).toBe('high');
  });

  it('caps the total score at 100', () => {
    const r = scoreCampaign(
      base({
        founderFailedCount: 3,
        verified: false,
        schedule: [9000, 1000],
        founderTenureDays: 1,
        raiseTarget: '5000000',
        founderCampaignCount: 5,
      }),
    );
    expect(r.score).toBe(100);
    expect(r.level).toBe('high');
  });
});
