import type { Server as IOServer } from 'socket.io';
import { roomFor, toBroadcast } from './events.js';
import type { DecodedEvent } from '../indexer/types.js';

/** Pushes events to subscribed clients. Implementations: a real Socket.IO
 *  gateway, and a no-op for when realtime is disabled or under test. */
export interface RealtimeGateway {
  publish(event: DecodedEvent): void;
  close(): Promise<void>;
}

export const nullGateway: RealtimeGateway = {
  publish() {},
  async close() {},
};

/** Minimal surface of socket.io's Server we use, so this is unit-testable with a
 *  fake instead of a live websocket server. */
export interface Emittable {
  to(room: string): { emit(event: string, payload: unknown): void };
  close(): Promise<void> | void;
}

export class SocketGateway implements RealtimeGateway {
  constructor(private readonly io: Emittable) {}

  publish(event: DecodedEvent): void {
    this.io.to(roomFor(event.campaignId)).emit('campaign:event', toBroadcast(event));
  }

  async close(): Promise<void> {
    await this.io.close();
  }
}

/** Adapt the gateway's publish into an indexer EventSink. */
export const asSink =
  (gateway: RealtimeGateway) =>
  (event: DecodedEvent): void =>
    gateway.publish(event);

export type { IOServer };
