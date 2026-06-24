import express, { type Express } from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { MongoAuthStore, type AuthStore } from './auth/store.js';
import { notFound, errorHandler } from './middleware/error.js';

export interface AppDeps {
  /** Override the auth persistence (tests inject an in-memory store). */
  authStore?: AuthStore;
}

/** Build the Express app with no side effects (no listen, no DB), so tests can
 *  exercise it directly via supertest. */
export function createApp(deps: AppDeps = {}): Express {
  const authStore = deps.authStore ?? new MongoAuthStore();
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(express.json());

  app.use(healthRouter);
  app.use(authRouter(authStore));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
