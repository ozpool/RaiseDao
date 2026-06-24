import { Router, type Request, type Response } from 'express';
import { dbState } from '../db.js';

export const healthRouter: Router = Router();

/** Liveness probe: always 200 while the process is up; reports DB state so a
 *  reader can distinguish "up but DB down" from "fully healthy". */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    db: dbState(),
    timestamp: new Date().toISOString(),
  });
});
