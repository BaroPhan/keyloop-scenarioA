import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AvailabilityService } from './availability.service';
import { CreateWatchDto } from '../presentation/dto/create-watch.dto';
import {
  AvailabilityWatch,
  WatchStatus,
} from '../../../domain/entities/availability-watch.entity';
import { ServiceType } from '../../../domain/entities/service-type.entity';
import { Dealership } from '../../../domain/entities/dealership.entity';

@Injectable()
export class AvailabilityWatchService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly availability: AvailabilityService,
  ) {}

  async create(
    customerId: number,
    dto: CreateWatchDto,
  ): Promise<AvailabilityWatch> {
    if (dto.windowEnd.getTime() <= dto.windowStart.getTime()) {
      throw new BadRequestException('windowEnd must be after windowStart.');
    }
    const manager = this.dataSource.manager;
    const dealership = await manager.findOne(Dealership, {
      where: { id: dto.dealershipId },
    });
    if (!dealership) throw new NotFoundException('Dealership not found.');
    const serviceType = await manager.findOne(ServiceType, {
      where: { id: dto.serviceTypeId },
    });
    if (!serviceType) throw new NotFoundException('Service type not found.');

    return manager.save(AvailabilityWatch, {
      customerId,
      dealershipId: dto.dealershipId,
      serviceTypeId: dto.serviceTypeId,
      windowStart: dto.windowStart,
      windowEnd: dto.windowEnd,
      status: WatchStatus.ACTIVE,
    });
  }

  findForCustomer(customerId: number): Promise<AvailabilityWatch[]> {
    return this.dataSource.manager.find(AvailabilityWatch, {
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async cancel(customerId: number, id: number): Promise<AvailabilityWatch> {
    const watch = await this.dataSource.manager.findOne(AvailabilityWatch, {
      where: { id },
    });
    if (!watch || watch.customerId !== customerId) {
      throw new NotFoundException('Watch not found.');
    }
    watch.status = WatchStatus.CANCELLED;
    return this.dataSource.manager.save(watch);
  }

  findActive(): Promise<AvailabilityWatch[]> {
    return this.dataSource.manager.find(AvailabilityWatch, {
      where: { status: WatchStatus.ACTIVE },
    });
  }

  async findOpenSlotForWatch(
    watch: AvailabilityWatch,
  ): Promise<Date | null> {
    const serviceType = await this.dataSource.manager.findOne(ServiceType, {
      where: { id: watch.serviceTypeId },
    });
    if (!serviceType) return null;
    const slots = await this.availability.findOpenSlots(
      this.dataSource.manager,
      watch.dealershipId,
      serviceType,
      new Date(watch.windowStart),
      new Date(watch.windowEnd),
    );
    return slots.length > 0 ? slots[0] : null;
  }

  async markNotified(id: number, slot: Date): Promise<void> {
    await this.dataSource.manager.update(AvailabilityWatch, id, {
      status: WatchStatus.NOTIFIED,
      notifiedSlot: slot,
      notifiedAt: new Date(),
    });
  }
}
