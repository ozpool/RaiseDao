import { Router, type Request, type Response } from 'express';
import type { TallyStore } from '../tally/store.js';

/** Live vote tally (#30). Public: the initial render fetches the current tallies
 *  here, then the Socket.IO stream keeps them current without polling. Returns
 *  the same snapshot shape the socket sends on join, so the client has one model. */
export function tallyRouter(store: TallyStore): Router {
  const router = Router();

  router.get('/tally', async (req: Request, res: Response) => {
    const campaignId = Number(req.query.campaignId);
    if (!Number.isInteger(campaignId) || campaignId < 0) {
      res.status(400).json({ error: 'a non-negative campaignId is required' });
      return;
    }
    const snapshot = await store.snapshot(campaignId);
    res.status(200).json(snapshot);
  });

  return router;
}
