import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  FindOptionsWhere,
  LessThan,
  MoreThanOrEqual,
} from 'typeorm';
import { CreateAppointmentDto } from '../presentation/dto/create-appointment.dto';
import { ListAppointmentsDto } from '../presentation/dto/list-appointments.dto';
import { QueryAvailabilityDto } from '../presentation/dto/query-availability.dto';
import { SlotsQueryDto } from '../presentation/dto/slots-query.dto';
import { AvailabilityService } from './availability.service';
import {
  Appointment,
  AppointmentStatus,
} from '../../../domain/entities/appointment.entity';
import { Customer } from '../../../domain/entities/customer.entity';
import { Vehicle } from '../../../domain/entities/vehicle.entity';
import { Dealership } from '../../../domain/entities/dealership.entity';
import { ServiceType } from '../../../domain/entities/service-type.entity';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { CacheKeys, CacheTtl } from '../../../infrastructure/cache/cache-keys';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  MAIL_QUEUE,
  MailJob,
  MailJobData,
  WATCH_QUEUE,
  WatchJob,
} from '../../../infrastructure/queue/queue.constants';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly availability: AvailabilityService,
    private readonly cache: CacheService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue<MailJobData>,
    @InjectQueue(WATCH_QUEUE) private readonly watchQueue: Queue,
  ) {}

  /** Availability is sensitive to any booking change; drop the whole namespace. */
  private async invalidateAvailability(): Promise<void> {
    await this.cache.delByPrefix(CacheKeys.availabilityPrefix);
  }

  /**
   * Caps any queue operation so a slow/unreachable Redis can never block the
   * HTTP request. BullMQ buffers commands while reconnecting (it requires
   * maxRetriesPerRequest=null), so we race the call against a short timeout.
   */
  private async withTimeout(p: Promise<unknown>, ms = 500): Promise<void> {
    try {
      await Promise.race([
        p,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
      ]);
    } catch {
      // swallow: notifications/watch triggers are non-critical
    }
  }

  /** Best-effort email enqueue; never fails or blocks the request. */
  private async enqueueMail(name: string, data: MailJobData): Promise<void> {
    await this.withTimeout(
      this.mailQueue.add(name, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      }),
    );
  }

  /** Notifies the watch worker that capacity may have freed up. */
  private async triggerWatchCheck(
    dealershipId: number,
    serviceTypeId: number,
  ): Promise<void> {
    await this.withTimeout(
      this.watchQueue.add(
        WatchJob.CHECK,
        { dealershipId, serviceTypeId },
        { removeOnComplete: true, removeOnFail: true },
      ),
    );
  }

  private async customerEmail(customerId: number): Promise<string | null> {
    const customer = await this.dataSource.manager.findOne(Customer, {
      where: { id: customerId },
    });
    return customer?.email ?? null;
  }

  /**
   * Books an appointment. Runs inside a transaction and acquires pessimistic
   * write locks on candidate technicians/bays so concurrent requests for the
   * same resource serialize and cannot double-book. Returns the confirmed
   * record, or throws 409 when no qualified technician + capable bay pair is
   * free for the full duration.
   */
  async book(dto: CreateAppointmentDto): Promise<Appointment> {
    // READ COMMITTED so that, after a competing booking releases its row lock,
    // our overlap check reads the latest committed appointments rather than the
    // transaction-start snapshot that REPEATABLE READ (MySQL default) would use.
    const { result, confirmation } = await this.dataSource.transaction(
      'READ COMMITTED',
      async (manager) => {
        const { serviceType, start, end } = await this.resolveRequest(
          manager,
          dto,
        );

        // Sequential (not Promise.all): a transaction runs on a single DB
        // connection, so queries must not be issued concurrently. Locking bays
        // before technicians in a fixed order across all bookings also avoids
        // deadlocks.
        const bays = await this.availability.findAvailableBays(
          manager,
          dto.dealershipId,
          serviceType,
          start,
          end,
          true,
        );
        const technicians = await this.availability.findAvailableTechnicians(
          manager,
          dto.dealershipId,
          serviceType,
          start,
          end,
          true,
        );

        if (technicians.length === 0 || bays.length === 0) {
          throw new ConflictException(
            'No qualified technician and capable service bay are both available for the requested time.',
          );
        }

        const appointment = manager.create(Appointment, {
          customerId: dto.customerId,
          vehicleId: dto.vehicleId,
          dealershipId: dto.dealershipId,
          serviceTypeId: serviceType.id,
          technicianId: technicians[0].id,
          serviceBayId: bays[0].id,
          startTime: start,
          endTime: end,
          status: AppointmentStatus.CONFIRMED,
        });
        const saved = await manager.save(appointment);
        const result = await this.findOne(saved.id, manager);
        return {
          result,
          confirmation: {
            serviceName: serviceType.name,
            start,
            end,
            id: saved.id,
            customerId: dto.customerId,
          },
        };
      },
    );

    // Side effects run AFTER commit so they never hold DB row locks.
    await this.invalidateAvailability();
    const email = await this.customerEmail(confirmation.customerId);
    if (email) {
      await this.enqueueMail(MailJob.BOOKING_CONFIRMATION, {
        to: email,
        subject: 'Your appointment is confirmed',
        body:
          `Your ${confirmation.serviceName} is confirmed for ` +
          `${confirmation.start.toISOString()} (ends ${confirmation.end.toISOString()}). ` +
          `Confirmation #${confirmation.id}.`,
      });
    }
    return result;
  }

  /**
   * Resolves and validates the referenced entities, and computes the service
   * window from the service type's fixed duration.
   */
  private async resolveRequest(
    manager: EntityManager,
    dto: CreateAppointmentDto,
  ): Promise<{ serviceType: ServiceType; start: Date; end: Date }> {
    // Sequential: see note in book() - the transaction uses a single connection.
    const customer = await manager.findOne(Customer, {
      where: { id: dto.customerId },
    });
    const vehicle = await manager.findOne(Vehicle, {
      where: { id: dto.vehicleId },
    });
    const dealership = await manager.findOne(Dealership, {
      where: { id: dto.dealershipId },
    });
    const serviceType = await manager.findOne(ServiceType, {
      where: { id: dto.serviceTypeId },
    });

    if (!customer) throw new NotFoundException('Customer not found.');
    if (!vehicle) throw new NotFoundException('Vehicle not found.');
    if (!dealership) throw new NotFoundException('Dealership not found.');
    if (!serviceType) throw new NotFoundException('Service type not found.');

    if (vehicle.customerId !== customer.id) {
      throw new ConflictException(
        'Vehicle does not belong to the requesting customer.',
      );
    }

    const start = new Date(dto.startTime);
    // Advance-booking guard: never book in the past.
    if (start.getTime() <= Date.now()) {
      throw new BadRequestException('startTime must be in the future.');
    }
    const end = new Date(start.getTime() + serviceType.durationMinutes * 60_000);
    return { serviceType, start, end };
  }

  /**
   * Enumerates open start times for a service at a dealership for a UTC day.
   * Backs the advance-booking discovery API and is cached briefly.
   */
  async findSlots(dto: SlotsQueryDto) {
    const serviceType = await this.dataSource.manager.findOne(ServiceType, {
      where: { id: dto.serviceTypeId },
    });
    if (!serviceType) throw new NotFoundException('Service type not found.');

    return this.cache.wrap(
      CacheKeys.slots(dto.dealershipId, dto.serviceTypeId, dto.date),
      CacheTtl.availability,
      async () => {
        const dayStart = new Date(`${dto.date}T00:00:00.000Z`);
        const dayEnd = new Date(`${dto.date}T23:59:59.999Z`);
        const slots = await this.availability.findOpenSlots(
          this.dataSource.manager,
          dto.dealershipId,
          serviceType,
          dayStart,
          dayEnd,
        );
        return {
          dealershipId: dto.dealershipId,
          serviceTypeId: serviceType.id,
          date: dto.date,
          durationMinutes: serviceType.durationMinutes,
          openSlots: slots.map((s) => s.toISOString()),
        };
      },
    );
  }

  /**
   * Read-only availability probe for a given service/dealership/start time.
   * Returns the free technicians and bays (without booking anything).
   */
  async checkAvailability(dto: QueryAvailabilityDto) {
    const manager = this.dataSource.manager;
    const serviceType = await manager.findOne(ServiceType, {
      where: { id: dto.serviceTypeId },
    });
    if (!serviceType) throw new NotFoundException('Service type not found.');

    const start = new Date(dto.startTime);
    const end = new Date(start.getTime() + serviceType.durationMinutes * 60_000);

    return this.cache.wrap(
      CacheKeys.availability(
        dto.dealershipId,
        serviceType.id,
        start.toISOString(),
      ),
      CacheTtl.availability,
      async () => {
        const [technicians, bays] = await Promise.all([
          this.availability.findAvailableTechnicians(
            manager,
            dto.dealershipId,
            serviceType,
            start,
            end,
          ),
          this.availability.findAvailableBays(
            manager,
            dto.dealershipId,
            serviceType,
            start,
            end,
          ),
        ]);

        return {
          dealershipId: dto.dealershipId,
          serviceTypeId: serviceType.id,
          startTime: start,
          endTime: end,
          available: technicians.length > 0 && bays.length > 0,
          availableTechnicians: technicians.map((t) => ({
            id: t.id,
            name: t.name,
          })),
          availableBays: bays.map((b) => ({ id: b.id, name: b.name })),
        };
      },
    );
  }

  async findOne(
    id: number,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<Appointment> {
    const appointment = await manager.findOne(Appointment, {
      where: { id },
      relations: {
        customer: true,
        vehicle: true,
        dealership: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} not found.`);
    }
    return appointment;
  }

  async findOneForCustomer(
    id: number,
    customerId: number,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<Appointment> {
    const appointment = await manager.findOne(Appointment, {
      where: { id, customerId },
      relations: {
        customer: true,
        vehicle: true,
        dealership: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} not found.`);
    }
    return appointment;
  }

  /** Order history for the authenticated customer. */
  async findForCustomer(customerId: number): Promise<Appointment[]> {
    return this.dataSource.manager.find(Appointment, {
      where: { customerId },
      order: { startTime: 'DESC' },
    });
  }

  async findAll(filter: ListAppointmentsDto): Promise<Appointment[]> {
    const where: FindOptionsWhere<Appointment> = {};
    if (filter.dealershipId) where.dealershipId = filter.dealershipId;
    if (filter.from && filter.to) {
      where.startTime = Between(filter.from, filter.to);
    } else if (filter.from) {
      where.startTime = MoreThanOrEqual(filter.from);
    } else if (filter.to) {
      where.startTime = LessThan(filter.to);
    }

    return this.dataSource.manager.find(Appointment, {
      where,
      order: { startTime: 'ASC' },
    });
  }

  /** All appointments, newest first (admin with VIEW_APPOINTMENTS). */
  listAll(): Promise<Appointment[]> {
    return this.dataSource.manager.find(Appointment, {
      order: { startTime: 'DESC' },
    });
  }

  async cancelForCustomer(
    id: number,
    customerId: number,
  ): Promise<Appointment> {
    const owned = await this.dataSource.manager.findOne(Appointment, {
      where: { id, customerId },
    });
    if (!owned) {
      throw new NotFoundException(`Appointment ${id} not found.`);
    }
    return this.cancel(id);
  }

  /** Cancels an appointment, freeing its technician and bay for rebooking. */
  async cancel(id: number): Promise<Appointment> {
    const { result, freed } = await this.dataSource.transaction(
      async (manager) => {
        const appointment = await manager.findOne(Appointment, {
          where: { id },
        });
        if (!appointment) {
          throw new NotFoundException(`Appointment ${id} not found.`);
        }
        if (appointment.status === AppointmentStatus.CANCELLED) {
          return { result: await this.findOne(id, manager), freed: null };
        }
        appointment.status = AppointmentStatus.CANCELLED;
        await manager.save(appointment);
        const result = await this.findOne(id, manager);
        await this.invalidateAvailability();
        return {
          result,
          freed: {
            dealershipId: appointment.dealershipId,
            serviceTypeId: appointment.serviceTypeId,
            customerId: appointment.customerId,
          },
        };
      },
    );

    if (freed) {
      const email = await this.customerEmail(freed.customerId);
      if (email) {
        await this.enqueueMail(MailJob.CANCELLATION, {
          to: email,
          subject: 'Your appointment was cancelled',
          body: `Appointment #${id} has been cancelled and the slot is now free.`,
        });
      }
      // A freed slot may satisfy waiting users: trigger a targeted re-check.
      await this.triggerWatchCheck(freed.dealershipId, freed.serviceTypeId);
    }
    return result;
  }

  async rescheduleForCustomer(
    id: number,
    customerId: number,
    newStart: Date,
  ): Promise<Appointment> {
    const owned = await this.dataSource.manager.findOne(Appointment, {
      where: { id, customerId },
    });
    if (!owned) {
      throw new NotFoundException(`Appointment ${id} not found.`);
    }
    return this.reschedule(id, newStart);
  }

  /**
   * Reschedules an appointment to a new start time. Cancels the existing record
   * and books the new window atomically (same pessimistic-locking rules), so
   * the move either fully succeeds or leaves the original intact on 409.
   */
  async reschedule(id: number, newStart: Date): Promise<Appointment> {
    if (newStart.getTime() <= Date.now()) {
      throw new BadRequestException('startTime must be in the future.');
    }
    const { result, original } = await this.dataSource.transaction(
      'READ COMMITTED',
      async (manager) => {
        const existing = await manager.findOne(Appointment, { where: { id } });
        if (!existing) {
          throw new NotFoundException(`Appointment ${id} not found.`);
        }
        if (existing.status === AppointmentStatus.CANCELLED) {
          throw new ConflictException('Cannot reschedule a cancelled appointment.');
        }

        const serviceType = await manager.findOne(ServiceType, {
          where: { id: existing.serviceTypeId },
        });
        if (!serviceType) throw new NotFoundException('Service type not found.');
        const end = new Date(
          newStart.getTime() + serviceType.durationMinutes * 60_000,
        );

        // Free the old slot first so the same resource can be reused for the
        // new time, then re-evaluate availability under row locks.
        existing.status = AppointmentStatus.CANCELLED;
        await manager.save(existing);

        const bays = await this.availability.findAvailableBays(
          manager,
          existing.dealershipId,
          serviceType,
          newStart,
          end,
          true,
        );
        const technicians = await this.availability.findAvailableTechnicians(
          manager,
          existing.dealershipId,
          serviceType,
          newStart,
          end,
          true,
        );
        if (technicians.length === 0 || bays.length === 0) {
          throw new ConflictException(
            'No availability for the requested new time.',
          );
        }

        const moved = await manager.save(
          manager.create(Appointment, {
            customerId: existing.customerId,
            vehicleId: existing.vehicleId,
            dealershipId: existing.dealershipId,
            serviceTypeId: existing.serviceTypeId,
            technicianId: technicians[0].id,
            serviceBayId: bays[0].id,
            startTime: newStart,
            endTime: end,
            status: AppointmentStatus.CONFIRMED,
          }),
        );
        const result = await this.findOne(moved.id, manager);
        await this.invalidateAvailability();
        return {
          result,
          original: {
            dealershipId: existing.dealershipId,
            serviceTypeId: existing.serviceTypeId,
            customerId: existing.customerId,
          },
        };
      },
    );

    const email = await this.customerEmail(original.customerId);
    if (email) {
      await this.enqueueMail(MailJob.BOOKING_CONFIRMATION, {
        to: email,
        subject: 'Your appointment was rescheduled',
        body: `Appointment #${id} moved to ${newStart.toISOString()} (new #${result.id}).`,
      });
    }
    await this.triggerWatchCheck(original.dealershipId, original.serviceTypeId);
    return result;
  }
}
