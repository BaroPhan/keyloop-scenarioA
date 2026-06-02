import { AppDataSource } from './data-source';
import { Customer } from '../../domain/entities/customer.entity';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { Dealership } from '../../domain/entities/dealership.entity';
import { Skill } from '../../domain/entities/skill.entity';
import { ServiceType } from '../../domain/entities/service-type.entity';
import { ServiceBay } from '../../domain/entities/service-bay.entity';
import { Technician } from '../../domain/entities/technician.entity';
import { Capability } from '../../domain/entities/capability.entity';
import { Admin } from '../../domain/entities/admin.entity';
import { AdminGroup } from '../../domain/entities/admin-group.entity';
import { Privilege } from '../../domain/entities/privilege.entity';
import { ALL_PRIVILEGE_CODES } from '../../domain/rbac/privilege-codes';
import * as argon2 from 'argon2';

async function seed() {
  await AppDataSource.initialize();
  console.log('Seeding database...');

  await AppDataSource.transaction(async (manager) => {
    await manager.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of [
      'appointments',
      'availability_watches',
      'admin_group_privileges',
      'admins',
      'admin_groups',
      'privileges',
      'technician_skills',
      'service_type_required_skills',
      'service_type_required_capabilities',
      'service_bay_capabilities',
      'service_bays',
      'technicians',
      'service_types',
      'skills',
      'capabilities',
      'vehicles',
      'customers',
      'dealerships',
    ]) {
      await manager.query(`TRUNCATE TABLE \`${table}\``);
    }
    await manager.query('SET FOREIGN_KEY_CHECKS = 1');

    const [lift, evCharger, alignmentRig] = await manager.save(Capability, [
      { code: 'LIFT', name: 'Vehicle Lift', description: 'Hydraulic lift.' },
      { code: 'EV_CHARGER', name: 'EV Charger', description: 'EV charging rig.' },
      {
        code: 'ALIGNMENT_RIG',
        name: 'Alignment Rig',
        description: 'Wheel alignment rig.',
      },
    ]);

    const [oilChange, brakes, evCert, diagnostics] = await manager.save(
      Skill,
      [
        { name: 'OIL_CHANGE' },
        { name: 'BRAKES' },
        { name: 'EV_CERTIFIED' },
        { name: 'DIAGNOSTICS' },
      ],
    );

    const oilService = await manager.save(ServiceType, {
      name: 'Standard Oil Change',
      durationMinutes: 60,
      requiredCapabilities: [lift],
      requiredSkills: [oilChange],
    });
    const brakeService = await manager.save(ServiceType, {
      name: 'Brake Replacement',
      durationMinutes: 120,
      requiredCapabilities: [lift],
      requiredSkills: [brakes],
    });
    const evService = await manager.save(ServiceType, {
      name: 'EV Battery Diagnostic',
      durationMinutes: 90,
      requiredCapabilities: [lift, evCharger],
      requiredSkills: [evCert, diagnostics],
    });

    const dealership = await manager.save(Dealership, {
      name: 'Keyloop Motors - Downtown',
      address: '1 Main Street',
    });

    await manager.save(ServiceBay, [
      { name: 'Bay 1', capabilities: [lift], dealershipId: dealership.id },
      {
        name: 'Bay 2 (EV)',
        capabilities: [lift, evCharger],
        dealershipId: dealership.id,
      },
    ]);
    void alignmentRig;

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

    const customer = await manager.save(Customer, {
      name: 'Jane Doe',
      email: 'jane@example.com',
      passwordHash: await argon2.hash('password123'),
      phone: '555-0100',
    });
    await manager.save(Vehicle, {
      vin: '1HGCM82633A004352',
      make: 'Honda',
      model: 'Accord',
      year: 2021,
      customerId: customer.id,
    });

    const privileges = await manager.save(
      Privilege,
      ALL_PRIVILEGE_CODES.map((code) => ({ code, description: code })),
    );
    const superGroup = await manager.save(AdminGroup, {
      name: 'SUPER_ADMIN',
      privileges,
    });
    await manager.save(Admin, {
      email: 'admin@example.com',
      passwordHash: await argon2.hash('admin12345'),
      displayName: 'Root Admin',
      adminGroupId: superGroup.id,
    });

    console.log('Seed complete.');
    console.log(`Dealership id: ${dealership.id}`);
    console.log(
      `Service type ids -> oil: ${oilService.id}, brake: ${brakeService.id}, ev: ${evService.id}`,
    );
    console.log(`Customer id: ${customer.id}`);
    console.log('Customer login: jane@example.com / password123');
    console.log('Admin login: admin@example.com / admin12345 (POST /auth/admin/login)');
  });

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
