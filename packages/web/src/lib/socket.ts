import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './config';

/** Socket event names — must match the API's realtime/events.ts WIRE map. */
export const WIRE = {
  join: 'join',
  leave: 'leave',
  event: 'campaign:event',
  sync: 'campaign:sync',
} as const;

/** One live update pushed to a campaign room. Mirrors the API's Broadcast: a
 *  VoteCast carries { voter, proposalId, support, weight, reason } in `data`. */
export interface Broadcast {
  channel: 'fund' | 'vote' | 'state';
  type: string;
  campaignId: number;
  block: number;
  data: Record<string, string | number>;
}

/** Open a socket to the API. autoConnect is off so the caller controls the
 *  lifecycle (connect on mount, disconnect on unmount). */
export function connectSocket(): Socket {
  return io(API_BASE_URL, { autoConnect: false, transports: ['websocket', 'polling'] });
}

export type { Socket };
