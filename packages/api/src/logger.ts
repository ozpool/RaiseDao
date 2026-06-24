import pino from 'pino';
import { config } from './config.js';

/** Structured JSON logger; pretty in dev would be a transport concern, not here. */
export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: 'raisedao-api' },
});
