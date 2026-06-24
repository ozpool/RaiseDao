import type { DecodedEvent } from '../indexer/types.js';

/** The room name a campaign's updates are broadcast to. Clients join
 *  `campaign:<id>` to receive only that campaign's stream. */
export const roomFor = (campaignId: number): string => `campaign:${campaignId}`;

/** Socket event names. `event` carries a live update; `sync` is the snapshot a
 *  client receives on (re)joining so it can re-sync after a reconnect. */
export const WIRE = {
  join: 'join',
  leave: 'leave',
  event: 'campaign:event',
  sync: 'campaign:sync',
} as const;

export type Channel = 'fund' | 'vote' | 'state';

export interface Broadcast {
  channel: Channel;
  type: string;
  campaignId: number;
  block: number;
  data: Record<string, string | number>;
}

/** Which channel each on-chain event belongs to, so clients can subscribe by
 *  concern (funding bars vs. vote tallies vs. milestone state). */
const CHANNEL: Record<string, Channel> = {
  Contributed: 'fund',
  Refunded: 'fund',
  VoteCast: 'vote',
  ProposalCreated: 'vote',
  ProposalQueued: 'vote',
  CampaignDeployed: 'state',
  MilestoneReleased: 'state',
  MilestoneFailed: 'state',
};

export function toBroadcast(event: DecodedEvent): Broadcast {
  return {
    channel: CHANNEL[event.type] ?? 'state',
    type: event.type,
    campaignId: event.campaignId,
    block: event.blockNumber,
    data: event.args,
  };
}
