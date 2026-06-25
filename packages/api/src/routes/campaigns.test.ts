import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { InMemoryCampaignStore } from '../campaigns/store.js';
import { demoCampaigns } from '../campaigns/demo.js';

function app() {
  return createApp({ campaignStore: new InMemoryCampaignStore(demoCampaigns()) });
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
