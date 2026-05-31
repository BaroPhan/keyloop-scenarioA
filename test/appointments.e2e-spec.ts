import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http-exception.filter';
import { Skill } from '../src/entities/skill.entity';
import { ServiceType } from '../src/entities/service-type.entity';
import { Dealership } from '../src/entities/dealership.entity';
import { ServiceBay } from '../src/entities/service-bay.entity';
import { Technician } from '../src/entities/technician.entity';
import { Customer } from '../src/entities/customer.entity';
import { Vehicle } from '../src/entities/vehicle.entity';

/**
 * Integration tests that exercise the full HTTP + DB stack.
 * REQUIRES a running MySQL (see README: `docker compose up -d`).
 */
describe('Appointments (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;

  // ids populated per test by seedSingleResourceDealership()
  let ctx: {
    customerId: number;
    vehicleId: number;
    dealershipId: number;
    serviceTypeId: number;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    ds = app.get<DataSource>(getDataSourceToken());
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    ctx = await seedSingleResourceDealership(ds);
  });

  /**
   * Creates a dealership with exactly ONE capable bay and ONE qualified
   * technician, plus a customer + vehicle. This makes resource contention easy
   * to assert in the conflict and concurrency tests.
   */
  async function seedSingleResourceDealership(dataSource: DataSource) {
    return dataSource.transaction(async (manager) => {
      await manager.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of [
        'appointments',
        'technician_skills',
        'service_type_required_skills',
        'service_bays',
        'technicians',
        'service_types',
        'skills',
        'vehicles',
        'customers',
        'dealerships',
      ]) {
        await manager.query(`TRUNCATE TABLE \`${table}\``);
      }
      await manager.query('SET FOREIGN_KEY_CHECKS = 1');

      const oil = await manager.save(Skill, { name: 'OIL_CHANGE' });
      const serviceType = await manager.save(ServiceType, {
        name: 'Standard Oil Change',
        durationMinutes: 60,
        requiredCapabilities: ['LIFT'],
        requiredSkills: [oil],
      });
      const dealership = await manager.save(Dealership, {
        name: 'Test Dealership',
        address: '1 Test Ave',
      });
      await manager.save(ServiceBay, {
        name: 'Bay 1',
        capabilities: ['LIFT'],
        dealershipId: dealership.id,
      });
      await manager.save(Technician, {
        name: 'Only Tech',
        dealershipId: dealership.id,
        skills: [oil],
      });
      const customer = await manager.save(Customer, {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '555',
      });
      const vehicle = await manager.save(Vehicle, {
        vin: 'VIN-TEST-1',
        make: 'Honda',
        model: 'Civic',
        year: 2020,
        customerId: customer.id,
      });

      return {
        customerId: customer.id,
        vehicleId: vehicle.id,
        dealershipId: dealership.id,
        serviceTypeId: serviceType.id,
      };
    });
  }

  const bookingBody = (startTime: string) => ({
    customerId: ctx.customerId,
    vehicleId: ctx.vehicleId,
    dealershipId: ctx.dealershipId,
    serviceTypeId: ctx.serviceTypeId,
    startTime,
  });

  it('books an appointment successfully (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/appointments')
      .send(bookingBody('2026-06-01T09:00:00Z'))
      .expect(201);

    expect(res.body).toMatchObject({
      status: 'CONFIRMED',
      dealershipId: ctx.dealershipId,
    });
    expect(res.body.technicianId).toBeDefined();
    expect(res.body.serviceBayId).toBeDefined();
  });

  it('rejects an overlapping booking with 409', async () => {
    await request(app.getHttpServer())
      .post('/appointments')
      .send(bookingBody('2026-06-01T09:00:00Z'))
      .expect(201);

    // Overlaps the first (09:00-10:00); only one tech + one bay exist.
    await request(app.getHttpServer())
      .post('/appointments')
      .send(bookingBody('2026-06-01T09:30:00Z'))
      .expect(409);
  });

  it('allows a back-to-back (non-overlapping) booking', async () => {
    await request(app.getHttpServer())
      .post('/appointments')
      .send(bookingBody('2026-06-01T09:00:00Z'))
      .expect(201);

    await request(app.getHttpServer())
      .post('/appointments')
      .send(bookingBody('2026-06-01T10:00:00Z'))
      .expect(201);
  });

  it('frees the slot after cancellation', async () => {
    const first = await request(app.getHttpServer())
      .post('/appointments')
      .send(bookingBody('2026-06-01T09:00:00Z'))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/appointments/${first.body.id}/cancel`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/appointments')
      .send(bookingBody('2026-06-01T09:00:00Z'))
      .expect(201);
  });

  it('lets exactly one of two concurrent bookings win (no double-booking)', async () => {
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/appointments')
        .send(bookingBody('2026-06-01T09:00:00Z')),
      request(app.getHttpServer())
        .post('/appointments')
        .send(bookingBody('2026-06-01T09:00:00Z')),
    ]);

    const statuses = responses.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);

    const confirmed = await ds.query(
      "SELECT COUNT(*) AS c FROM appointments WHERE status = 'CONFIRMED'",
    );
    expect(Number(confirmed[0].c)).toBe(1);
  });
});
