import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type Role } from './jwt.js';

/** Require a valid JWT; attaches the claims to `req.user`. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/** Require the caller to hold at least one of the given roles. Runs after
 *  requireAuth (or after a route that populated req.user). */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.some((role) => req.user!.roles.includes(role))) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
