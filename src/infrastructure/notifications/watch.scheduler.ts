import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { WATCH_QUEUE, WatchJob } from '../queue/queue.constants';

/**
 * Safety-net sweep: periodically enqueues a full availability-watch evaluation
 * so watches are still serviced even if an event-driven trigger was missed
 * (e.g. process restart). The event-driven path provides low latency; this
 * guarantees eventual delivery.
 */
@Injectable()
export class WatchScheduler {
  private readonly logger = new Logger(WatchScheduler.name);

  constructor(
    @InjectQueue(WATCH_QUEUE) private readonly watchQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweep(): Promise<void> {
    await this.watchQueue.add(WatchJob.SWEEP, {});
    this.logger.debug('Enqueued availability-watch sweep.');
  }
}
