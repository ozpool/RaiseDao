/** A composed message ready to send. `to` is a list of recipient addresses. */
export interface Mail {
  to: string[];
  subject: string;
  html: string;
}

/** Sends transactional email. Behind an interface so notification logic can be
 *  tested with a recording fake instead of hitting Resend. */
export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Used when no RESEND_API_KEY is set: sending is a silent no-op. */
export const nullMailer: Mailer = {
  async send() {},
};

export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(mail: Mail): Promise<void> {
    if (mail.to.length === 0) return;
    const { Resend } = await import('resend');
    const resend = new Resend(this.apiKey);
    // Recipients go in bcc so one investor never sees another's address; `to` is
    // the neutral sender so the message still has a visible primary recipient.
    await resend.emails.send({
      from: this.from,
      to: [this.from],
      bcc: mail.to,
      subject: mail.subject,
      html: mail.html,
    });
  }
}
