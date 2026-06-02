import { AvailabilityService } from './availability.service';
import { ServiceBay } from '../../../domain/entities/service-bay.entity';
import { Technician } from '../../../domain/entities/technician.entity';
import { ServiceType } from '../../../domain/entities/service-type.entity';
import { Skill } from '../../../domain/entities/skill.entity';
import { Capability } from '../../../domain/entities/capability.entity';

const skill = (id: number, name: string): Skill =>
  ({ id, name } as Skill);

const capability = (id: number, code: string): Capability =>
  ({ id, code, name: code } as Capability);

const LIFT = capability(1, 'LIFT');
const EV_CHARGER = capability(2, 'EV_CHARGER');

const serviceType = (over: Partial<ServiceType> = {}): ServiceType =>
  ({
    id: 1,
    name: 'Test Service',
    durationMinutes: 60,
    requiredCapabilities: [],
    requiredSkills: [],
    ...over,
  } as ServiceType);

describe('AvailabilityService (pure rules)', () => {
  describe('intervalsOverlap', () => {
    const base = new Date('2026-06-01T10:00:00Z');
    const baseEnd = new Date('2026-06-01T11:00:00Z');

    it('detects a partial overlap', () => {
      expect(
        AvailabilityService.intervalsOverlap(
          base,
          baseEnd,
          new Date('2026-06-01T10:30:00Z'),
          new Date('2026-06-01T11:30:00Z'),
        ),
      ).toBe(true);
    });

    it('treats touching intervals [a,b) and [b,c) as non-overlapping', () => {
      expect(
        AvailabilityService.intervalsOverlap(
          base,
          baseEnd,
          baseEnd,
          new Date('2026-06-01T12:00:00Z'),
        ),
      ).toBe(false);
    });

    it('detects full containment', () => {
      expect(
        AvailabilityService.intervalsOverlap(
          base,
          baseEnd,
          new Date('2026-06-01T10:15:00Z'),
          new Date('2026-06-01T10:45:00Z'),
        ),
      ).toBe(true);
    });
  });

  describe('bayIsCapable', () => {
    it('is true when bay provides all required capabilities', () => {
      const bay = { capabilities: [LIFT, EV_CHARGER] } as ServiceBay;
      expect(
        AvailabilityService.bayIsCapable(
          bay,
          serviceType({ requiredCapabilities: [LIFT, EV_CHARGER] }),
        ),
      ).toBe(true);
    });

    it('is false when a required capability is missing', () => {
      const bay = { capabilities: [LIFT] } as ServiceBay;
      expect(
        AvailabilityService.bayIsCapable(
          bay,
          serviceType({ requiredCapabilities: [LIFT, EV_CHARGER] }),
        ),
      ).toBe(false);
    });
  });

  describe('technicianIsQualified', () => {
    const ev = skill(3, 'EV_CERTIFIED');
    const diag = skill(4, 'DIAGNOSTICS');

    it('is true when technician holds all required skills', () => {
      const tech = { skills: [ev, diag, skill(1, 'OIL')] } as Technician;
      expect(
        AvailabilityService.technicianIsQualified(
          tech,
          serviceType({ requiredSkills: [ev, diag] }),
        ),
      ).toBe(true);
    });

    it('is false when a required skill is missing', () => {
      const tech = { skills: [ev] } as Technician;
      expect(
        AvailabilityService.technicianIsQualified(
          tech,
          serviceType({ requiredSkills: [ev, diag] }),
        ),
      ).toBe(false);
    });
  });

  describe('technicianOnShift', () => {
    const tech = {
      shiftStartMinutes: 8 * 60,
      shiftEndMinutes: 17 * 60,
    } as Technician;

    it('is true when the window fits inside the shift', () => {
      expect(
        AvailabilityService.technicianOnShift(
          tech,
          new Date('2026-06-01T09:00:00Z'),
          new Date('2026-06-01T10:00:00Z'),
        ),
      ).toBe(true);
    });

    it('is false when the window ends after the shift', () => {
      expect(
        AvailabilityService.technicianOnShift(
          tech,
          new Date('2026-06-01T16:30:00Z'),
          new Date('2026-06-01T17:30:00Z'),
        ),
      ).toBe(false);
    });

    it('is false when the window starts before the shift', () => {
      expect(
        AvailabilityService.technicianOnShift(
          tech,
          new Date('2026-06-01T07:00:00Z'),
          new Date('2026-06-01T08:00:00Z'),
        ),
      ).toBe(false);
    });

    it('is true when the window starts exactly at shift start', () => {
      expect(
        AvailabilityService.technicianOnShift(
          tech,
          new Date('2026-06-01T08:00:00Z'),
          new Date('2026-06-01T09:00:00Z'),
        ),
      ).toBe(true);
    });

    it('is false when the window spans two days', () => {
      expect(
        AvailabilityService.technicianOnShift(
          tech,
          new Date('2026-06-01T16:00:00Z'),
          new Date('2026-06-02T09:00:00Z'),
        ),
      ).toBe(false);
    });
  });

  describe('openSlotsFrom', () => {
    const tech = (id: number): Technician =>
      ({ id, shiftStartMinutes: 8 * 60, shiftEndMinutes: 17 * 60 } as Technician);
    const bay = (id: number): ServiceBay => ({ id } as ServiceBay);
    const sixtyMin = 60 * 60_000;

    it('returns on-shift starts when resources are free', () => {
      const slots = AvailabilityService.openSlotsFrom(
        [tech(1)],
        [bay(1)],
        new Map(),
        new Map(),
        new Date('2026-06-01T08:00:00Z'),
        new Date('2026-06-01T11:00:00Z'),
        sixtyMin,
        60,
      );
      expect(slots.map((s) => s.toISOString())).toEqual([
        '2026-06-01T08:00:00.000Z',
        '2026-06-01T09:00:00.000Z',
        '2026-06-01T10:00:00.000Z',
      ]);
    });

    it('excludes a start when the only technician is busy', () => {
      const busyTech = new Map([
        [
          1,
          [
            {
              start: new Date('2026-06-01T09:00:00Z'),
              end: new Date('2026-06-01T10:00:00Z'),
            },
          ],
        ],
      ]);
      const slots = AvailabilityService.openSlotsFrom(
        [tech(1)],
        [bay(1)],
        busyTech,
        new Map(),
        new Date('2026-06-01T08:00:00Z'),
        new Date('2026-06-01T11:00:00Z'),
        sixtyMin,
        60,
      );
      expect(slots.map((s) => s.toISOString())).toEqual([
        '2026-06-01T08:00:00.000Z',
        '2026-06-01T10:00:00.000Z',
      ]);
    });

    it('drops starts whose window would run past the shift end', () => {
      const slots = AvailabilityService.openSlotsFrom(
        [tech(1)],
        [bay(1)],
        new Map(),
        new Map(),
        new Date('2026-06-01T16:00:00Z'),
        new Date('2026-06-01T18:00:00Z'),
        sixtyMin,
        60,
      );
      // 16:00-17:00 fits; 17:00-18:00 is past shift end.
      expect(slots.map((s) => s.toISOString())).toEqual([
        '2026-06-01T16:00:00.000Z',
      ]);
    });
  });
});
