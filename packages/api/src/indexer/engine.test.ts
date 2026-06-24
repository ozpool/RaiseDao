import { describe, it, expect } from 'vitest';
import { factoryIface, vaultIface } from './abis.js';
import { processRange, type EngineOptions } from './engine.js';
import { InMemoryIndexerStore } from './store.js';
import type { LogRecord, LogSource, LogFilter } from './types.js';

const FACTORY = '0xfac7000000000000000000000000000000000001';
const VAULT = '0x00000000000000000000000000000000000000a1';
const TOKEN = '0x00000000000000000000000000000000000000d4';
const GOV = '0x00000000000000000000000000000000000000b2';
const FOUNDER = '0x00000000000000000000000000000000000000e5';
const INVESTOR = '0x00000000000000000000000000000000000000c3';

const OPTS: EngineOptions = { factoryAddress: FACTORY, confirmations: 5, startBlock: 0 };

class FakeSource implements LogSource {
  constructor(
    public head: number,
    private readonly logs: LogRecord[],
  ) {}
  async getBlockNumber(): Promise<number> {
    return this.head;
  }
  async getLogs(f: LogFilter): Promise<LogRecord[]> {
    const set = new Set(f.address.map((a) => a.toLowerCase()));
    return this.logs.filter(
      (l) => l.blockNumber >= f.fromBlock && l.blockNumber <= f.toBlock && set.has(l.address),
    );
  }
}

function campaignDeployed(block: number, logIndex: number): LogRecord {
  const { data, topics } = factoryIface.encodeEventLog('CampaignDeployed', [
    1,
    VAULT,
    TOKEN,
    GOV,
    FOUNDER,
  ]);
  return {
    address: FACTORY,
    blockNumber: block,
    transactionHash: `0xdeploy${block}`,
    logIndex,
    topics,
    data,
  };
}

function contributed(block: number, logIndex: number): LogRecord {
  const { data, topics } = vaultIface.encodeEventLog('Contributed', [INVESTOR, 100n, 100n]);
  return {
    address: VAULT,
    blockNumber: block,
    transactionHash: `0xcontrib${block}`,
    logIndex,
    topics,
    data,
  };
}

describe('processRange', () => {
  it('defers events until they are confirmation-deep, then processes them', async () => {
    const store = new InMemoryIndexerStore();
    // deploy at 10 (confirmed), a contribution at 18 (still within reorg window)
    const source = new FakeSource(20, [campaignDeployed(10, 0), contributed(18, 0)]);

    const first = await processRange(source, store, OPTS);
    expect(first.to).toBe(15); // head 20 - 5 confirmations
    expect(store.events.map((e) => e.type)).toEqual(['CampaignDeployed']);
    expect(store.checkpoint).toBe(15);

    // chain advances; the contribution is now final
    source.head = 25;
    const second = await processRange(source, store, OPTS);
    expect(second.from).toBe(16);
    expect(store.events.map((e) => e.type)).toEqual(['CampaignDeployed', 'Contributed']);
    expect(store.checkpoint).toBe(20);
  });

  it('discovers a campaign and captures its events within the same range', async () => {
    const store = new InMemoryIndexerStore();
    const source = new FakeSource(20, [campaignDeployed(10, 0), contributed(12, 0)]);

    const result = await processRange(source, store, OPTS);
    expect(result.processed).toBe(2);
    expect(store.contributions.get(1)).toBe(1);
    expect(store.watched.get(VAULT)).toBe(1);
  });

  it('is idempotent when a range is replayed', async () => {
    const store = new InMemoryIndexerStore();
    const source = new FakeSource(20, [campaignDeployed(10, 0), contributed(12, 0)]);

    await processRange(source, store, OPTS);
    const eventsAfterFirst = store.events.length;

    // simulate a replay of the same blocks (e.g. after a restart or retry)
    store.checkpoint = OPTS.startBlock - 1;
    const replay = await processRange(source, store, OPTS);

    expect(replay.processed).toBe(0); // nothing new applied
    expect(store.events.length).toBe(eventsAfterFirst);
    expect(store.contributions.get(1)).toBe(1); // not double-counted
  });

  it('does nothing when no blocks are final yet', async () => {
    const store = new InMemoryIndexerStore();
    const source = new FakeSource(3, [campaignDeployed(1, 0)]); // head 3, safe < startBlock
    const result = await processRange(source, store, OPTS);
    expect(result.processed).toBe(0);
    expect(store.events.length).toBe(0);
  });

  it('emits each newly-applied event to the sink exactly once, not on replay', async () => {
    const store = new InMemoryIndexerStore();
    const source = new FakeSource(20, [campaignDeployed(10, 0), contributed(12, 0)]);
    const seen: string[] = [];

    await processRange(source, store, OPTS, (e) => {
      seen.push(e.type);
    });
    expect(seen).toEqual(['CampaignDeployed', 'Contributed']);

    // replay the same blocks: nothing new applied, so the sink is not called
    store.checkpoint = OPTS.startBlock - 1;
    await processRange(source, store, OPTS, (e) => {
      seen.push(e.type);
    });
    expect(seen).toEqual(['CampaignDeployed', 'Contributed']);
  });

  it('continues indexing when the sink throws', async () => {
    const store = new InMemoryIndexerStore();
    const source = new FakeSource(20, [campaignDeployed(10, 0), contributed(12, 0)]);

    const result = await processRange(source, store, OPTS, () => {
      throw new Error('sink boom');
    });

    expect(result.processed).toBe(2);
    expect(store.checkpoint).toBe(15);
  });
});
