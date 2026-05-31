import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ServiceBay } from '../entities/service-bay.entity';
import { Technician } from '../entities/technician.entity';
import { ServiceType } from '../entities/service-type.entity';
import {
  Appointment,
  AppointmentStatus,
} from '../entities/appointment.entity';

/**
 * Encapsulates the "real-time availability" rules:
 *  - a Service Bay must be at the dealership and provide every required capability;
 *  - a Technician must be at the dealership, hold every required skill, and be on
 *    shift for the whole window;
 *  - neither resource may already have a CONFIRMED appointment overlapping the
 *    requested window (half-open interval [start, end)).
 *
 * The pure predicate helpers are static so they can be unit-tested without a DB.
 * The query methods accept an EntityManager so callers can run them inside a
 * booking transaction (with row locks) or standalone (read-only availability).
 */
@Injectable()
export class AvailabilityService {
  /** Two half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap. */
  static intervalsOverlap(
    aStart: Date,
    aEnd: Date,
    bStart: Date,
    bEnd: Date,
  ): boolean {
    return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
  }

  /** A bay is capable when it provides every capability the service requires. */
  static bayIsCapable(bay: ServiceBay, serviceType: ServiceType): boolean {
    const provided = new Set(bay.capabilities ?? []);
    return (serviceType.requiredCapabilities ?? []).every((c) =>
      provided.has(c),
    );
  }

  /** A technician is qualified when they hold every skill the service requires. */
  static technicianIsQualified(
    technician: Technician,
    serviceType: ServiceType,
  ): boolean {
    const held = new Set((technician.skills ?? []).map((s) => s.id));
    return (serviceType.requiredSkills ?? []).every((s) => held.has(s.id));
  }

  /** The technician's daily shift fully contains [start, end) (UTC minutes). */
  static technicianOnShift(
    technician: Technician,
    start: Date,
    end: Date,
  ): boolean {
    const startMinutes = start.getUTCHours() * 60 + start.getUTCMinutes();
    const endMinutes = end.getUTCHours() * 60 + end.getUTCMinutes();
    const sameDay = start.getUTCFullYear() === end.getUTCFullYear() &&
      start.getUTCMonth() === end.getUTCMonth() &&
      start.getUTCDate() === end.getUTCDate();
    return (
      sameDay &&
      startMinutes >= technician.shiftStartMinutes &&
      endMinutes <= technician.shiftEndMinutes
    );
  }

  /**
   * Capable bays at the dealership that are free for [start, end).
   * @param lock when true, acquires a pessimistic write lock on candidate rows.
   */
  async findAvailableBays(
    manager: EntityManager,
    dealershipId: number,
    serviceType: ServiceType,
    start: Date,
    end: Date,
    lock = false,
  ): Promise<ServiceBay[]> {
    const bays = await manager.find(ServiceBay, {
      where: { dealershipId },
      order: { id: 'ASC' },
    });

    const capable = bays.filter((bay) =>
      AvailabilityService.bayIsCapable(bay, serviceType),
    );
    if (capable.length === 0) return [];

    if (lock) {
      await this.lockRows(manager, ServiceBay, capable.map((b) => b.id));
    }

    const busyIds = await this.busyResourceIds(
      manager,
      'serviceBayId',
      capable.map((b) => b.id),
      start,
      end,
    );
    return capable.filter((bay) => !busyIds.has(bay.id));
  }

  /**
   * Qualified, on-shift technicians at the dealership that are free for [start, end).
   * @param lock when true, acquires a pessimistic write lock on candidate rows.
   */
  async findAvailableTechnicians(
    manager: EntityManager,
    dealershipId: number,
    serviceType: ServiceType,
    start: Date,
    end: Date,
    lock = false,
  ): Promise<Technician[]> {
    const technicians = await manager.find(Technician, {
      where: { dealershipId },
      relations: { skills: true },
      order: { id: 'ASC' },
    });

    const eligible = technicians.filter(
      (t) =>
        AvailabilityService.technicianIsQualified(t, serviceType) &&
        AvailabilityService.technicianOnShift(t, start, end),
    );
    if (eligible.length === 0) return [];

    if (lock) {
      await this.lockRows(manager, Technician, eligible.map((t) => t.id));
    }

    const busyIds = await this.busyResourceIds(
      manager,
      'technicianId',
      eligible.map((t) => t.id),
      start,
      end,
    );
    return eligible.filter((t) => !busyIds.has(t.id));
  }

  /**
   * IDs of resources (technician or bay) that already have a CONFIRMED
   * appointment overlapping [start, end).
   */
  private async busyResourceIds(
    manager: EntityManager,
    column: 'technicianId' | 'serviceBayId',
    ids: number[],
    start: Date,
    end: Date,
  ): Promise<Set<number>> {
    if (ids.length === 0) return new Set();

    const rows = await manager
      .createQueryBuilder(Appointment, 'a')
      .select(`a.${column}`, 'resourceId')
      .where(`a.${column} IN (:...ids)`, { ids })
      .andWhere('a.status = :status', {
        status: AppointmentStatus.CONFIRMED,
      })
      .andWhere('a.startTime < :end AND a.endTime > :start', { start, end })
      .getRawMany<{ resourceId: number }>();

    return new Set(rows.map((r) => Number(r.resourceId)));
  }

  /**
   * Acquires a pessimistic write lock on the given rows in a deterministic
   * (id-ascending) order to serialize competing bookings and avoid deadlocks.
   */
  private async lockRows(
    manager: EntityManager,
    target: typeof ServiceBay | typeof Technician,
    ids: number[],
  ): Promise<void> {
    if (ids.length === 0) return;
    await manager
      .createQueryBuilder(target, 'r')
      .setLock('pessimistic_write')
      .where('r.id IN (:...ids)', { ids })
      .orderBy('r.id', 'ASC')
      .getMany();
  }
}
