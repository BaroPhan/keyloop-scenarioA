import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MAIL_QUEUE, MailJobData } from '../queue/queue.constants';
import { MailService } from './mail.service';

/**
 * Consumes the mail queue and delivers messages via SMTP. Failures are retried
 * by BullMQ according to the producer's job options.
 */
@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mail: MailService) {
    super();
  }

  async process(job: Job<MailJobData>): Promise<void> {
    const { to, subject, body } = job.data;
    await this.mail.send(to, subject, body);
  }
}
