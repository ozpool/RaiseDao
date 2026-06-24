import { describe, it, expect } from 'vitest';
import { factoryIface, vaultIface, governorIface } from './abis.js';
import { decodeLog } from './decode.js';
import type { LogRecord } from './types.js';

const FACTORY = '0xfac7000000000000000000000000000000000001';
const VAULT = '0x00000000000000000000000000000000000000a1';
const TOKEN = '0x00000000000000000000000000000000000000d4';
const GOV = '0x00000000000000000000000000000000000000b2';
const FOUNDER = '0x00000000000000000000000000000000000000e5';
const INVESTOR = '0x00000000000000000000000000000000000000c3';

function encode(
  iface: typeof factoryIface,
  name: string,
  values: unknown[],
  address: string,
  over: Partial<LogRecord> = {},
): LogRecord {
  const { data, topics } = iface.encodeEventLog(name, values);
  return {
    address,
    blockNumber: 10,
    transactionHash: '0xtx',
    logIndex: 0,
    topics,
    data,
    ...over,
  };
}

describe('decodeLog', () => {
  it('decodes CampaignDeployed from the factory and lowercases addresses', () => {
    const log = encode(factoryIface, 'CampaignDeployed', [1, VAULT, TOKEN, GOV, FOUNDER], FACTORY);
    const ev = decodeLog(log, FACTORY, new Map());
    expect(ev?.type).toBe('CampaignDeployed');
    expect(ev?.source).toBe('factory');
    expect(ev?.campaignId).toBe(1);
    expect(ev?.args.vault).toBe(VAULT);
    expect(ev?.args.governor).toBe(GOV);
  });

  it('decodes a vault Contributed for a watched address', () => {
    const watched = new Map([[VAULT, 7]]);
    const log = encode(vaultIface, 'Contributed', [INVESTOR, 100n, 100n], VAULT);
    const ev = decodeLog(log, FACTORY, watched);
    expect(ev?.type).toBe('Contributed');
    expect(ev?.campaignId).toBe(7);
    expect(ev?.args.amount).toBe('100');
    expect(ev?.args.investor).toBe(INVESTOR);
  });

  it('ignores logs from unknown addresses', () => {
    const log = encode(vaultIface, 'Contributed', [INVESTOR, 1n, 1n], GOV);
    expect(decodeLog(log, FACTORY, new Map())).toBeNull();
  });

  it('decodes ProposalCreated and drops array params (calldata, targets)', () => {
    const watched = new Map([[GOV, 4]]);
    const log = encode(
      governorIface,
      'ProposalCreated',
      [99, FOUNDER, [], [], [], [], 100, 200, 'release milestone 0'],
      GOV,
    );
    const ev = decodeLog(log, FACTORY, watched);
    expect(ev?.type).toBe('ProposalCreated');
    expect(ev?.campaignId).toBe(4);
    expect(ev?.args.proposalId).toBe('99');
    expect(ev?.args.voteEnd).toBe('200');
    expect(ev?.args.targets).toBeUndefined();
    expect(ev?.args.calldatas).toBeUndefined();
  });

  it('decodes ProposalQueued for a watched governor', () => {
    const watched = new Map([[GOV, 4]]);
    const log = encode(governorIface, 'ProposalQueued', [99, 1700000000], GOV);
    const ev = decodeLog(log, FACTORY, watched);
    expect(ev?.type).toBe('ProposalQueued');
    expect(ev?.args.proposalId).toBe('99');
  });
});
