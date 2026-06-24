import { decodeLog } from './decode.js';
import { logger } from '../logger.js';
import type { IndexerStore } from './store.js';
import type { DecodedEvent, LogRecord, LogSource } from './types.js';

export interface EngineOptions {
  factoryAddress: string;
  confirmations: number;
  startBlock: number;
}

/** Best-effort consumer of newly-applied events (realtime fanout, email). Called
 *  once per event on first sight only, never on a replay, so downstream side
 *  effects are not duplicated. A throwing sink is logged, never fatal. */
export type EventSink = (event: DecodedEvent) => void | Promise<void>;

export interface RangeResult {
  from: number;
  to: number;
  processed: number;
}

const byLogOrder = (a: LogRecord, b: LogRecord): number =>
  a.blockNumber - b.blockNumber || a.logIndex - b.logIndex;

/**
 * Process one batch of finalised blocks. Only blocks at least `confirmations`
 * behind the head are considered final, which makes shallow reorgs invisible;
 * combined with idempotent upserts keyed by (txHash, logIndex), re-running a
 * range never double-counts. Two passes per range: discover new campaigns from
 * the factory first, then read those (and previously known) campaign contracts,
 * so a campaign created in this range still has its events captured.
 */
export async function processRange(
  source: LogSource,
  store: IndexerStore,
  opts: EngineOptions,
  sink?: EventSink,
): Promise<RangeResult> {
  const head = await source.getBlockNumber();
  const safe = head - opts.confirmations;

  const checkpoint = (await store.getCheckpoint()) ?? opts.startBlock - 1;
  const from = checkpoint + 1;
  if (safe < from) return { from, to: checkpoint, processed: 0 };
  const to = safe;

  const factoryAddress = opts.factoryAddress.toLowerCase();
  let processed = 0;

  const ingest = async (decoded: DecodedEvent | null): Promise<void> => {
    if (!decoded || !(await store.handle(decoded))) return; // null or already seen
    processed++;
    await emit(sink, decoded);
  };

  // Pass 1: factory events, to discover campaigns deployed in this range.
  const factoryLogs = await source.getLogs({
    fromBlock: from,
    toBlock: to,
    address: [factoryAddress],
  });
  for (const log of factoryLogs.sort(byLogOrder)) {
    await ingest(decodeLog(log, factoryAddress, await store.getWatched()));
  }

  // Pass 2: campaign-contract events, now that the watch set includes any new ones.
  const watched = await store.getWatched();
  const addresses = [...watched.keys()];
  if (addresses.length > 0) {
    const campaignLogs = await source.getLogs({ fromBlock: from, toBlock: to, address: addresses });
    for (const log of campaignLogs.sort(byLogOrder)) {
      await ingest(decodeLog(log, factoryAddress, watched));
    }
  }

  await store.setCheckpoint(to);
  return { from, to, processed };
}

async function emit(sink: EventSink | undefined, event: DecodedEvent): Promise<void> {
  if (!sink) return;
  try {
    await sink(event);
  } catch (err) {
    logger.error({ err, type: event.type }, 'Event sink failed; continuing');
  }
}
