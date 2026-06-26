import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../auth/middleware.js';
import type { DashboardStore } from '../dashboard/store.js';

/** Per-wallet dashboard endpoints (#33). Both routes are auth-gated and serve
 *  only the caller's own data — address always comes from `req.user`, never
 *  from query params, so one wallet can never read another's dashboard. */
export function dashboardRouter(store: DashboardStore): Router {
  const router = Router();

  router.get('/dashboard/founder', requireAuth, async (req: Request, res: Response) => {
    const address = req.user!.address.toLowerCase();
    const campaigns = await store.founder(address);
    res.status(200).json({ campaigns });
  });

  router.get('/dashboard/investor', requireAuth, async (req: Request, res: Response) => {
    const address = req.user!.address.toLowerCase();
    const data = await store.investor(address);
    res.status(200).json(data);
  });

  return router;
}
