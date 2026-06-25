'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

/** Founder's own campaigns: raise stats, milestone states, release log.
 *  Keyed by address so switching wallets never serves a stale cache entry. */
export function useFounderDashboard() {
  const token = useAuthStore((s) => s.token);
  const address = useAuthStore((s) => s.session?.address);
  return useQuery({
    queryKey: ['dashboard', 'founder', address],
    queryFn: () => api.dashboard.founder(token!).then((r) => r.campaigns),
    enabled: !!token,
    staleTime: 30_000,
  });
}

/** Investor's own contribution history, vote record, and claimable refunds. */
export function useInvestorDashboard() {
  const token = useAuthStore((s) => s.token);
  const address = useAuthStore((s) => s.session?.address);
  return useQuery({
    queryKey: ['dashboard', 'investor', address],
    queryFn: () => api.dashboard.investor(token!),
    enabled: !!token,
    staleTime: 30_000,
  });
}
