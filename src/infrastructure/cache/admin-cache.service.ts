import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheKeys } from './cache-keys';

@Injectable()
export class AdminCacheService {
  constructor(private readonly cache: CacheService) {}

  invalidateReference(): Promise<void> {
    return this.cache.delByPrefix(CacheKeys.referencePrefix);
  }

  invalidateAvailability(): Promise<void> {
    return this.cache.delByPrefix(CacheKeys.availabilityPrefix);
  }

  invalidateAllPrivileges(): Promise<void> {
    return this.cache.delByPrefix(CacheKeys.privilegesPrefix);
  }

  invalidateAdminPrivileges(adminId: number): Promise<void> {
    return this.cache.del(CacheKeys.privileges(adminId));
  }
}
