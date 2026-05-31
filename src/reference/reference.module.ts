import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceController } from './reference.controller';
import { Customer } from '../entities/customer.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Dealership } from '../entities/dealership.entity';
import { ServiceType } from '../entities/service-type.entity';
import { ServiceBay } from '../entities/service-bay.entity';
import { Technician } from '../entities/technician.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Vehicle,
      Dealership,
      ServiceType,
      ServiceBay,
      Technician,
    ]),
  ],
  controllers: [ReferenceController],
})
export class ReferenceModule {}
