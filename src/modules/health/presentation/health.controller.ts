import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  @ApiOperation({ summary: 'DB + Redis health probe' })
  async check() {
    const [db, redis] = await Promise.all([
      this.ping(() => this.dataSource.query('SELECT 1')),
      this.ping(() => this.redis.ping()),
    ]);
    const status = db && redis ? 'ok' : 'degraded';
    return { status, db: db ? 'up' : 'down', redis: redis ? 'up' : 'down' };
  }

  private async ping(fn: () => Promise<unknown>): Promise<boolean> {
    try {
      await fn();
      return true;
    } catch {
      return false;
    }
  }
}
