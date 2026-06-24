import { config } from '../config.js';
import { EventModel, InvestorModel } from '../models/index.js';
import { ResendMailer, nullMailer, type Mailer } from './mailer.js';
import { makeNotifier, type RecipientSource } from './notifications.js';
import type { EventSink } from '../indexer/engine.js';

export { makeNotifier, templateFor, type NotifierDeps } from './notifications.js';
export { ResendMailer, nullMailer, type Mail, type Mailer } from './mailer.js';

/** Resend in production; a no-op when no API key is configured. */
export function buildMailer(): Mailer {
  return config.RESEND_API_KEY
    ? new ResendMailer(config.RESEND_API_KEY, config.EMAIL_FROM)
    : nullMailer;
}

/** Investors who contributed to the campaign and opted in with an email. */
export const recipientsFor: RecipientSource = async (campaignId) => {
  const addrs = await EventModel.distinct('args.investor', { campaignId, type: 'Contributed' });
  if (addrs.length === 0) return [];
  const investors = await InvestorModel.find(
    { address: { $in: addrs }, email: { $ne: null } },
    { email: 1 },
  );
  return investors.map((i) => i.email).filter((e): e is string => Boolean(e));
};

/** The notification sink wired to real config, mailer, and recipient lookup. */
export function buildNotifier(): EventSink {
  return makeNotifier({ mailer: buildMailer(), recipients: recipientsFor, appUrl: config.APP_URL });
}
