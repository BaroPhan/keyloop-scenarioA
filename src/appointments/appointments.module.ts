import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AvailabilityService } from './availability.service';
import { Appointment } from '../entities/appointment.entity';
import { Customer } from '../entities/customer.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Dealership } from '../entities/dealership.entity';
import { ServiceType } from '../entities/service-type.entity';
import { ServiceBay } from '../entities/service-bay.entity';
import { Technician } from '../entities/technician.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      Customer,
      Vehicle,
      Dealership,
      ServiceType,
      ServiceBay,
      Technician,
    ]),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AvailabilityService],
})
export class AppointmentsModule {}
