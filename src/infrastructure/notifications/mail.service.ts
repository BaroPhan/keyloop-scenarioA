import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Sends email via SMTP (Mailpit locally). The transport is created lazily and
 * reused. Actual sending happens off the request path inside MailProcessor.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? 'localhost',
        port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
        secure: (process.env.SMTP_SECURE ?? 'false') === 'true',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD ?? '',
            }
          : undefined,
      });
    }
    return this.transporter;
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    const from =
      process.env.MAIL_FROM ?? 'Keyloop Scheduler <no-reply@keyloop.example>';
    await this.getTransporter().sendMail({ from, to, subject, text: body });
    this.logger.log(`Sent "${subject}" to ${to}`);
  }
}
