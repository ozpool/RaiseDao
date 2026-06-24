import { describe, it, expect } from 'vitest';
import { roomFor, toBroadcast } from './events.js';
import { SocketGateway, asSink, type Emittable } from './gateway.js';
import type { DecodedEvent } from '../indexer/types.js';

function event(over: Partial<DecodedEvent> = {}): DecodedEvent {
  return {
    source: 'vault',
    type: 'Contributed',
    address: '0xvault',
    txHash: '0xtx',
    logIndex: 0,
    blockNumber: 42,
    campaignId: 7,
    args: { investor: '0xabc', amount: '100' },
    ...over,
  };
}

describe('events', () => {
  it('names a room per campaign', () => {
    expect(roomFor(7)).toBe('campaign:7');
  });

  it('maps event types to channels', () => {
    expect(toBroadcast(event({ type: 'Contributed' })).channel).toBe('fund');
    expect(toBroadcast(event({ type: 'VoteCast' })).channel).toBe('vote');
    expect(toBroadcast(event({ type: 'ProposalCreated' })).channel).toBe('vote');
    expect(toBroadcast(event({ type: 'MilestoneReleased' })).channel).toBe('state');
    expect(toBroadcast(event({ type: 'Unknown' })).channel).toBe('state');
  });

  it('carries the campaign, block, and args through', () => {
    const b = toBroadcast(event());
    expect(b).toMatchObject({ campaignId: 7, block: 42, type: 'Contributed' });
    expect(b.data.amount).toBe('100');
  });
});

describe('SocketGateway', () => {
  it('emits a broadcast to the campaign room', () => {
    const sent: Array<{ room: string; name: string; payload: unknown }> = [];
    const io: Emittable = {
      to: (room) => ({ emit: (name, payload) => sent.push({ room, name, payload }) }),
      close() {},
    };
    const gateway = new SocketGateway(io);

    asSink(gateway)(event({ campaignId: 3, type: 'VoteCast' }));

    expect(sent).toHaveLength(1);
    expect(sent[0]?.room).toBe('campaign:3');
    expect(sent[0]?.name).toBe('campaign:event');
    expect(sent[0]?.payload).toMatchObject({ channel: 'vote', campaignId: 3 });
  });
});
