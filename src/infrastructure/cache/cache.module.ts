import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { AdminCacheService } from './admin-cache.service';

/** Exposes CacheService app-wide (Redis client comes from RedisModule). */
@Global()
@Module({
  providers: [CacheService, AdminCacheService],
  exports: [CacheService, AdminCacheService],
})
export class AppCacheModule {}
