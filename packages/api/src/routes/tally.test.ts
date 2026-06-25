import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { InMemoryTallyStore } from '../tally/store.js';

function appWith(store: InMemoryTallyStore) {
  return createApp({ tallyStore: store });
}

const votes = [
  { campaignId: 7, proposalId: '1', support: 1, weight: '100' },
  { campaignId: 7, proposalId: '1', support: 0, weight: '40' },
  { campaignId: 9, proposalId: '2', support: 1, weight: '5' },
];

describe('GET /tally', () => {
  it('returns the campaign tallies, indexedAt and serverTime', async () => {
    const store = new InMemoryTallyStore(votes, '2026-06-25T00:00:00.000Z');
    const res = await request(appWith(store)).get('/tally?campaignId=7');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ campaignId: 7, indexedAt: '2026-06-25T00:00:00.000Z' });
    expect(typeof res.body.serverTime).toBe('string');
    expect(res.body.tallies).toHaveLength(1);
    expect(res.body.tallies[0]).toMatchObject({
      proposalId: '1',
      forVotes: '100',
      againstVotes: '40',
    });
  });

  it('scopes tallies to the requested campaign', async () => {
    const res = await request(appWith(new InMemoryTallyStore(votes))).get('/tally?campaignId=9');
    expect(res.body.tallies).toHaveLength(1);
    expect(res.body.tallies[0].proposalId).toBe('2');
  });

  it('returns empty tallies and null indexedAt for a quiet campaign', async () => {
    const res = await request(appWith(new InMemoryTallyStore(votes))).get('/tally?campaignId=99');
    expect(res.status).toBe(200);
    expect(res.body.tallies).toEqual([]);
    expect(res.body.indexedAt).toBeNull();
  });

  it('rejects a missing or invalid campaignId with 400', async () => {
    const app = appWith(new InMemoryTallyStore(votes));
    expect((await request(app).get('/tally')).status).toBe(400);
    expect((await request(app).get('/tally?campaignId=-1')).status).toBe(400);
    expect((await request(app).get('/tally?campaignId=abc')).status).toBe(400);
  });
});
