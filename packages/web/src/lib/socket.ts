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
 *  lifecycle (connect on mount, disconnect on unmount).
 *
 *  Transports are left at socket.io's default order — polling first, then a
 *  silent upgrade to websocket. Forcing websocket-first makes the client open a
 *  raw WS before any handshake, which fails noisily (React StrictMode's dev
 *  double-mount, proxies, browser shields) and logs a "WebSocket connection
 *  failed" error even though it then falls back. Polling-first handshakes
 *  reliably over HTTP and upgrades to WS once connected — same end state, no
 *  console error. */
export function connectSocket(): Socket {
  return io(API_BASE_URL, { autoConnect: false });
}

export type { Socket };
