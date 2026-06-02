import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ServiceBay } from '../../../domain/entities/service-bay.entity';
import { Technician } from '../../../domain/entities/technician.entity';
import { ServiceType } from '../../../domain/entities/service-type.entity';
import {
  Appointment,
  AppointmentStatus,
} from '../../../domain/entities/appointment.entity';

export interface Interval {
  start: Date;
  end: Date;
}

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
    const provided = new Set((bay.capabilities ?? []).map((c) => c.id));
    return (serviceType.requiredCapabilities ?? []).every((c) =>
      provided.has(c.id),
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
   * Enumerates open start times for a service at a dealership within
   * [windowStart, windowEnd), stepping by `stepMinutes`. A slot is open when at
   * least one capable bay AND one qualified, on-shift technician are both free
   * for the full duration. Loads candidate resources and their booked intervals
   * once, then evaluates slots in-memory (used by the slots API and watches).
   */
  async findOpenSlots(
    manager: EntityManager,
    dealershipId: number,
    serviceType: ServiceType,
    windowStart: Date,
    windowEnd: Date,
    stepMinutes = 30,
  ): Promise<Date[]> {
    const durationMs = serviceType.durationMinutes * 60_000;

    const bays = (
      await manager.find(ServiceBay, { where: { dealershipId } })
    ).filter((bay) => AvailabilityService.bayIsCapable(bay, serviceType));
    const technicians = (
      await manager.find(Technician, {
        where: { dealershipId },
        relations: { skills: true },
      })
    ).filter((t) => AvailabilityService.technicianIsQualified(t, serviceType));

    if (bays.length === 0 || technicians.length === 0) return [];

    const busyByTech = await this.busyIntervalsByResource(
      manager,
      'technicianId',
      technicians.map((t) => t.id),
      windowStart,
      new Date(windowEnd.getTime() + durationMs),
    );
    const busyByBay = await this.busyIntervalsByResource(
      manager,
      'serviceBayId',
      bays.map((b) => b.id),
      windowStart,
      new Date(windowEnd.getTime() + durationMs),
    );

    return AvailabilityService.openSlotsFrom(
      technicians,
      bays,
      busyByTech,
      busyByBay,
      windowStart,
      windowEnd,
      durationMs,
      stepMinutes,
    );
  }

  /**
   * Pure slot enumeration: given eligible resources and their booked intervals,
   * returns the start times in [windowStart, windowEnd) (stepped by
   * stepMinutes) where at least one technician (on-shift) and one bay are both
   * free for the full duration. Extracted for unit testing without a DB.
   */
  static openSlotsFrom(
    technicians: Technician[],
    bays: ServiceBay[],
    busyByTech: Map<number, Interval[]>,
    busyByBay: Map<number, Interval[]>,
    windowStart: Date,
    windowEnd: Date,
    durationMs: number,
    stepMinutes = 30,
  ): Date[] {
    const isFree = (intervals: Interval[] | undefined, s: Date, e: Date) =>
      !(intervals ?? []).some((iv) =>
        AvailabilityService.intervalsOverlap(s, e, iv.start, iv.end),
      );

    const slots: Date[] = [];
    const stepMs = stepMinutes * 60_000;
    for (let t = windowStart.getTime(); t < windowEnd.getTime(); t += stepMs) {
      const start = new Date(t);
      const end = new Date(t + durationMs);
      const techFree = technicians.some(
        (tech) =>
          AvailabilityService.technicianOnShift(tech, start, end) &&
          isFree(busyByTech.get(tech.id), start, end),
      );
      if (!techFree) continue;
      const bayFree = bays.some((bay) =>
        isFree(busyByBay.get(bay.id), start, end),
      );
      if (bayFree) slots.push(start);
    }
    return slots;
  }

  /** Booked CONFIRMED intervals grouped by resource id, within [from, to). */
  private async busyIntervalsByResource(
    manager: EntityManager,
    column: 'technicianId' | 'serviceBayId',
    ids: number[],
    from: Date,
    to: Date,
  ): Promise<Map<number, Interval[]>> {
    const map = new Map<number, Interval[]>();
    if (ids.length === 0) return map;

    const rows = await manager
      .createQueryBuilder(Appointment, 'a')
      .select(`a.${column}`, 'resourceId')
      .addSelect('a.startTime', 'startTime')
      .addSelect('a.endTime', 'endTime')
      .where(`a.${column} IN (:...ids)`, { ids })
      .andWhere('a.status = :status', { status: AppointmentStatus.CONFIRMED })
      .andWhere('a.startTime < :to AND a.endTime > :from', { from, to })
      .getRawMany<{ resourceId: number; startTime: Date; endTime: Date }>();

    for (const row of rows) {
      const id = Number(row.resourceId);
      const list = map.get(id) ?? [];
      list.push({
        start: new Date(row.startTime),
        end: new Date(row.endTime),
      });
      map.set(id, list);
    }
    return map;
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
