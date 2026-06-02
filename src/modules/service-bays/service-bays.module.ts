import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../../infrastructure/rbac/rbac.module';
import { CapabilitiesModule } from '../capabilities/capabilities.module';
import { DealershipsModule } from '../dealerships/dealerships.module';
import { ServiceBay } from '../../domain/entities/service-bay.entity';
import { Appointment } from '../../domain/entities/appointment.entity';
import { ServiceBaysController } from './presentation/service-bays.controller';
import { ServiceBaysService } from './application/service-bays.service';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    CapabilitiesModule,
    DealershipsModule,
    TypeOrmModule.forFeature([ServiceBay, Appointment]),
  ],
  controllers: [ServiceBaysController],
  providers: [ServiceBaysService],
})
export class ServiceBaysModule {}
