import mongoose from 'mongoose';
import { logger } from './logger.js';

export interface ConnectOptions {
  retries: number;
  delayMs: number;
}

const DEFAULTS: ConnectOptions = { retries: 5, delayMs: 2000 };

/** Connect to MongoDB, retrying with a fixed backoff so a cold Atlas / restart
 *  doesn't crash the process on the first failed attempt. */
export async function connectDB(uri: string, opts: ConnectOptions = DEFAULTS): Promise<void> {
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      logger.info('MongoDB connected');
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === opts.retries) {
        logger.error({ attempt, message }, 'MongoDB connection failed, giving up');
        throw err;
      }
      logger.warn({ attempt, message }, 'MongoDB connection failed, retrying');
      await new Promise((resolve) => setTimeout(resolve, opts.delayMs));
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

/** Human-readable connection state for the health check. */
export function dbState(): string {
  return (
    ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] ??
    'unknown'
  );
}
