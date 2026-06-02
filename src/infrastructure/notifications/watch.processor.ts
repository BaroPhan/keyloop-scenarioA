import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, Queue } from 'bullmq';
import {
  MAIL_QUEUE,
  MailJob,
  MailJobData,
  WATCH_QUEUE,
} from '../queue/queue.constants';
import { AvailabilityWatchService } from '../../modules/appointments/application/availability-watch.service';
import { Customer } from '../../domain/entities/customer.entity';

interface WatchJobData {
  dealershipId?: number;
  serviceTypeId?: number;
}

@Processor(WATCH_QUEUE)
export class WatchProcessor extends WorkerHost {
  private readonly logger = new Logger(WatchProcessor.name);

  constructor(
    private readonly watches: AvailabilityWatchService,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue<MailJobData>,
  ) {
    super();
  }

  async process(job: Job<WatchJobData>): Promise<void> {
    const active = await this.watches.findActive();
    const candidates = active.filter((w) => {
      if (job.data.dealershipId && w.dealershipId !== job.data.dealershipId) {
        return false;
      }
      if (
        job.data.serviceTypeId &&
        w.serviceTypeId !== job.data.serviceTypeId
      ) {
        return false;
      }
      return true;
    });

    for (const watch of candidates) {
      const slot = await this.watches.findOpenSlotForWatch(watch);
      if (!slot) continue;

      const customer = await this.customers.findOne({
        where: { id: watch.customerId },
      });
      if (customer) {
        await this.mailQueue.add(MailJob.WATCH_AVAILABLE, {
          to: customer.email,
          subject: 'A slot you were watching is now available',
          body:
            `Good news! A slot for the service you were watching at dealership ` +
            `${watch.dealershipId} is open on ${slot.toISOString()}. ` +
            `Book now before it is taken.`,
        });
      }
      await this.watches.markNotified(watch.id, slot);
      this.logger.log(`Notified watch ${watch.id} of open slot ${slot.toISOString()}`);
    }
  }
}
