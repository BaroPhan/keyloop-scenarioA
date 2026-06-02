import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { redisConnectionOptions } from '../redis/redis.module';
import { MAIL_QUEUE, WATCH_QUEUE } from './queue.constants';

/**
 * Central BullMQ setup: shared Redis connection plus the app's queues. Global
 * so both producers (AppointmentsService, webhooks) and the notification
 * processors can inject the same queues without circular module imports.
 */
@Global()
@Module({
  imports: [
    // Async factory so it reads env AFTER ConfigModule has loaded .env.
    BullModule.forRootAsync({
      useFactory: () => ({ connection: redisConnectionOptions() }),
    }),
    BullModule.registerQueue(
      { name: MAIL_QUEUE },
      { name: WATCH_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
