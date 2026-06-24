import type { Server as HttpServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import { logger } from '../logger.js';
import { WIRE, roomFor } from './events.js';
import { SocketGateway, nullGateway, type RealtimeGateway } from './gateway.js';

export { roomFor, toBroadcast, type Broadcast } from './events.js';
export { nullGateway, asSink, type RealtimeGateway } from './gateway.js';

/** Snapshot a campaign's current state for a client that just (re)joined, so it
 *  can re-sync after a reconnect without replaying the whole event log. */
export type Snapshot = (campaignId: number) => Promise<unknown>;

export interface GatewayOptions {
  enabled: boolean;
  redisUrl: string;
  snapshot?: Snapshot;
}

/** Attach a Socket.IO server to the HTTP server. With REDIS_URL set, events fan
 *  out across instances via the Upstash adapter; without it, single-instance. */
export async function createGateway(
  server: HttpServer,
  opts: GatewayOptions,
): Promise<RealtimeGateway> {
  if (!opts.enabled) {
    logger.info('Realtime disabled (REALTIME_ENABLED is false)');
    return nullGateway;
  }

  const io = new IOServer(server, { cors: { origin: true } });
  if (opts.redisUrl) await attachRedis(io, opts.redisUrl);

  io.on('connection', (socket) => {
    socket.on(WIRE.join, async (campaignId: number) => {
      const id = Number(campaignId);
      if (!Number.isInteger(id)) return;
      await socket.join(roomFor(id));
      if (opts.snapshot) socket.emit(WIRE.sync, await opts.snapshot(id));
    });
    socket.on(WIRE.leave, (campaignId: number) => {
      void socket.leave(roomFor(Number(campaignId)));
    });
  });

  logger.info({ redis: Boolean(opts.redisUrl) }, 'Realtime gateway started');
  return new SocketGateway(io);
}

/** Wire the Upstash Redis adapter using a pub/sub pair (a duplicated client). */
async function attachRedis(io: IOServer, url: string): Promise<void> {
  const { createAdapter } = await import('@socket.io/redis-adapter');
  const { Redis } = await import('ioredis');
  const pub = new Redis(url);
  const sub = pub.duplicate();
  io.adapter(createAdapter(pub, sub));
}
