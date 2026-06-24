import type { DecodedEvent } from '../indexer/types.js';
import type { EventSink } from '../indexer/engine.js';
import type { Mailer } from './mailer.js';

/** Resolves the recipient addresses for a campaign's notification. */
export type RecipientSource = (campaignId: number) => Promise<string[]>;

interface Template {
  subject: string;
  html: string;
}

/** Email content for a vote lifecycle event, or null for events we don't email
 *  about. Vote-open fires on ProposalCreated; vote-close on ProposalQueued (the
 *  decision being finalised on-chain). Pure expiry without an on-chain action is
 *  not covered here — that would need a scheduled deadline sweep. */
export function templateFor(event: DecodedEvent, appUrl: string): Template | null {
  const link = `${appUrl}/campaigns/${event.campaignId}`;
  if (event.type === 'ProposalCreated') {
    return {
      subject: `Voting is open — campaign #${event.campaignId}`,
      html: `<p>A milestone vote just opened.</p><p><a href="${link}">Cast your vote</a></p>`,
    };
  }
  if (event.type === 'ProposalQueued') {
    return {
      subject: `Voting has closed — campaign #${event.campaignId}`,
      html: `<p>The milestone vote has been finalised.</p><p><a href="${link}">See the outcome</a></p>`,
    };
  }
  return null;
}

export interface NotifierDeps {
  mailer: Mailer;
  recipients: RecipientSource;
  appUrl: string;
}

/** An indexer EventSink that emails a campaign's investors on vote open/close. */
export function makeNotifier(deps: NotifierDeps): EventSink {
  return async (event: DecodedEvent): Promise<void> => {
    const template = templateFor(event, deps.appUrl);
    if (!template) return;
    const to = await deps.recipients(event.campaignId);
    if (to.length === 0) return;
    await deps.mailer.send({ to, ...template });
  };
}
