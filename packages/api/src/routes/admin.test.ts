import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { signToken } from '../auth/jwt.js';
import { InMemoryAdminStore, type SeedAdminCampaign } from '../admin/store.js';
import { InMemoryCampaignStore } from '../campaigns/store.js';

const ADMIN = '0x1111111111111111111111111111111111111111';
const FOUNDER = '0x2222222222222222222222222222222222222222';
const SCAMMER = '0x3333333333333333333333333333333333333333';

const adminAuth = `Bearer ${signToken({ address: ADMIN, roles: ['investor', 'admin'] })}`;
const userAuth = `Bearer ${signToken({ address: FOUNDER, roles: ['investor'] })}`;

const VAULT_OK = '0xaaaa000000000000000000000000000000000001';
const VAULT_RISK = '0xbbbb000000000000000000000000000000000002';

const seed: SeedAdminCampaign[] = [
  {
    campaignId: 1,
    vault: VAULT_OK,
    title: 'Solar Grid',
    founder: FOUNDER,
    status: 'funding',
    verified: true,
    raiseTarget: '50000',
    milestones: [{ pctBps: 3000 }, { pctBps: 3000 }, { pctBps: 4000 }],
    createdAt: new Date('2025-01-01T00:00:00Z'),
  },
  {
    campaignId: 2,
    vault: VAULT_RISK,
    title: 'Moon Yield',
    founder: SCAMMER,
    status: 'funding',
    verified: false,
    raiseTarget: '50000',
    milestones: [{ pctBps: 9000 }, { pctBps: 1000 }],
    createdAt: new Date('2025-01-01T00:00:00Z'),
  },
];

const makeApp = (s = seed) =>
  createApp({ adminStore: new InMemoryAdminStore(s.map((c) => ({ ...c }))) });

describe('admin routes — auth', () => {
  const app = makeApp();

  it('401 without a token', async () => {
    expect((await request(app).get('/admin/campaigns')).status).toBe(401);
  });

  it('403 for a non-admin wallet', async () => {
    const res = await request(app).get('/admin/campaigns').set('Authorization', userAuth);
    expect(res.status).toBe(403);
  });
});

describe('GET /admin/campaigns', () => {
  it('returns campaigns risk-scored, highest risk first', async () => {
    const res = await request(makeApp()).get('/admin/campaigns').set('Authorization', adminAuth);
    expect(res.status).toBe(200);
    expect(res.body.campaigns).toHaveLength(2);
    expect(res.body.campaigns[0].vault).toBe(VAULT_RISK); // riskier sorts first
    expect(res.body.campaigns[0].risk.level).toBe('medium'); // unverified + front-loaded
    expect(res.body.campaigns[0].risk.score).toBe(30);
    expect(res.body.campaigns[1].risk.score).toBe(0);
  });
});

describe('POST /admin/campaigns/:vault/hide', () => {
  let app: Express;
  beforeEach(() => {
    app = makeApp();
  });

  it('hides a campaign and records the reason', async () => {
    const res = await request(app)
      .post(`/admin/campaigns/${VAULT_RISK}/hide`)
      .set('Authorization', adminAuth)
      .send({ hidden: true, reason: 'rug pattern' });
    expect(res.status).toBe(200);
    expect(res.body.campaign.hidden).toBe(true);

    const audit = await request(app).get('/admin/audit').set('Authorization', adminAuth);
    expect(audit.body.entries[0]).toMatchObject({
      action: 'hide',
      vault: VAULT_RISK,
      reason: 'rug pattern',
      admin: ADMIN,
    });
  });

  it('400 when hidden is missing or not a boolean', async () => {
    const res = await request(app)
      .post(`/admin/campaigns/${VAULT_RISK}/hide`)
      .set('Authorization', adminAuth)
      .send({ reason: 'oops' });
    expect(res.status).toBe(400);
  });

  it('404 for an unknown vault', async () => {
    const res = await request(app)
      .post('/admin/campaigns/0xdead000000000000000000000000000000000000/hide')
      .set('Authorization', adminAuth)
      .send({ hidden: true });
    expect(res.status).toBe(404);
  });
});

describe('hidden campaigns leave public browse', () => {
  it('excludes a hidden campaign from the public list', async () => {
    const store = new InMemoryCampaignStore([
      {
        campaignId: 1,
        vault: VAULT_OK,
        founder: FOUNDER,
        status: 'funding',
        title: 'Solar Grid',
        summary: '',
        city: '',
        category: '',
        verified: true,
        featured: false,
        demo: false,
        raiseTarget: '50000',
        totalRaised: '0',
        fundingDeadline: 0,
        token: '0x0',
        governor: '0x0',
        milestones: [],
        hidden: true,
      },
    ]);
    expect(await store.list({})).toHaveLength(0);
  });
});
