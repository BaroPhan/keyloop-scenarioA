import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../../domain/entities/customer.entity';
import { Vehicle } from '../../../domain/entities/vehicle.entity';
import {
  PaginationQueryDto,
  PaginatedResult,
  resolvePagination,
  toPaginatedResult,
} from '../../../shared/presentation/dto/pagination-query.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Vehicle)
    private readonly vehicles: Repository<Vehicle>,
  ) {}

  async listPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Customer>> {
    const { page, limit, skip } = resolvePagination(query);
    const [data, total] = await this.customers.findAndCount({
      relations: { vehicles: true },
      order: { id: 'ASC' },
      skip,
      take: limit,
    });
    return toPaginatedResult(data, total, page, limit);
  }

  async listVehiclesPaginated(
    customerId: number,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Vehicle>> {
    const { page, limit, skip } = resolvePagination(query);
    const [data, total] = await this.vehicles.findAndCount({
      where: { customerId },
      order: { id: 'ASC' },
      skip,
      take: limit,
    });
    return toPaginatedResult(data, total, page, limit);
  }
}
