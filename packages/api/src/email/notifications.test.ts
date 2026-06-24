import { describe, it, expect } from 'vitest';
import { makeNotifier, templateFor } from './notifications.js';
import type { Mail, Mailer } from './mailer.js';
import type { DecodedEvent } from '../indexer/types.js';

function event(type: string, campaignId = 5): DecodedEvent {
  return {
    source: 'governor',
    type,
    address: '0xgov',
    txHash: '0xtx',
    logIndex: 0,
    blockNumber: 1,
    campaignId,
    args: { proposalId: '99' },
  };
}

class RecordingMailer implements Mailer {
  sent: Mail[] = [];
  async send(mail: Mail): Promise<void> {
    this.sent.push(mail);
  }
}

describe('templateFor', () => {
  it('builds vote-open and vote-close templates with a campaign link', () => {
    const open = templateFor(event('ProposalCreated'), 'https://app.test');
    expect(open?.subject).toContain('Voting is open');
    expect(open?.html).toContain('https://app.test/campaigns/5');

    const close = templateFor(event('ProposalQueued'), 'https://app.test');
    expect(close?.subject).toContain('Voting has closed');
  });

  it('returns null for events that are not vote lifecycle', () => {
    expect(templateFor(event('VoteCast'), 'https://app.test')).toBeNull();
    expect(templateFor(event('Contributed'), 'https://app.test')).toBeNull();
  });
});

describe('makeNotifier', () => {
  it('emails the campaign recipients on a vote-open event', async () => {
    const mailer = new RecordingMailer();
    const notify = makeNotifier({
      mailer,
      recipients: async () => ['a@test.io', 'b@test.io'],
      appUrl: 'https://app.test',
    });

    await notify(event('ProposalCreated'));

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toEqual(['a@test.io', 'b@test.io']);
    expect(mailer.sent[0]?.subject).toContain('Voting is open');
  });

  it('does not send when there are no recipients', async () => {
    const mailer = new RecordingMailer();
    const notify = makeNotifier({ mailer, recipients: async () => [], appUrl: 'https://app.test' });
    await notify(event('ProposalCreated'));
    expect(mailer.sent).toHaveLength(0);
  });

  it('ignores non-lifecycle events without querying recipients', async () => {
    const mailer = new RecordingMailer();
    let queried = false;
    const notify = makeNotifier({
      mailer,
      recipients: async () => {
        queried = true;
        return ['a@test.io'];
      },
      appUrl: 'https://app.test',
    });

    await notify(event('VoteCast'));

    expect(queried).toBe(false);
    expect(mailer.sent).toHaveLength(0);
  });
});
