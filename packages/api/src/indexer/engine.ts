import { decodeLog } from './decode.js';
import { logger } from '../logger.js';
import type { IndexerStore } from './store.js';
import type { DecodedEvent, LogRecord, LogSource } from './types.js';

export interface EngineOptions {
  factoryAddress: string;
  confirmations: number;
  startBlock: number;
  /** Max blocks per eth_getLogs call. Caps the span so a backlog (or a
   *  rate-limited RPC, e.g. Alchemy's free-tier 10-block limit) is walked in
   *  bounded windows rather than one giant request. Defaults to unbounded. */
  maxRange?: number;
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
  const startFrom = checkpoint + 1;
  if (safe < startFrom) return { from: startFrom, to: checkpoint, processed: 0 };

  // Walk [startFrom, safe] in windows of at most maxRange blocks. The checkpoint
  // advances per window, so a crash mid-backfill resumes cleanly and a
  // range-limited RPC is never asked for more than it allows.
  const maxRange = opts.maxRange && opts.maxRange > 0 ? opts.maxRange : Number.MAX_SAFE_INTEGER;
  let processed = 0;
  for (let from = startFrom; from <= safe; ) {
    const to = Math.min(safe, from + maxRange - 1);
    processed += await processChunk(source, store, opts, sink, from, to);
    await store.setCheckpoint(to);
    from = to + 1;
  }

  return { from: startFrom, to: safe, processed };
}

/** Index one window [from, to]: discover campaigns from the factory first, then
 *  capture campaign-contract events (including any campaign born in this window).
 *  Returns how many events were newly applied. */
async function processChunk(
  source: LogSource,
  store: IndexerStore,
  opts: EngineOptions,
  sink: EventSink | undefined,
  from: number,
  to: number,
): Promise<number> {
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

  return processed;
}

async function emit(sink: EventSink | undefined, event: DecodedEvent): Promise<void> {
  if (!sink) return;
  try {
    await sink(event);
  } catch (err) {
    logger.error({ err, type: event.type }, 'Event sink failed; continuing');
  }
}
