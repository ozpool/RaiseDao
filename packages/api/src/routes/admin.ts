import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../auth/middleware.js';
import type { AdminStore } from '../admin/store.js';

/** Admin moderation endpoints (#35). The only power admins have is off-chain
 *  visibility: list risk-scored campaigns, hide/un-hide them from public browse,
 *  and read the audit trail. There is deliberately NO route that can move funds
 *  or change votes — those live only on-chain, behind the governor and timelock.
 *  Every route is gated on the `admin` role (granted to ADMIN_ADDRESSES at login). */
export function adminRouter(store: AdminStore): Router {
  const router = Router();
  const admin = [requireAuth, requireRole('admin')] as const;

  router.get('/admin/campaigns', ...admin, async (_req: Request, res: Response) => {
    const campaigns = await store.listScored();
    res.status(200).json({ campaigns });
  });

  router.post('/admin/campaigns/:vault/hide', ...admin, async (req: Request, res: Response) => {
    const { hidden, reason } = req.body ?? {};
    if (typeof hidden !== 'boolean') {
      res.status(400).json({ error: 'hidden (boolean) is required' });
      return;
    }
    const actor = req.user!.address;
    const vault = req.params.vault ?? '';
    const updated = await store.setHidden(
      vault,
      hidden,
      actor,
      typeof reason === 'string' ? reason : '',
    );
    if (!updated) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.status(200).json({ campaign: updated });
  });

  router.get('/admin/audit', ...admin, async (_req: Request, res: Response) => {
    const entries = await store.recentAudit();
    res.status(200).json({ entries });
  });

  return router;
}
