import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../../../domain/entities/admin.entity';
import { Privilege } from '../../../domain/entities/privilege.entity';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { CacheKeys, CacheTtl } from '../../../infrastructure/cache/cache-keys';
import { PrivilegeCode } from '../../../domain/rbac/privilege-codes';
import { CreatePrivilegeDto } from '../presentation/dto/create-privilege.dto';
import {
  PaginationQueryDto,
  PaginatedResult,
  resolvePagination,
  toPaginatedResult,
} from '../../../shared/presentation/dto/pagination-query.dto';
import { AdminCacheService } from '../../../infrastructure/cache/admin-cache.service';

@Injectable()
export class AdminPrivilegesService {
  constructor(
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
    @InjectRepository(Privilege)
    private readonly privileges: Repository<Privilege>,
    private readonly cache: CacheService,
    private readonly adminCache: AdminCacheService,
  ) {}

  async effectivePrivileges(adminId: number): Promise<Set<PrivilegeCode>> {
    const codes = await this.cache.wrap(
      CacheKeys.privileges(adminId),
      CacheTtl.privileges,
      async () => {
        const admin = await this.admins.findOne({
          where: { id: adminId },
          relations: { group: { privileges: true } },
        });
        if (!admin?.group) return [] as PrivilegeCode[];
        return (admin.group.privileges ?? []).map(
          (p) => p.code as PrivilegeCode,
        );
      },
    );
    return new Set(codes);
  }

  async listPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Privilege>> {
    const { page, limit, skip } = resolvePagination(query);
    const [data, total] = await this.privileges.findAndCount({
      order: { code: 'ASC' },
      skip,
      take: limit,
    });
    return toPaginatedResult(data, total, page, limit);
  }

  async create(dto: CreatePrivilegeDto): Promise<Privilege> {
    const existing = await this.privileges.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Privilege code "${dto.code}" already exists.`);
    }
    return this.privileges.save(
      this.privileges.create({
        code: dto.code,
        ...(dto.description !== undefined && { description: dto.description }),
      }),
    );
  }

  async delete(id: number): Promise<void> {
    const privilege = await this.privileges.findOne({
      where: { id },
      relations: { groups: true },
    });
    if (!privilege) {
      throw new NotFoundException(`Privilege ${id} not found.`);
    }
    if ((privilege.groups?.length ?? 0) > 0) {
      throw new ConflictException(
        'Cannot delete privilege assigned to one or more admin groups.',
      );
    }
    await this.privileges.remove(privilege);
    await this.adminCache.invalidateAllPrivileges();
  }
}
