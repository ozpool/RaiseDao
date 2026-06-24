import { JsonRpcProvider } from 'ethers';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { processRange, type EngineOptions } from './engine.js';
import { EthersLogSource } from './provider.js';
import { MongoIndexerStore } from './store.js';

export { processRange } from './engine.js';
export { MongoIndexerStore, InMemoryIndexerStore, type IndexerStore } from './store.js';
export { decodeLog } from './decode.js';
export type { LogSource, LogRecord, LogFilter, DecodedEvent } from './types.js';

let timer: ReturnType<typeof setInterval> | null = null;
let polling = false;

/** Start the in-process indexer poll loop. No-op unless explicitly enabled and
 *  a factory address is configured, so dev and tests don't touch the chain. */
export function startIndexer(): void {
  if (!config.INDEXER_ENABLED) {
    logger.info('Indexer disabled (INDEXER_ENABLED is false)');
    return;
  }
  if (!config.FACTORY_ADDRESS) {
    logger.warn('Indexer enabled but FACTORY_ADDRESS is unset; not starting');
    return;
  }

  const source = new EthersLogSource(new JsonRpcProvider(config.RPC_URL));
  const store = new MongoIndexerStore();
  const opts: EngineOptions = {
    factoryAddress: config.FACTORY_ADDRESS,
    confirmations: config.INDEXER_CONFIRMATIONS,
    startBlock: config.INDEXER_START_BLOCK,
  };

  const tick = async (): Promise<void> => {
    if (polling) return; // skip if the previous tick is still running
    polling = true;
    try {
      const result = await processRange(source, store, opts);
      if (result.processed > 0) logger.info(result, 'Indexer mirrored events');
    } catch (err) {
      logger.error({ err }, 'Indexer poll failed; will retry next tick');
    } finally {
      polling = false;
    }
  };

  void tick();
  timer = setInterval(() => void tick(), config.INDEXER_POLL_MS);
  logger.info(
    { pollMs: config.INDEXER_POLL_MS, confirmations: config.INDEXER_CONFIRMATIONS },
    'Indexer started',
  );
}

export function stopIndexer(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
