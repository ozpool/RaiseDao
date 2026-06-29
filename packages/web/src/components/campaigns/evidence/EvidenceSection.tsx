'use client';

import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import type { CampaignMilestone } from '@/lib/api';
import { useEvidence, groupByMilestone } from '@/hooks/useEvidence';
import { useCampaignLive } from '@/hooks/useCampaignLive';
import { evidenceKind } from '@/lib/ipfs';
import { EvidenceItem } from './EvidenceItem';
import { EvidenceUpload } from './EvidenceUpload';
import { EvidenceLightbox } from './EvidenceLightbox';
import { MilestoneGovernance } from '../governance/MilestoneGovernance';

/** The campaign detail page's evidence + governance block: every milestone with
 *  its pinned proof (newest first) and its release vote. Investors review and
 *  vote; the founder (matched by connected wallet) uploads evidence and opens
 *  the vote. */
export function EvidenceSection({
  campaignId,
  vault,
  governor,
  founder,
  milestones,
}: {
  campaignId: number;
  vault: string;
  governor: string;
  founder: string;
  milestones: CampaignMilestone[];
}) {
  const { address } = useAccount();
  const { data: records, isLoading } = useEvidence(campaignId);
  const { tallies, syncing } = useCampaignLive(campaignId);
  const isFounder = Boolean(address && address.toLowerCase() === founder.toLowerCase());
  const byMilestone = groupByMilestone(records);

  // A flat gallery of the viewable media (image/video) across every milestone, so
  // the lightbox can step through all the proof. Keyed by cid for the open lookup.
  const gallery = useMemo(
    () =>
      (records ?? []).filter(
        (r) => evidenceKind(r.filename) === 'image' || evidenceKind(r.filename) === 'video',
      ),
    [records],
  );
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <section>
      <h2 className="mb-3 mt-10 font-mono text-caption uppercase tracking-widest text-mist">
        Milestone evidence &amp; voting
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
                  {items.map((record) => {
                    const gi = gallery.findIndex((g) => g.cid === record.cid);
                    return (
                      <EvidenceItem
                        key={record.cid}
                        record={record}
                        onOpen={gi >= 0 ? () => setLightbox(gi) : undefined}
                      />
                    );
                  })}
                </div>
              )}

              {isFounder && <EvidenceUpload campaignId={campaignId} milestoneIndex={m.index} />}

              <MilestoneGovernance
                campaignId={campaignId}
                vault={vault}
                governor={governor}
                founder={founder}
                milestoneIndex={m.index}
                evidenceCid={items[0]?.cid ?? ''}
                tallies={tallies}
                syncing={syncing}
              />
            </div>
          );
        })}
      </div>

      {lightbox !== null && (
        <EvidenceLightbox
          records={gallery}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndex={setLightbox}
        />
      )}
    </section>
  );
}
