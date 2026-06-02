import { DataSourceOptions } from 'typeorm';
import { Customer } from '../domain/entities/customer.entity';
import { Vehicle } from '../domain/entities/vehicle.entity';
import { Dealership } from '../domain/entities/dealership.entity';
import { ServiceType } from '../domain/entities/service-type.entity';
import { Skill } from '../domain/entities/skill.entity';
import { ServiceBay } from '../domain/entities/service-bay.entity';
import { Technician } from '../domain/entities/technician.entity';
import { Appointment } from '../domain/entities/appointment.entity';
import { Capability } from '../domain/entities/capability.entity';
import { Admin } from '../domain/entities/admin.entity';
import { AdminGroup } from '../domain/entities/admin-group.entity';
import { Privilege } from '../domain/entities/privilege.entity';
import { AvailabilityWatch } from '../domain/entities/availability-watch.entity';

export const entities = [
  Customer,
  Vehicle,
  Dealership,
  ServiceType,
  Skill,
  ServiceBay,
  Technician,
  Appointment,
  Capability,
  Admin,
  AdminGroup,
  Privilege,
  AvailabilityWatch,
];

/**
 * Builds TypeORM connection options from environment variables. Shared by the
 * Nest application (TypeOrmModule) and the standalone seed script so both stay
 * in sync.
 */
export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME ?? 'scheduler',
    password: process.env.DB_PASSWORD ?? 'schedulerpass',
    database: process.env.DB_DATABASE ?? 'scheduler',
    entities,
    migrations: [__dirname + '/../migrations/*.{ts,js}'],
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
    migrationsRun: (process.env.DB_MIGRATIONS_RUN ?? 'false') === 'true',
    logging: (process.env.DB_LOGGING ?? 'false') === 'true',
  };
}
