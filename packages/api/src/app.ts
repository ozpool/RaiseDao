import express, { type Express } from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { healthRouter } from './routes/health.js';
import { notFound, errorHandler } from './middleware/error.js';

/** Build the Express app with no side effects (no listen, no DB), so tests can
 *  exercise it directly via supertest. */
export function createApp(): Express {
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(express.json());

  app.use(healthRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
