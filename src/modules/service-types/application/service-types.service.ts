import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceType } from '../../../domain/entities/service-type.entity';
import { Appointment } from '../../../domain/entities/appointment.entity';
import { CreateServiceTypeDto } from '../presentation/dto/create-service-type.dto';
import { UpdateServiceTypeDto } from '../presentation/dto/update-service-type.dto';
import { AdminCacheService } from '../../../infrastructure/cache/admin-cache.service';
import { CapabilitiesService } from '../../capabilities/application/capabilities.service';
import { SkillsService } from '../../skills/application/skills.service';
import {
  PaginationQueryDto,
  PaginatedResult,
  resolvePagination,
  toPaginatedResult,
} from '../../../shared/presentation/dto/pagination-query.dto';

@Injectable()
export class ServiceTypesService {
  constructor(
    @InjectRepository(ServiceType)
    private readonly serviceTypes: Repository<ServiceType>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    private readonly capabilities: CapabilitiesService,
    private readonly skills: SkillsService,
    private readonly cache: AdminCacheService,
  ) {}

  async listPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<ServiceType>> {
    const { page, limit, skip } = resolvePagination(query);
    const [data, total] = await this.serviceTypes.findAndCount({
      order: { name: 'ASC' },
      skip,
      take: limit,
    });
    return toPaginatedResult(data, total, page, limit);
  }

  list(): Promise<ServiceType[]> {
    return this.serviceTypes.find({ order: { name: 'ASC' } });
  }

  get(id: number): Promise<ServiceType> {
    return this.requireOne(id);
  }

  async create(dto: CreateServiceTypeDto): Promise<ServiceType> {
    const requiredCapabilities = await this.capabilities.resolveByIds(
      dto.requiredCapabilityIds,
    );
    const requiredSkills = await this.skills.resolveByIds(dto.requiredSkillIds);
    const saved = await this.serviceTypes.save(
      this.serviceTypes.create({
        name: dto.name,
        durationMinutes: dto.durationMinutes,
        requiredCapabilities,
        requiredSkills,
      }),
    );
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
    return saved;
  }

  async update(id: number, dto: UpdateServiceTypeDto): Promise<ServiceType> {
    const st = await this.requireOne(id);
    if (dto.name !== undefined) st.name = dto.name;
    if (dto.durationMinutes !== undefined) {
      st.durationMinutes = dto.durationMinutes;
    }
    if (dto.requiredCapabilityIds !== undefined) {
      st.requiredCapabilities = await this.capabilities.resolveByIds(
        dto.requiredCapabilityIds,
      );
    }
    if (dto.requiredSkillIds !== undefined) {
      st.requiredSkills = await this.skills.resolveByIds(dto.requiredSkillIds);
    }
    const saved = await this.serviceTypes.save(st);
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
    return saved;
  }

  async delete(id: number): Promise<void> {
    await this.requireOne(id);
    const apptCount = await this.appointments.count({
      where: { serviceTypeId: id },
    });
    if (apptCount > 0) {
      throw new ConflictException(
        'Cannot delete service type referenced by appointments.',
      );
    }
    await this.serviceTypes.delete(id);
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
  }

  private async requireOne(id: number): Promise<ServiceType> {
    const st = await this.serviceTypes.findOne({ where: { id } });
    if (!st) throw new NotFoundException(`Service type ${id} not found.`);
    return st;
  }
}
