import {
  Global,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/** Builds the shared ioredis connection options from the environment. */
export function redisConnectionOptions() {
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    // BullMQ requires this; harmless for the shared client too.
    maxRetriesPerRequest: null as null,
  };
}

/**
 * Provides a single shared ioredis client app-wide. Used by the cache layer
 * and BullMQ job queues.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const logger = new Logger('Redis');
        const client = new Redis(redisConnectionOptions());
        client.on('error', (err) => logger.error(err.message));
        client.on('connect', () => logger.log('Connected to Redis.'));
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    const client = this.moduleRef.get<Redis>(REDIS_CLIENT, { strict: false });
    await client?.quit().catch(() => undefined);
  }
}
