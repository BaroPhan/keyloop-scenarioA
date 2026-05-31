import { AvailabilityService } from './availability.service';
import { ServiceBay } from '../entities/service-bay.entity';
import { Technician } from '../entities/technician.entity';
import { ServiceType } from '../entities/service-type.entity';
import { Skill } from '../entities/skill.entity';

const skill = (id: number, name: string): Skill =>
  ({ id, name } as Skill);

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
      const bay = { capabilities: ['LIFT', 'EV_CHARGER'] } as ServiceBay;
      expect(
        AvailabilityService.bayIsCapable(
          bay,
          serviceType({ requiredCapabilities: ['LIFT', 'EV_CHARGER'] }),
        ),
      ).toBe(true);
    });

    it('is false when a required capability is missing', () => {
      const bay = { capabilities: ['LIFT'] } as ServiceBay;
      expect(
        AvailabilityService.bayIsCapable(
          bay,
          serviceType({ requiredCapabilities: ['LIFT', 'EV_CHARGER'] }),
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
});
