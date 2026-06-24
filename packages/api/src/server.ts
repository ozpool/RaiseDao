import type { Server } from 'node:http';
import { config } from './config.js';
import { logger } from './logger.js';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './db.js';
import { startIndexer, stopIndexer, type EventSink } from './indexer/index.js';
import { createGateway, asSink, type RealtimeGateway, type Snapshot } from './realtime/index.js';
import { buildNotifier } from './email/index.js';
import { AnalyticsModel } from './models/index.js';

async function main(): Promise<void> {
  const app = createApp();

  // Listen first so the server (and the liveness probe) is up immediately, then
  // connect to MongoDB in the background with retries. The health route reports
  // DB state, so "up but DB still connecting" is observable rather than fatal.
  const server = app.listen(config.PORT, () => {
    logger.info(`API listening on http://localhost:${config.PORT}`);
  });

  const gateway = await createGateway(server, {
    enabled: config.REALTIME_ENABLED,
    redisUrl: config.REDIS_URL,
    snapshot: campaignSnapshot,
  });

  installShutdown(server, gateway);

  // Fan each indexed event out to connected sockets and to email notifications.
  const sink = combineSinks([asSink(gateway), buildNotifier()]);

  connectDB(config.MONGODB_URI)
    .then(() => startIndexer(sink)) // in-process indexer; needs the DB connection
    .catch((err) => {
      logger.error({ err }, 'MongoDB unavailable; serving without a database');
    });
}

/** Snapshot a campaign's current rollups so a (re)connecting client re-syncs. */
const campaignSnapshot: Snapshot = async (campaignId) => {
  const analytics = await AnalyticsModel.findOne({ campaignId }, { _id: 0, __v: 0 }).lean();
  return { campaignId, analytics };
};

/** Run every sink for an event, isolating a failure in one from the others. */
function combineSinks(sinks: EventSink[]): EventSink {
  return async (event) => {
    for (const sink of sinks) {
      try {
        await sink(event);
      } catch (err) {
        logger.error({ err, type: event.type }, 'Event sink failed; continuing');
      }
    }
  };
}

/** Close the HTTP server, realtime gateway, and DB on a termination signal so
 *  in-flight requests drain and the process exits cleanly. */
function installShutdown(server: Server, gateway: RealtimeGateway): void {
  let closing = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, 'Shutting down');
    stopIndexer();
    await gateway.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
