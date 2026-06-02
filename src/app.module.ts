import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './config/data-source-options';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AppCacheModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { NotificationsModule } from './infrastructure/notifications/notifications.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CapabilitiesModule } from './modules/capabilities/capabilities.module';
import { SkillsModule } from './modules/skills/skills.module';
import { DealershipsModule } from './modules/dealerships/dealerships.module';
import { ServiceBaysModule } from './modules/service-bays/service-bays.module';
import { TechniciansModule } from './modules/technicians/technicians.module';
import { ServiceTypesModule } from './modules/service-types/service-types.module';
import { AdminPrivilegesModule } from './modules/admin-privileges/admin-privileges.module';
import { AdminGroupsModule } from './modules/admin-groups/admin-groups.module';
import { AdminsModule } from './modules/admins/admins.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: () => buildDataSourceOptions(),
    }),
    RedisModule,
    AppCacheModule,
    QueueModule,
    AuthModule,
    AppointmentsModule,
    CustomersModule,
    CapabilitiesModule,
    SkillsModule,
    DealershipsModule,
    ServiceBaysModule,
    TechniciansModule,
    ServiceTypesModule,
    AdminPrivilegesModule,
    AdminGroupsModule,
    AdminsModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
