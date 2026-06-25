'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type CampaignFilters } from '@/lib/api';

/** Browse-grid data. TanStack Query keys on the filters, so changing a filter
 *  refetches and caches per combination. */
export function useCampaigns(filters: CampaignFilters) {
  return useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => api.campaigns.list(filters).then((r) => r.campaigns),
    staleTime: 30_000,
  });
}
