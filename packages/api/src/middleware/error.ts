import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

/** An error with an explicit HTTP status, thrown by route handlers. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** 404 for anything no route matched. */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not Found' });
}

/**
 * Centralised error handler. Must keep all four arguments so Express recognises
 * it as an error handler. 5xx details are logged but never leaked to clients.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const status = err instanceof AppError ? err.statusCode : 500;
  if (status >= 500) {
    logger.error({ err }, 'Unhandled error');
  }
  res.status(status).json({ error: status >= 500 ? 'Internal Server Error' : err.message });
}
