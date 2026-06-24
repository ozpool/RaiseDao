import { describe, it, expect } from 'vitest';
import { CampaignModel, InvestorModel, EventModel, VoteModel, AnalyticsModel } from './index.js';

// validateSync runs schema validators without any database connection.
describe('Mongoose models', () => {
  it('accepts a valid campaign and lowercases addresses', () => {
    const doc = new CampaignModel({
      campaignId: 0,
      vault: '0xABC0000000000000000000000000000000000001',
      token: '0xABC0000000000000000000000000000000000002',
      governor: '0xABC0000000000000000000000000000000000003',
      founder: '0xABC0000000000000000000000000000000000004',
      fundingDeadline: 4_000_000_000,
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.vault).to.equal(doc.vault.toLowerCase());
  });

  it('rejects a campaign missing required fields', () => {
    const err = new CampaignModel({ campaignId: 1 }).validateSync();
    expect(err).toBeTruthy();
    expect(err?.errors).toHaveProperty('vault');
    expect(err?.errors).toHaveProperty('founder');
  });

  it('rejects a campaign with an invalid status', () => {
    const err = new CampaignModel({
      campaignId: 2,
      vault: '0x1',
      token: '0x2',
      governor: '0x3',
      founder: '0x4',
      fundingDeadline: 1,
      status: 'bogus',
    }).validateSync();
    expect(err?.errors).toHaveProperty('status');
  });

  it('defaults an investor to the investor role', () => {
    const doc = new InvestorModel({ address: '0xAa' });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.roles).to.deep.equal(['investor']);
    expect(doc.address).to.equal('0xaa');
  });

  it('requires event identity fields', () => {
    const err = new EventModel({ campaignId: 0 }).validateSync();
    expect(err?.errors).toHaveProperty('txHash');
    expect(err?.errors).toHaveProperty('type');
  });

  it('constrains vote support to 0/1/2', () => {
    const err = new VoteModel({
      campaignId: 0,
      proposalId: '0x1',
      voter: '0xa',
      support: 5,
      weight: '1',
      txHash: '0xtx',
      blockNumber: 1,
    }).validateSync();
    expect(err?.errors).toHaveProperty('support');
  });

  it('accepts a valid analytics rollup', () => {
    const err = new AnalyticsModel({ campaignId: 0 }).validateSync();
    expect(err).toBeUndefined();
  });
});
