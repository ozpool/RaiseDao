import type { Server } from 'node:http';
import { config } from './config.js';
import { logger } from './logger.js';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './db.js';
import { startIndexer, stopIndexer } from './indexer/index.js';

function main(): void {
  const app = createApp();

  // Listen first so the server (and the liveness probe) is up immediately, then
  // connect to MongoDB in the background with retries. The health route reports
  // DB state, so "up but DB still connecting" is observable rather than fatal.
  const server = app.listen(config.PORT, () => {
    logger.info(`API listening on http://localhost:${config.PORT}`);
  });

  installShutdown(server);

  connectDB(config.MONGODB_URI)
    .then(() => startIndexer()) // in-process indexer; needs the DB connection
    .catch((err) => {
      logger.error({ err }, 'MongoDB unavailable; serving without a database');
    });
}

/** Close the HTTP server and the DB connection on a termination signal so
 *  in-flight requests drain and the process exits cleanly. */
function installShutdown(server: Server): void {
  let closing = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, 'Shutting down');
    stopIndexer();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

try {
  main();
} catch (err) {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
}
