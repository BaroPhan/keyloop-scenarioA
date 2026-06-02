import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Technician } from '../../../domain/entities/technician.entity';
import { Appointment } from '../../../domain/entities/appointment.entity';
import { CreateTechnicianDto } from '../presentation/dto/create-technician.dto';
import { UpdateTechnicianDto } from '../presentation/dto/update-technician.dto';
import { AdminCacheService } from '../../../infrastructure/cache/admin-cache.service';
import { SkillsService } from '../../skills/application/skills.service';
import { DealershipsService } from '../../dealerships/application/dealerships.service';
import {
  PaginationQueryDto,
  PaginatedResult,
  resolvePagination,
  toPaginatedResult,
} from '../../../shared/presentation/dto/pagination-query.dto';

@Injectable()
export class TechniciansService {
  constructor(
    @InjectRepository(Technician)
    private readonly technicians: Repository<Technician>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    private readonly skills: SkillsService,
    private readonly dealerships: DealershipsService,
    private readonly cache: AdminCacheService,
  ) {}

  async listPaginated(
    query: PaginationQueryDto,
    dealershipId?: number,
  ): Promise<PaginatedResult<Technician>> {
    const { page, limit, skip } = resolvePagination(query);
    const [data, total] = await this.technicians.findAndCount({
      where: dealershipId ? { dealershipId } : {},
      order: { id: 'ASC' },
      skip,
      take: limit,
    });
    return toPaginatedResult(data, total, page, limit);
  }

  list(dealershipId?: number): Promise<Technician[]> {
    return this.technicians.find({
      where: dealershipId ? { dealershipId } : {},
      order: { id: 'ASC' },
    });
  }

  get(id: number): Promise<Technician> {
    return this.requireOne(id);
  }

  async create(
    dealershipId: number,
    dto: CreateTechnicianDto,
  ): Promise<Technician> {
    await this.dealerships.requireOne(dealershipId);
    const skillEntities = await this.skills.resolveByIds(dto.skillIds);
    const saved = await this.technicians.save(
      this.technicians.create({
        name: dto.name,
        dealershipId,
        skills: skillEntities,
        ...(dto.shiftStartMinutes !== undefined && {
          shiftStartMinutes: dto.shiftStartMinutes,
        }),
        ...(dto.shiftEndMinutes !== undefined && {
          shiftEndMinutes: dto.shiftEndMinutes,
        }),
      }),
    );
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
    return saved;
  }

  async update(id: number, dto: UpdateTechnicianDto): Promise<Technician> {
    const tech = await this.requireOne(id);
    if (dto.name !== undefined) tech.name = dto.name;
    if (dto.skillIds !== undefined) {
      tech.skills = await this.skills.resolveByIds(dto.skillIds);
    }
    if (dto.shiftStartMinutes !== undefined) {
      tech.shiftStartMinutes = dto.shiftStartMinutes;
    }
    if (dto.shiftEndMinutes !== undefined) {
      tech.shiftEndMinutes = dto.shiftEndMinutes;
    }
    const saved = await this.technicians.save(tech);
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
    return saved;
  }

  async delete(id: number): Promise<void> {
    await this.requireOne(id);
    const count = await this.appointments.count({ where: { technicianId: id } });
    if (count > 0) {
      throw new ConflictException(
        'Cannot delete technician referenced by appointments.',
      );
    }
    await this.technicians.delete(id);
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
  }

  private async requireOne(id: number): Promise<Technician> {
    const tech = await this.technicians.findOne({ where: { id } });
    if (!tech) throw new NotFoundException(`Technician ${id} not found.`);
    return tech;
  }
}
