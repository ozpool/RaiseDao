'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type EvidenceRecord, type EvidenceUploadInput } from '@/lib/api';

/** All pinned evidence for a campaign, grouped by milestone for the viewer.
 *  campaignId can be undefined while the parent campaign is still loading, so
 *  the query stays disabled until we have it. */
export function useEvidence(campaignId: number | undefined) {
  return useQuery({
    queryKey: ['evidence', campaignId],
    queryFn: () => api.evidence.list(campaignId!),
    enabled: campaignId !== undefined,
    select: (data) => data.evidence,
  });
}

/** Group a flat evidence list by milestone index for per-milestone display. */
export function groupByMilestone(records: EvidenceRecord[] = []): Map<number, EvidenceRecord[]> {
  const groups = new Map<number, EvidenceRecord[]>();
  for (const record of records) {
    const bucket = groups.get(record.milestoneIndex) ?? [];
    bucket.push(record);
    groups.set(record.milestoneIndex, bucket);
  }
  return groups;
}

/** Pin a file against a milestone, then refresh the campaign's evidence list so
 *  the new file appears without a manual reload. Errors surface to the caller
 *  (the upload control shows the API message) rather than failing silently. */
export function useUploadEvidence(campaignId: number, token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<EvidenceUploadInput, 'campaignId'>) => {
      if (!token) throw new Error('Connect and sign in to upload evidence');
      return api.evidence.upload({ ...input, campaignId }, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence', campaignId] }),
  });
}
