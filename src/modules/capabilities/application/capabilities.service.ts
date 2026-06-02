import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Capability } from '../../../domain/entities/capability.entity';
import { CreateCapabilityDto } from '../presentation/dto/create-capability.dto';
import { UpdateCapabilityDto } from '../presentation/dto/update-capability.dto';
import { AdminCacheService } from '../../../infrastructure/cache/admin-cache.service';

import { PaginationQueryDto, PaginatedResult, resolvePagination, toPaginatedResult } from '../../../shared/presentation/dto/pagination-query.dto';

@Injectable()
export class CapabilitiesService {
  constructor(
    @InjectRepository(Capability)
    private readonly capabilities: Repository<Capability>,
    private readonly cache: AdminCacheService,
  ) {}

  async listPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Capability>> {
    const { page, limit, skip } = resolvePagination(query);
    const [data, total] = await this.capabilities.findAndCount({
      order: { code: 'ASC' },
      skip,
      take: limit,
    });
    return toPaginatedResult(data, total, page, limit);
  }

  list(): Promise<Capability[]> {
    return this.capabilities.find({ order: { code: 'ASC' } });
  }

  get(id: number): Promise<Capability> {
    return this.requireOne(id);
  }

  async create(dto: CreateCapabilityDto): Promise<Capability> {
    const saved = await this.capabilities.save(
      this.capabilities.create({
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
      }),
    );
    await this.cache.invalidateReference();
    return saved;
  }

  async update(id: number, dto: UpdateCapabilityDto): Promise<Capability> {
    const cap = await this.requireOne(id);
    Object.assign(cap, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.active !== undefined && { active: dto.active }),
    });
    const saved = await this.capabilities.save(cap);
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
    return saved;
  }

  async delete(id: number): Promise<void> {
    await this.requireOne(id);
    await this.capabilities.delete(id);
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
  }

  async resolveByIds(ids: number[]): Promise<Capability[]> {
    const capabilities = await this.capabilities.findBy({ id: In(ids) });
    if (capabilities.length !== ids.length) {
      throw new NotFoundException('One or more capabilities not found.');
    }
    return capabilities;
  }

  async requireOne(id: number): Promise<Capability> {
    const cap = await this.capabilities.findOne({ where: { id } });
    if (!cap) throw new NotFoundException(`Capability ${id} not found.`);
    return cap;
  }
}
