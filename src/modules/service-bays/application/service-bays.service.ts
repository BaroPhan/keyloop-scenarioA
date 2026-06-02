import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceBay } from '../../../domain/entities/service-bay.entity';
import { Appointment } from '../../../domain/entities/appointment.entity';
import { CreateServiceBayDto } from '../presentation/dto/create-service-bay.dto';
import { UpdateServiceBayDto } from '../presentation/dto/update-service-bay.dto';
import { AdminCacheService } from '../../../infrastructure/cache/admin-cache.service';
import { CapabilitiesService } from '../../capabilities/application/capabilities.service';
import { DealershipsService } from '../../dealerships/application/dealerships.service';
import {
  PaginationQueryDto,
  PaginatedResult,
  resolvePagination,
  toPaginatedResult,
} from '../../../shared/presentation/dto/pagination-query.dto';

@Injectable()
export class ServiceBaysService {
  constructor(
    @InjectRepository(ServiceBay) private readonly bays: Repository<ServiceBay>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    private readonly capabilities: CapabilitiesService,
    private readonly dealerships: DealershipsService,
    private readonly cache: AdminCacheService,
  ) {}

  async listPaginated(
    query: PaginationQueryDto,
    dealershipId?: number,
  ): Promise<PaginatedResult<ServiceBay>> {
    const { page, limit, skip } = resolvePagination(query);
    const [data, total] = await this.bays.findAndCount({
      where: dealershipId ? { dealershipId } : {},
      order: { id: 'ASC' },
      skip,
      take: limit,
    });
    return toPaginatedResult(data, total, page, limit);
  }

  list(dealershipId?: number): Promise<ServiceBay[]> {
    return this.bays.find({
      where: dealershipId ? { dealershipId } : {},
      order: { id: 'ASC' },
    });
  }

  get(id: number): Promise<ServiceBay> {
    return this.requireOne(id);
  }

  async create(
    dealershipId: number,
    dto: CreateServiceBayDto,
  ): Promise<ServiceBay> {
    await this.dealerships.requireOne(dealershipId);
    const capabilityEntities = await this.capabilities.resolveByIds(
      dto.capabilityIds,
    );
    const saved = await this.bays.save(
      this.bays.create({
        name: dto.name,
        dealershipId,
        capabilities: capabilityEntities,
      }),
    );
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
    return saved;
  }

  async update(id: number, dto: UpdateServiceBayDto): Promise<ServiceBay> {
    const bay = await this.requireOne(id);
    if (dto.name !== undefined) bay.name = dto.name;
    if (dto.capabilityIds !== undefined) {
      bay.capabilities = await this.capabilities.resolveByIds(
        dto.capabilityIds,
      );
    }
    const saved = await this.bays.save(bay);
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
    return saved;
  }

  async delete(id: number): Promise<void> {
    await this.requireOne(id);
    const count = await this.appointments.count({ where: { serviceBayId: id } });
    if (count > 0) {
      throw new ConflictException(
        'Cannot delete service bay referenced by appointments.',
      );
    }
    await this.bays.delete(id);
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
  }

  private async requireOne(id: number): Promise<ServiceBay> {
    const bay = await this.bays.findOne({ where: { id } });
    if (!bay) throw new NotFoundException(`Service bay ${id} not found.`);
    return bay;
  }
}
