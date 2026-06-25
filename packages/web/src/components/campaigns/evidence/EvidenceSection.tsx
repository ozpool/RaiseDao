'use client';

import { useAccount } from 'wagmi';
import type { CampaignMilestone } from '@/lib/api';
import { useEvidence, groupByMilestone } from '@/hooks/useEvidence';
import { EvidenceItem } from './EvidenceItem';
import { EvidenceUpload } from './EvidenceUpload';

/** The campaign detail page's evidence block: every milestone with its pinned
 *  proof, newest first. Investors review inline; the founder (and only the
 *  founder, matched by connected wallet) gets an upload control per milestone. */
export function EvidenceSection({
  campaignId,
  founder,
  milestones,
}: {
  campaignId: number;
  founder: string;
  milestones: CampaignMilestone[];
}) {
  const { address } = useAccount();
  const { data: records, isLoading } = useEvidence(campaignId);
  const isFounder = Boolean(address && address.toLowerCase() === founder.toLowerCase());
  const byMilestone = groupByMilestone(records);

  return (
    <section>
      <h2 className="mb-3 mt-10 font-mono text-caption uppercase tracking-widest text-mist">
        Milestone evidence
      </h2>
      <div className="space-y-6">
        {milestones.map((m) => {
          const items = byMilestone.get(m.index) ?? [];
          return (
            <div key={m.index} className="rounded-2xl border border-line bg-panel/40 p-5">
              <p className="font-mono text-caption uppercase tracking-widest text-mist">
                Milestone {String(m.index + 1).padStart(2, '0')} ·{' '}
                {(m.pctBps / 100).toFixed(m.pctBps % 100 ? 1 : 0)}% release
              </p>

              {isLoading ? (
                <p className="mt-3 font-sans text-caption text-mist">Loading evidence…</p>
              ) : items.length === 0 ? (
                <p className="mt-3 font-sans text-small text-mist">No evidence submitted yet.</p>
              ) : (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {items.map((record) => (
                    <EvidenceItem key={record.cid} record={record} />
                  ))}
                </div>
              )}

              {isFounder && <EvidenceUpload campaignId={campaignId} milestoneIndex={m.index} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
