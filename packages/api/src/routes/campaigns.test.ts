import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { signToken } from '../auth/jwt.js';
import { InMemoryCampaignStore } from '../campaigns/store.js';
import type { FounderVerifier } from '../campaigns/verify.js';
import { demoCampaigns } from '../campaigns/demo.js';

function app() {
  return createApp({ campaignStore: new InMemoryCampaignStore(demoCampaigns()) });
}

const FOUNDER = '0x1234567890123456789012345678901234567890';
const OTHER = '0x9999999999999999999999999999999999999999';

function authHeader(address = FOUNDER): string {
  return `Bearer ${signToken({ address, roles: ['founder'] })}`;
}

function validCampaign() {
  return {
    campaignId: 1,
    vault: '0xaaaa000000000000000000000000000000000001',
    token: '0xbbbb000000000000000000000000000000000001',
    governor: '0xcccc000000000000000000000000000000000001',
    title: 'Solar microgrid',
    summary: 'Off-grid power for rural clinics.',
    raiseTarget: '50000',
    fundingDeadline: 1_900_000_000,
    milestones: [
      { pctBps: 4000, deadline: 1_900_100_000 },
      { pctBps: 6000, deadline: 1_900_200_000 },
    ],
  };
}

describe('GET /campaigns', () => {
  it('returns every campaign with funding numbers and no auth required', async () => {
    const res = await request(app()).get('/campaigns');
    expect(res.status).toBe(200);
    expect(res.body.campaigns).toHaveLength(demoCampaigns().length);
    expect(res.body.campaigns[0]).toMatchObject({
      title: expect.any(String),
      raiseTarget: expect.any(String),
      totalRaised: expect.any(String),
      milestoneCount: expect.any(Number),
    });
  });

  it('sorts featured campaigns first', async () => {
    const res = await request(app()).get('/campaigns');
    expect(res.body.campaigns[0].featured).toBe(true);
  });

  it('filters by city and by category', async () => {
    const byCity = await request(app()).get('/campaigns?city=Berlin');
    expect(byCity.body.campaigns.every((c: { city: string }) => c.city === 'Berlin')).toBe(true);
    expect(byCity.body.campaigns.length).toBeGreaterThan(0);

    const byCat = await request(app()).get('/campaigns?category=Health');
    expect(byCat.body.campaigns.every((c: { category: string }) => c.category === 'Health')).toBe(
      true,
    );
  });

  it('filters by the verified flag', async () => {
    const res = await request(app()).get('/campaigns?verified=true');
    expect(res.body.campaigns.every((c: { verified: boolean }) => c.verified)).toBe(true);
  });

  it('searches title, city and category case-insensitively', async () => {
    const res = await request(app()).get('/campaigns?q=solar');
    expect(res.body.campaigns.length).toBeGreaterThan(0);
    expect(res.body.campaigns[0].title.toLowerCase()).toContain('solar');
  });

  it('returns an empty list when nothing matches', async () => {
    const res = await request(app()).get('/campaigns?q=zzz-no-match');
    expect(res.body.campaigns).toEqual([]);
  });

  it('returns a single campaign with its schedule by vault address', async () => {
    const demo = demoCampaigns()[0]!;
    const res = await request(app()).get(`/campaigns/${demo.vault}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ vault: demo.vault, token: expect.any(String) });
    expect(res.body.milestones.length).toBeGreaterThan(0);
  });

  it('404s an unknown vault', async () => {
    const res = await request(app()).get('/campaigns/0x0000000000000000000000000000000000000000');
    expect(res.status).toBe(404);
  });
});

describe('POST /campaigns (deploy bridge)', () => {
  // Default stub: the chain reports FOUNDER as the vault's owner. Tests that
  // exercise the ownership guard pass their own verifier.
  function freshApp(verifyFounder: FounderVerifier = async () => FOUNDER) {
    return createApp({
      campaignStore: new InMemoryCampaignStore([]),
      campaignFounderVerifier: verifyFounder,
    });
  }

  it('persists a deployed campaign so its detail page then resolves', async () => {
    const app = freshApp();
    const body = validCampaign();
    const created = await request(app)
      .post('/campaigns')
      .set('Authorization', authHeader())
      .send(body);

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ vault: body.vault, founder: FOUNDER, status: 'funding' });
    expect(created.body.milestones).toHaveLength(2);

    const detail = await request(app).get(`/campaigns/${body.vault}`);
    expect(detail.status).toBe(200);
    expect(detail.body.title).toBe('Solar microgrid');
  });

  it('takes the founder from the session, never the body', async () => {
    const app = freshApp();
    const res = await request(app)
      .post('/campaigns')
      .set('Authorization', authHeader())
      .send({ ...validCampaign(), founder: OTHER });
    expect(res.body.founder).toBe(FOUNDER);
  });

  it('never lets the client set verified / featured / demo', async () => {
    const app = freshApp();
    const res = await request(app)
      .post('/campaigns')
      .set('Authorization', authHeader())
      .send({ ...validCampaign(), verified: true, featured: true, demo: true });
    expect(res.body).toMatchObject({ verified: false, featured: false, demo: false });
  });

  it('is idempotent when the same founder registers a vault twice', async () => {
    const app = freshApp();
    const body = validCampaign();
    await request(app).post('/campaigns').set('Authorization', authHeader()).send(body);
    const second = await request(app)
      .post('/campaigns')
      .set('Authorization', authHeader())
      .send({ ...body, title: 'Renamed' });

    expect(second.status).toBe(201);
    expect(second.body.title).toBe('Solar microgrid'); // first write wins, not clobbered
  });

  it('rejects a caller who is not the on-chain founder (claim-jack) with 403', async () => {
    // The chain says FOUNDER owns the vault; OTHER signs in and tries to claim it.
    const app = freshApp(async () => FOUNDER);
    const res = await request(app)
      .post('/campaigns')
      .set('Authorization', authHeader(OTHER))
      .send(validCampaign());
    expect(res.status).toBe(403);
  });

  it('rejects a vault that is not a deployed campaign with 400', async () => {
    const app = freshApp(async () => null); // chain can't resolve a founder
    const res = await request(app)
      .post('/campaigns')
      .set('Authorization', authHeader())
      .send(validCampaign());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not a deployed campaign/);
  });

  it('rejects an unauthenticated create with 401', async () => {
    const res = await request(freshApp()).post('/campaigns').send(validCampaign());
    expect(res.status).toBe(401);
  });

  it('rejects milestones that do not sum to 100% with 400', async () => {
    const bad = { ...validCampaign(), milestones: [{ pctBps: 5000, deadline: 1_900_100_000 }] };
    const res = await request(freshApp())
      .post('/campaigns')
      .set('Authorization', authHeader())
      .send(bad);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sum to 100/);
  });
});
