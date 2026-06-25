'use client';

import { useEffect, useRef, useState } from 'react';
import { connectSocket, WIRE, type Broadcast } from '@/lib/socket';
import type { CampaignSnapshot, Tally } from '@/lib/api';

/** How long without a fresh indexer checkpoint before we call the feed stale. */
const STALE_MS = 30_000;

export interface CampaignLive {
  tallies: Map<string, Tally>;
  syncing: boolean;
}

/** Subscribe to a campaign's live vote tallies over Socket.IO. The server sends
 *  an authoritative snapshot on join (and on every re-join); each live VoteCast
 *  just triggers a re-join, so the tally is always the indexer's truth — never
 *  client-side arithmetic that could drift or double-count. "syncing" turns on
 *  when the socket drops or the indexer's checkpoint is more than 30s old (judged
 *  against the server clock, corrected for skew), so a stalled indexer is visible. */
export function useCampaignLive(campaignId: number | undefined): CampaignLive {
  const [tallies, setTallies] = useState<Map<string, Tally>>(new Map());
  const [syncing, setSyncing] = useState(true);

  // Freshness tracked in refs so the 1s staleness check doesn't re-subscribe.
  const indexedAtMs = useRef<number | null>(null);
  const clockSkew = useRef(0); // localNow - serverTime at last snapshot
  const connected = useRef(false);

  useEffect(() => {
    if (campaignId === undefined) return;
    const socket = connectSocket();

    const recompute = () => {
      const at = indexedAtMs.current;
      const serverNow = Date.now() - clockSkew.current;
      const stale = !connected.current || at === null || serverNow - at > STALE_MS;
      setSyncing((prev) => (prev === stale ? prev : stale));
    };

    socket.on('connect', () => {
      connected.current = true;
      socket.emit(WIRE.join, campaignId);
    });
    socket.on('disconnect', () => {
      connected.current = false;
      recompute();
    });
    socket.on(WIRE.sync, (snap: CampaignSnapshot) => {
      setTallies(new Map(snap.tallies.map((t) => [t.proposalId, t])));
      indexedAtMs.current = snap.indexedAt ? Date.parse(snap.indexedAt) : null;
      clockSkew.current = Date.now() - Date.parse(snap.serverTime);
      recompute();
    });
    // A vote (or other vote-channel event) just means "ask for the truth again".
    socket.on(WIRE.event, (b: Broadcast) => {
      if (b.channel === 'vote') socket.emit(WIRE.join, campaignId);
    });

    socket.connect();
    const rejoin = setInterval(() => {
      if (connected.current) socket.emit(WIRE.join, campaignId);
    }, 15_000);
    const ticker = setInterval(recompute, 1_000);

    return () => {
      clearInterval(rejoin);
      clearInterval(ticker);
      socket.emit(WIRE.leave, campaignId);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [campaignId]);

  return { tallies, syncing };
}
