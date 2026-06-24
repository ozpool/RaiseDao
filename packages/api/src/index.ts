/**
 * @raisedao/api — Express API server and the in-process chain indexer.
 * Barrel of side-effect-free building blocks; the runnable entry is `server.ts`.
 */
export { createApp, type AppDeps } from './app.js';
export { config, loadConfig, type Config } from './config.js';
export { logger } from './logger.js';
export { connectDB, disconnectDB, dbState } from './db.js';
export { AppError } from './middleware/error.js';
export { requireAuth, requireRole } from './auth/middleware.js';
export { signToken, verifyToken, type AuthClaims, type Role } from './auth/jwt.js';
export { MongoAuthStore, InMemoryAuthStore, type AuthStore, type AuthUser } from './auth/store.js';
export * from './models/index.js';
export { startIndexer, stopIndexer, processRange, type EventSink } from './indexer/index.js';
export { createGateway, nullGateway, asSink, type RealtimeGateway } from './realtime/index.js';
export { makeNotifier, buildNotifier, nullMailer, type Mailer } from './email/index.js';
