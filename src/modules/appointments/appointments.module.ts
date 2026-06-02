import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../../infrastructure/rbac/rbac.module';
import { AdminPrivilegesModule } from '../admin-privileges/admin-privileges.module';
import { AppointmentsController } from './presentation/appointments.controller';
import { AppointmentsService } from './application/appointments.service';
import { AvailabilityService } from './application/availability.service';
import { AvailabilityWatchService } from './application/availability-watch.service';
import { Appointment } from '../../domain/entities/appointment.entity';
import { Customer } from '../../domain/entities/customer.entity';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { Dealership } from '../../domain/entities/dealership.entity';
import { ServiceType } from '../../domain/entities/service-type.entity';
import { ServiceBay } from '../../domain/entities/service-bay.entity';
import { Technician } from '../../domain/entities/technician.entity';
import { AvailabilityWatch } from '../../domain/entities/availability-watch.entity';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    AdminPrivilegesModule,
    TypeOrmModule.forFeature([
      Appointment,
      Customer,
      Vehicle,
      Dealership,
      ServiceType,
      ServiceBay,
      Technician,
      AvailabilityWatch,
    ]),
  ],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    AvailabilityService,
    AvailabilityWatchService,
  ],
  exports: [
    AppointmentsService,
    AvailabilityService,
    AvailabilityWatchService,
  ],
})
export class AppointmentsModule {}
