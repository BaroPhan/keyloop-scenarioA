import { AppDataSource } from './data-source';
import { Customer } from '../entities/customer.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Dealership } from '../entities/dealership.entity';
import { Skill } from '../entities/skill.entity';
import { ServiceType } from '../entities/service-type.entity';
import { ServiceBay } from '../entities/service-bay.entity';
import { Technician } from '../entities/technician.entity';

/**
 * Populates the database with a small but realistic dataset so the API can be
 * exercised immediately after `docker compose up`.
 */
async function seed() {
  await AppDataSource.initialize();
  console.log('Seeding database...');

  await AppDataSource.transaction(async (manager) => {
    // Clean slate (children first to satisfy FKs).
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

    // Skills
    const [oilChange, brakes, evCert, diagnostics] = await manager.save(
      Skill,
      [
        { name: 'OIL_CHANGE' },
        { name: 'BRAKES' },
        { name: 'EV_CERTIFIED' },
        { name: 'DIAGNOSTICS' },
      ],
    );

    // Service types (duration + required bay capabilities + required skills)
    const oilService = await manager.save(ServiceType, {
      name: 'Standard Oil Change',
      durationMinutes: 60,
      requiredCapabilities: ['LIFT'],
      requiredSkills: [oilChange],
    });
    const brakeService = await manager.save(ServiceType, {
      name: 'Brake Replacement',
      durationMinutes: 120,
      requiredCapabilities: ['LIFT'],
      requiredSkills: [brakes],
    });
    const evService = await manager.save(ServiceType, {
      name: 'EV Battery Diagnostic',
      durationMinutes: 90,
      requiredCapabilities: ['LIFT', 'EV_CHARGER'],
      requiredSkills: [evCert, diagnostics],
    });

    // Dealership
    const dealership = await manager.save(Dealership, {
      name: 'Keyloop Motors - Downtown',
      address: '1 Main Street',
    });

    // Service bays
    await manager.save(ServiceBay, [
      { name: 'Bay 1', capabilities: ['LIFT'], dealershipId: dealership.id },
      {
        name: 'Bay 2 (EV)',
        capabilities: ['LIFT', 'EV_CHARGER'],
        dealershipId: dealership.id,
      },
    ]);

    // Technicians (default 08:00-17:00 UTC shift)
    await manager.save(Technician, [
      {
        name: 'Alice (generalist)',
        dealershipId: dealership.id,
        skills: [oilChange, brakes],
      },
      {
        name: 'Bob (EV specialist)',
        dealershipId: dealership.id,
        skills: [oilChange, evCert, diagnostics],
      },
    ]);

    // Customers + vehicles
    const customer = await manager.save(Customer, {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-0100',
    });
    await manager.save(Vehicle, {
      vin: '1HGCM82633A004352',
      make: 'Honda',
      model: 'Accord',
      year: 2021,
      customerId: customer.id,
    });

    console.log('Seed complete.');
    console.log(`Dealership id: ${dealership.id}`);
    console.log(
      `Service type ids -> oil: ${oilService.id}, brake: ${brakeService.id}, ev: ${evService.id}`,
    );
    console.log(`Customer id: ${customer.id}`);
  });

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
