'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Single campaign for the detail page, keyed by vault address. 404s don't
 *  retry — an unknown vault is a stable miss, not a transient error. */
export function useCampaign(vault: string) {
  return useQuery({
    queryKey: ['campaign', vault],
    queryFn: () => api.campaigns.get(vault),
    retry: false,
  });
}
