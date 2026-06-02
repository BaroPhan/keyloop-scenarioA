import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dealership } from '../../../domain/entities/dealership.entity';
import { Appointment } from '../../../domain/entities/appointment.entity';
import { CreateDealershipDto } from '../presentation/dto/create-dealership.dto';
import { UpdateDealershipDto } from '../presentation/dto/update-dealership.dto';
import { AdminCacheService } from '../../../infrastructure/cache/admin-cache.service';
import {
  PaginationQueryDto,
  PaginatedResult,
  resolvePagination,
  toPaginatedResult,
} from '../../../shared/presentation/dto/pagination-query.dto';

@Injectable()
export class DealershipsService {
  constructor(
    @InjectRepository(Dealership)
    private readonly dealerships: Repository<Dealership>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    private readonly cache: AdminCacheService,
  ) {}

  async listPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Dealership>> {
    const { page, limit, skip } = resolvePagination(query);
    const [data, total] = await this.dealerships.findAndCount({
      order: { id: 'ASC' },
      skip,
      take: limit,
    });
    return toPaginatedResult(data, total, page, limit);
  }

  list(): Promise<Dealership[]> {
    return this.dealerships.find({ order: { id: 'ASC' } });
  }

  get(id: number): Promise<Dealership> {
    return this.requireOne(id);
  }

  async create(dto: CreateDealershipDto): Promise<Dealership> {
    const saved = await this.dealerships.save(
      this.dealerships.create({
        name: dto.name,
        ...(dto.address !== undefined && { address: dto.address }),
      }),
    );
    await this.cache.invalidateReference();
    return saved;
  }

  async update(id: number, dto: UpdateDealershipDto): Promise<Dealership> {
    const dealership = await this.requireOne(id);
    Object.assign(dealership, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.address !== undefined && { address: dto.address }),
    });
    const saved = await this.dealerships.save(dealership);
    await this.cache.invalidateReference();
    return saved;
  }

  async delete(id: number): Promise<void> {
    await this.requireOne(id);
    const apptCount = await this.appointments.count({
      where: { dealershipId: id },
    });
    if (apptCount > 0) {
      throw new ConflictException(
        'Cannot delete dealership with existing appointments.',
      );
    }
    await this.dealerships.delete(id);
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
  }

  async requireOne(id: number): Promise<Dealership> {
    const dealership = await this.dealerships.findOne({ where: { id } });
    if (!dealership) throw new NotFoundException('Dealership not found.');
    return dealership;
  }
}
