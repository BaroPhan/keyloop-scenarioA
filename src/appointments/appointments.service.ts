import {
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
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { AvailabilityService } from './availability.service';
import {
  Appointment,
  AppointmentStatus,
} from '../entities/appointment.entity';
import { Customer } from '../entities/customer.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Dealership } from '../entities/dealership.entity';
import { ServiceType } from '../entities/service-type.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly availability: AvailabilityService,
  ) {}

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
    return this.dataSource.transaction('READ COMMITTED', async (manager) => {
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
      return this.findOne(saved.id, manager);
    });
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
    const end = new Date(start.getTime() + serviceType.durationMinutes * 60_000);
    return { serviceType, start, end };
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
      availableTechnicians: technicians.map((t) => ({ id: t.id, name: t.name })),
      availableBays: bays.map((b) => ({ id: b.id, name: b.name })),
    };
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

  /** Cancels an appointment, freeing its technician and bay for rebooking. */
  async cancel(id: number): Promise<Appointment> {
    return this.dataSource.transaction(async (manager) => {
      const appointment = await manager.findOne(Appointment, {
        where: { id },
      });
      if (!appointment) {
        throw new NotFoundException(`Appointment ${id} not found.`);
      }
      if (appointment.status === AppointmentStatus.CANCELLED) {
        return this.findOne(id, manager);
      }
      appointment.status = AppointmentStatus.CANCELLED;
      await manager.save(appointment);
      return this.findOne(id, manager);
    });
  }
}
