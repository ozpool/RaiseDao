import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { signToken } from '../auth/jwt.js';
import { InMemoryDraftStore } from '../drafts/store.js';

const FOUNDER = '0x1234567890123456789012345678901234567890';
const OTHER = '0x9999999999999999999999999999999999999999';

function authHeader(address = FOUNDER): string {
  return `Bearer ${signToken({ address, roles: ['founder'] })}`;
}

function validDraft() {
  return {
    title: 'Solar microgrid',
    summary: 'Off-grid power for rural clinics.',
    raiseTarget: '50000',
    fundingDurationDays: 30,
    tokenName: 'Solar',
    tokenSymbol: 'SOL',
    tokenSupply: '1000000',
    milestones: [
      { title: 'Prototype', pctBps: 4000 },
      { title: 'Pilot install', pctBps: 6000 },
    ],
  };
}

function appWith(store: InMemoryDraftStore) {
  return createApp({ draftStore: store });
}

describe('drafts routes', () => {
  it('creates a draft owned by the signed-in founder and returns 201 with an id', async () => {
    const store = new InMemoryDraftStore();
    const res = await request(appWith(store))
      .post('/drafts')
      .set('Authorization', authHeader())
      .send(validDraft());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: expect.any(String), founder: FOUNDER, status: 'draft' });
    expect(store.records).toHaveLength(1);
  });

  it('rejects an unauthenticated create with 401', async () => {
    const store = new InMemoryDraftStore();
    const res = await request(appWith(store)).post('/drafts').send(validDraft());
    expect(res.status).toBe(401);
    expect(store.records).toHaveLength(0);
  });

  it('rejects milestones that do not sum to 100% with 400', async () => {
    const store = new InMemoryDraftStore();
    const bad = { ...validDraft(), milestones: [{ title: 'Only', pctBps: 5000 }] };
    const res = await request(appWith(store))
      .post('/drafts')
      .set('Authorization', authHeader())
      .send(bad);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sum to 100/);
    expect(store.records).toHaveLength(0);
  });

  it('returns a draft to its owner but 403 to anyone else', async () => {
    const store = new InMemoryDraftStore();
    const created = await request(appWith(store))
      .post('/drafts')
      .set('Authorization', authHeader())
      .send(validDraft());
    const id = created.body.id;

    const mine = await request(appWith(store))
      .get(`/drafts/${id}`)
      .set('Authorization', authHeader());
    expect(mine.status).toBe(200);
    expect(mine.body.title).toBe('Solar microgrid');

    const theirs = await request(appWith(store))
      .get(`/drafts/${id}`)
      .set('Authorization', authHeader(OTHER));
    expect(theirs.status).toBe(403);
  });

  it('404s an unknown draft id', async () => {
    const res = await request(appWith(new InMemoryDraftStore()))
      .get('/drafts/nope')
      .set('Authorization', authHeader());
    expect(res.status).toBe(404);
  });

  it('lists only the calling founder’s drafts', async () => {
    const store = new InMemoryDraftStore();
    await request(appWith(store))
      .post('/drafts')
      .set('Authorization', authHeader())
      .send(validDraft());
    await request(appWith(store))
      .post('/drafts')
      .set('Authorization', authHeader(OTHER))
      .send(validDraft());

    const res = await request(appWith(store)).get('/drafts').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].founder).toBe(FOUNDER);
  });
});
