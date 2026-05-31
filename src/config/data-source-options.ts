import { DataSourceOptions } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Dealership } from '../entities/dealership.entity';
import { ServiceType } from '../entities/service-type.entity';
import { Skill } from '../entities/skill.entity';
import { ServiceBay } from '../entities/service-bay.entity';
import { Technician } from '../entities/technician.entity';
import { Appointment } from '../entities/appointment.entity';

export const entities = [
  Customer,
  Vehicle,
  Dealership,
  ServiceType,
  Skill,
  ServiceBay,
  Technician,
  Appointment,
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
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
    logging: (process.env.DB_LOGGING ?? 'false') === 'true',
  };
}
