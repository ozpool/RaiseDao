import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { signToken } from '../auth/jwt.js';
import { InMemoryCampaignStore, type CampaignInput } from '../campaigns/store.js';
import { InMemoryProposalStore } from '../proposals/store.js';

const FOUNDER = '0x1234567890123456789012345678901234567890';
const OTHER = '0x9999999999999999999999999999999999999999';
const VAULT = '0xaaaa000000000000000000000000000000000001';
const GOVERNOR = '0xcccc000000000000000000000000000000000001';

function authHeader(address = FOUNDER): string {
  return `Bearer ${signToken({ address, roles: ['founder'] })}`;
}

function campaign(): CampaignInput {
  return {
    campaignId: 1,
    vault: VAULT,
    token: '0xbbbb000000000000000000000000000000000001',
    governor: GOVERNOR,
    founder: FOUNDER,
    status: 'active',
    title: 'Solar microgrid',
    summary: '',
    city: '',
    category: '',
    verified: false,
    featured: false,
    demo: false,
    raiseTarget: '50000',
    totalRaised: '0',
    fundingDeadline: 1_900_000_000,
    milestones: [
      { index: 0, pctBps: 4000, status: 'pending', deadline: 1_900_100_000 },
      { index: 1, pctBps: 6000, status: 'pending', deadline: 1_900_200_000 },
    ],
  };
}

function validProposal() {
  return {
    campaignId: 1,
    vault: VAULT,
    governor: GOVERNOR,
    proposalId: '12345678901234567890',
    milestoneIndex: 0,
    descriptionHash: `0x${'a'.repeat(64)}`,
    description: 'Release milestone 0\n\nEvidence: ipfs://cid-abc',
    evidenceCid: 'cid-abc',
    txHash: `0x${'b'.repeat(64)}`,
  };
}

let app: Express;
let proposals: InMemoryProposalStore;

beforeEach(async () => {
  const campaigns = new InMemoryCampaignStore([]);
  await campaigns.create(campaign());
  proposals = new InMemoryProposalStore();
  app = createApp({ campaignStore: campaigns, proposalStore: proposals });
});

describe('POST /proposals', () => {
  it('records a milestone proposal for the campaign founder and returns 201', async () => {
    const res = await request(app)
      .post('/proposals')
      .set('Authorization', authHeader())
      .send(validProposal());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      proposalId: '12345678901234567890',
      milestoneIndex: 0,
      proposer: FOUNDER,
      evidenceCid: 'cid-abc',
    });
    expect(proposals.records).toHaveLength(1);
  });

  it('takes the proposer from the session, never the body', async () => {
    const res = await request(app)
      .post('/proposals')
      .set('Authorization', authHeader())
      .send({ ...validProposal(), proposer: OTHER });
    expect(res.body.proposer).toBe(FOUNDER);
  });

  it('is idempotent on a repeated proposalId', async () => {
    await request(app).post('/proposals').set('Authorization', authHeader()).send(validProposal());
    const second = await request(app)
      .post('/proposals')
      .set('Authorization', authHeader())
      .send(validProposal());
    expect(second.status).toBe(201);
    expect(proposals.records).toHaveLength(1);
  });

  it('rejects a non-founder caller with 403', async () => {
    const res = await request(app)
      .post('/proposals')
      .set('Authorization', authHeader(OTHER))
      .send(validProposal());
    expect(res.status).toBe(403);
  });

  it('404s a vault that has no campaign', async () => {
    const res = await request(app)
      .post('/proposals')
      .set('Authorization', authHeader())
      .send({ ...validProposal(), vault: '0xdddd000000000000000000000000000000000009' });
    expect(res.status).toBe(404);
  });

  it('rejects a milestoneIndex out of range with 400', async () => {
    const res = await request(app)
      .post('/proposals')
      .set('Authorization', authHeader())
      .send({ ...validProposal(), milestoneIndex: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/out of range/);
  });

  it('rejects a non-numeric proposalId with 400', async () => {
    const res = await request(app)
      .post('/proposals')
      .set('Authorization', authHeader())
      .send({ ...validProposal(), proposalId: '0xdeadbeef' });
    expect(res.status).toBe(400);
  });

  it('rejects an unauthenticated create with 401', async () => {
    const res = await request(app).post('/proposals').send(validProposal());
    expect(res.status).toBe(401);
  });
});

describe('GET /proposals', () => {
  it('lists a vault proposals ordered by milestone', async () => {
    await request(app).post('/proposals').set('Authorization', authHeader()).send(validProposal());
    await request(app)
      .post('/proposals')
      .set('Authorization', authHeader())
      .send({ ...validProposal(), proposalId: '999', milestoneIndex: 1 });

    const res = await request(app).get(`/proposals?vault=${VAULT}`);
    expect(res.status).toBe(200);
    expect(res.body.proposals).toHaveLength(2);
    expect(res.body.proposals[0].milestoneIndex).toBe(0);
    expect(res.body.proposals[1].milestoneIndex).toBe(1);
  });

  it('returns an empty list for a vault with no proposals', async () => {
    const res = await request(app).get(
      '/proposals?vault=0xdddd000000000000000000000000000000000009',
    );
    expect(res.status).toBe(200);
    expect(res.body.proposals).toEqual([]);
  });

  it('rejects a missing or invalid vault with 400', async () => {
    expect((await request(app).get('/proposals')).status).toBe(400);
    expect((await request(app).get('/proposals?vault=nope')).status).toBe(400);
  });
});
