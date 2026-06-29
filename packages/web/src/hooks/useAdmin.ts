'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

/** True when the signed-in session carries the admin role. */
export function useIsAdmin(): boolean {
  return useAuthStore((s) => s.session?.roles.includes('admin') ?? false);
}

/** Risk-scored campaign list for the admin panel. Enabled only for admins. */
export function useAdminCampaigns() {
  const token = useAuthStore((s) => s.token);
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ['admin', 'campaigns'],
    queryFn: () => api.admin.campaigns(token!).then((r) => r.campaigns),
    enabled: !!token && isAdmin,
    staleTime: 15_000,
  });
}

/** Recent moderation actions. */
export function useAdminAudit() {
  const token = useAuthStore((s) => s.token);
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => api.admin.audit(token!).then((r) => r.entries),
    enabled: !!token && isAdmin,
    staleTime: 15_000,
  });
}

/** Hide/un-hide a campaign, then refresh the list and the audit trail. */
export function useSetHidden() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vault, hidden, reason }: { vault: string; hidden: boolean; reason: string }) =>
      api.admin.setHidden(vault, hidden, reason, token!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

/** Grant/revoke a campaign's verified badge, then refresh the list + audit. */
export function useSetVerified() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      vault,
      verified,
      reason,
    }: {
      vault: string;
      verified: boolean;
      reason: string;
    }) => api.admin.setVerified(vault, verified, reason, token!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}
