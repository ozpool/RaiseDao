import { Router, type Request, type Response } from 'express';
import type { CampaignFilters, CampaignStore } from '../campaigns/store.js';

/** Public campaign browse (#25). One list endpoint with optional search and
 *  filters; the cards it feeds are read-only, so no auth. */
export function campaignsRouter(store: CampaignStore): Router {
  const router = Router();

  router.get('/campaigns', async (req: Request, res: Response) => {
    const { q, city, category, verified, status } = req.query;
    const filters: CampaignFilters = {};
    if (typeof q === 'string' && q.trim()) filters.q = q.trim();
    if (typeof city === 'string' && city) filters.city = city;
    if (typeof category === 'string' && category) filters.category = category;
    if (typeof status === 'string' && status) filters.status = status;
    if (verified === 'true') filters.verified = true;
    else if (verified === 'false') filters.verified = false;

    const campaigns = await store.list(filters);
    res.status(200).json({ campaigns });
  });

  router.get('/campaigns/:vault', async (req: Request, res: Response) => {
    const campaign = await store.getByVault(req.params.vault!);
    if (!campaign) {
      res.status(404).json({ error: 'campaign not found' });
      return;
    }
    res.status(200).json(campaign);
  });

  return router;
}
