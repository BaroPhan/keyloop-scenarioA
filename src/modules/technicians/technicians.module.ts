import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../../infrastructure/rbac/rbac.module';
import { SkillsModule } from '../skills/skills.module';
import { DealershipsModule } from '../dealerships/dealerships.module';
import { Technician } from '../../domain/entities/technician.entity';
import { Appointment } from '../../domain/entities/appointment.entity';
import { TechniciansController } from './presentation/technicians.controller';
import { TechniciansService } from './application/technicians.service';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    SkillsModule,
    DealershipsModule,
    TypeOrmModule.forFeature([Technician, Appointment]),
  ],
  controllers: [TechniciansController],
  providers: [TechniciansService],
})
export class TechniciansModule {}
