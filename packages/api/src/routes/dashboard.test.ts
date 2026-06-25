import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { signToken } from '../auth/jwt.js';
import {
  InMemoryDashboardStore,
  type SeedCampaign,
  type SeedAnalytics,
  type SeedEvent,
  type SeedVote,
} from '../dashboard/store.js';

// ---- Fixtures ----

const FOUNDER = '0x1111111111111111111111111111111111111111';
const INVESTOR = '0x2222222222222222222222222222222222222222';
const OTHER = '0x9999999999999999999999999999999999999999';

const auth = (address: string) => `Bearer ${signToken({ address, roles: ['founder'] })}`;

const campaign = (overrides: Partial<SeedCampaign> = {}): SeedCampaign => ({
  campaignId: 1,
  vault: '0xaaaa000000000000000000000000000000000001',
  title: 'Solar Grid',
  status: 'active',
  raiseTarget: '50000',
  founder: FOUNDER,
  milestones: [
    { index: 0, pctBps: 4000, status: 'released' },
    { index: 1, pctBps: 6000, status: 'pending' },
  ],
  ...overrides,
});

const analytics = (overrides: Partial<SeedAnalytics> = {}): SeedAnalytics => ({
  campaignId: 1,
  contributorCount: 12,
  totalRaised: '25000',
  milestonesReleased: 1,
  milestonesFailed: 0,
  ...overrides,
});

const contribEvent = (overrides: Partial<SeedEvent> = {}): SeedEvent => ({
  campaignId: 1,
  type: 'Contributed',
  txHash: `0x${'a'.repeat(64)}`,
  blockNumber: 100,
  args: { investor: INVESTOR, amount: '1000', votesMinted: '100' },
  ...overrides,
});

const releaseEvent = (overrides: Partial<SeedEvent> = {}): SeedEvent => ({
  campaignId: 1,
  type: 'MilestoneReleased',
  txHash: `0x${'b'.repeat(64)}`,
  blockNumber: 200,
  args: { index: 0 },
  ...overrides,
});

const vote = (overrides: Partial<SeedVote> = {}): SeedVote => ({
  campaignId: 1,
  proposalId: '42',
  voter: INVESTOR,
  support: 1,
  weight: '100',
  txHash: `0x${'c'.repeat(64)}`,
  blockNumber: 150,
  ...overrides,
});

// ---- Helpers ----

function makeApp(
  campaigns: SeedCampaign[] = [],
  analytics_: SeedAnalytics[] = [],
  events: SeedEvent[] = [],
  votes: SeedVote[] = [],
): Express {
  return createApp({
    dashboardStore: new InMemoryDashboardStore(campaigns, analytics_, events, votes),
  });
}

// ---- Tests ----

describe('GET /dashboard/founder', () => {
  let app: Express;

  beforeEach(() => {
    app = makeApp(
      [
        campaign(),
        campaign({
          campaignId: 2,
          vault: '0xbbbb000000000000000000000000000000000002',
          title: 'Wind Farm',
        }),
      ],
      [
        analytics(),
        analytics({
          campaignId: 2,
          totalRaised: '0',
          contributorCount: 0,
          milestonesReleased: 0,
          milestonesFailed: 0,
        }),
      ],
      [releaseEvent()],
    );
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/dashboard/founder');
    expect(res.status).toBe(401);
  });

  it('returns campaigns sorted by campaignId asc with analytics rollups', async () => {
    const res = await request(app).get('/dashboard/founder').set('Authorization', auth(FOUNDER));
    expect(res.status).toBe(200);
    expect(res.body.campaigns).toHaveLength(2);
    expect(res.body.campaigns[0].campaignId).toBe(1);
    expect(res.body.campaigns[1].campaignId).toBe(2);
    // analytics rollup for campaign 1
    expect(res.body.campaigns[0].contributorCount).toBe(12);
    expect(res.body.campaigns[0].totalRaised).toBe('25000');
    expect(res.body.campaigns[0].milestonesReleased).toBe(1);
  });

  it('includes MilestoneReleased events as releases', async () => {
    const res = await request(app).get('/dashboard/founder').set('Authorization', auth(FOUNDER));
    expect(res.body.campaigns[0].releases).toHaveLength(1);
    expect(res.body.campaigns[0].releases[0]).toMatchObject({ index: 0, blockNumber: 200 });
  });

  it('defaults analytics fields to 0 / "0" when no analytics doc', async () => {
    const bare = makeApp([campaign()]);
    const res = await request(bare).get('/dashboard/founder').set('Authorization', auth(FOUNDER));
    expect(res.status).toBe(200);
    expect(res.body.campaigns[0].totalRaised).toBe('0');
    expect(res.body.campaigns[0].contributorCount).toBe(0);
  });

  it("never returns another wallet's campaigns", async () => {
    const res = await request(app).get('/dashboard/founder').set('Authorization', auth(OTHER));
    expect(res.status).toBe(200);
    expect(res.body.campaigns).toHaveLength(0);
  });
});

describe('GET /dashboard/investor', () => {
  let app: Express;

  beforeEach(() => {
    app = makeApp(
      [
        campaign(),
        campaign({
          campaignId: 2,
          vault: '0xbbbb000000000000000000000000000000000002',
          title: 'Wind Farm',
          status: 'failed',
        }),
      ],
      [],
      [
        contribEvent({ blockNumber: 100 }),
        contribEvent({
          campaignId: 2,
          txHash: `0x${'d'.repeat(64)}`,
          blockNumber: 50,
          args: { investor: INVESTOR, amount: '500', votesMinted: '50' },
        }),
      ],
      [vote()],
    );
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/dashboard/investor');
    expect(res.status).toBe(401);
  });

  it('returns contributions newest-first with vault/title joined from campaign', async () => {
    const res = await request(app).get('/dashboard/investor').set('Authorization', auth(INVESTOR));
    expect(res.status).toBe(200);
    const { contributions } = res.body;
    expect(contributions).toHaveLength(2);
    // newest block first
    expect(contributions[0].blockNumber).toBe(100);
    expect(contributions[0].vault).toBe('0xaaaa000000000000000000000000000000000001');
    expect(contributions[0].amount).toBe('1000');
    expect(contributions[0].votesMinted).toBe('100');
  });

  it('returns votes with vault/title joined', async () => {
    const res = await request(app).get('/dashboard/investor').set('Authorization', auth(INVESTOR));
    const { votes: voteRows } = res.body;
    expect(voteRows).toHaveLength(1);
    expect(voteRows[0]).toMatchObject({
      proposalId: '42',
      support: 1,
      weight: '100',
      vault: '0xaaaa000000000000000000000000000000000001',
    });
  });

  it('returns failed contributed-to campaigns as refundable (display only)', async () => {
    const res = await request(app).get('/dashboard/investor').set('Authorization', auth(INVESTOR));
    const { refundable } = res.body;
    expect(refundable).toHaveLength(1);
    expect(refundable[0].campaignId).toBe(2);
    expect(refundable[0].status).toBe('failed');
  });

  it("never leaks another wallet's contributions or votes", async () => {
    const res = await request(app).get('/dashboard/investor').set('Authorization', auth(OTHER));
    expect(res.status).toBe(200);
    expect(res.body.contributions).toHaveLength(0);
    expect(res.body.votes).toHaveLength(0);
    expect(res.body.refundable).toHaveLength(0);
  });
});
