import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { signToken } from '../auth/jwt.js';
import { InMemoryEvidenceStore } from '../evidence/store.js';
import type { PinProvider } from '../evidence/pin.js';

const ADDRESS = '0x1234567890123456789012345678901234567890';

function authHeader(): string {
  return `Bearer ${signToken({ address: ADDRESS, roles: ['founder'] })}`;
}

function stubProvider(name: string, cid: string): PinProvider {
  return {
    name,
    async pin() {
      return cid;
    },
  };
}

function appWith(provider: PinProvider, store: InMemoryEvidenceStore, maxBytes = 1024) {
  return createApp({ evidence: { providers: [provider], store, maxBytes } });
}

describe('POST /evidence', () => {
  it('pins a file, stores the CID against the milestone, and returns 201', async () => {
    const store = new InMemoryEvidenceStore();
    const app = appWith(stubProvider('pinata', 'cid-abc'), store);

    const res = await request(app)
      .post('/evidence')
      .set('Authorization', authHeader())
      .field('campaignId', '7')
      .field('milestoneIndex', '2')
      .attach('file', Buffer.from('the proof'), 'proof.pdf');

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ cid: 'cid-abc', provider: 'pinata', campaignId: 7 });
    expect(store.records).toHaveLength(1);
    expect(store.records[0]).toMatchObject({
      campaignId: 7,
      milestoneIndex: 2,
      cid: 'cid-abc',
      uploadedBy: ADDRESS,
    });
  });

  it('rejects an unauthenticated upload with 401', async () => {
    const app = appWith(stubProvider('pinata', 'cid-abc'), new InMemoryEvidenceStore());
    const res = await request(app)
      .post('/evidence')
      .field('campaignId', '7')
      .field('milestoneIndex', '2')
      .attach('file', Buffer.from('the proof'), 'proof.pdf');
    expect(res.status).toBe(401);
  });

  it('enforces the size cap with 413', async () => {
    const store = new InMemoryEvidenceStore();
    const app = appWith(stubProvider('pinata', 'cid-abc'), store, 8); // 8-byte cap

    const res = await request(app)
      .post('/evidence')
      .set('Authorization', authHeader())
      .field('campaignId', '7')
      .field('milestoneIndex', '2')
      .attach('file', Buffer.from('this is well over eight bytes'), 'big.pdf');

    expect(res.status).toBe(413);
    expect(store.records).toHaveLength(0);
  });

  it('returns 502 when every pin provider fails', async () => {
    const failing: PinProvider = {
      name: 'pinata',
      async pin() {
        throw new Error('upstream down');
      },
    };
    const store = new InMemoryEvidenceStore();
    const app = appWith(failing, store);

    const res = await request(app)
      .post('/evidence')
      .set('Authorization', authHeader())
      .field('campaignId', '7')
      .field('milestoneIndex', '2')
      .attach('file', Buffer.from('the proof'), 'proof.pdf');

    expect(res.status).toBe(502);
    expect(store.records).toHaveLength(0);
  });
});

describe('GET /evidence', () => {
  async function pin(app: ReturnType<typeof appWith>, campaignId: string, milestoneIndex: string) {
    return request(app)
      .post('/evidence')
      .set('Authorization', authHeader())
      .field('campaignId', campaignId)
      .field('milestoneIndex', milestoneIndex)
      .attach('file', Buffer.from('the proof'), 'proof.pdf');
  }

  it('lists a campaign evidence newest-first and needs no auth', async () => {
    const store = new InMemoryEvidenceStore();
    const app = appWith(stubProvider('pinata', 'cid-one'), store);
    await pin(app, '7', '0');
    const app2 = appWith(stubProvider('pinata', 'cid-two'), store);
    await pin(app2, '7', '1');

    const res = await request(app).get('/evidence?campaignId=7');
    expect(res.status).toBe(200);
    expect(res.body.evidence).toHaveLength(2);
    expect(res.body.evidence[0]).toMatchObject({ cid: 'cid-two', milestoneIndex: 1 });
    expect(res.body.evidence[1]).toMatchObject({ cid: 'cid-one', milestoneIndex: 0 });
  });

  it('only returns evidence for the requested campaign', async () => {
    const store = new InMemoryEvidenceStore();
    const app = appWith(stubProvider('pinata', 'cid-x'), store);
    await pin(app, '7', '0');
    await pin(appWith(stubProvider('pinata', 'cid-y'), store), '8', '0');

    const res = await request(app).get('/evidence?campaignId=8');
    expect(res.body.evidence).toHaveLength(1);
    expect(res.body.evidence[0].cid).toBe('cid-y');
  });

  it('returns an empty list for a campaign with no evidence', async () => {
    const res = await request(
      appWith(stubProvider('pinata', 'c'), new InMemoryEvidenceStore()),
    ).get('/evidence?campaignId=99');
    expect(res.status).toBe(200);
    expect(res.body.evidence).toEqual([]);
  });

  it('rejects a missing or invalid campaignId with 400', async () => {
    const app = appWith(stubProvider('pinata', 'c'), new InMemoryEvidenceStore());
    expect((await request(app).get('/evidence')).status).toBe(400);
    expect((await request(app).get('/evidence?campaignId=-1')).status).toBe(400);
    expect((await request(app).get('/evidence?campaignId=abc')).status).toBe(400);
  });
});
