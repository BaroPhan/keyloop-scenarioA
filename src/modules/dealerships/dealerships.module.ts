import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../../infrastructure/rbac/rbac.module';
import { Dealership } from '../../domain/entities/dealership.entity';
import { Appointment } from '../../domain/entities/appointment.entity';
import { DealershipsController } from './presentation/dealerships.controller';
import { DealershipsService } from './application/dealerships.service';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    TypeOrmModule.forFeature([Dealership, Appointment]),
  ],
  controllers: [DealershipsController],
  providers: [DealershipsService],
  exports: [DealershipsService],
})
export class DealershipsModule {}
