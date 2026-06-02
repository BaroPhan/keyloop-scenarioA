import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../../infrastructure/rbac/rbac.module';
import { CapabilitiesModule } from '../capabilities/capabilities.module';
import { SkillsModule } from '../skills/skills.module';
import { ServiceType } from '../../domain/entities/service-type.entity';
import { Appointment } from '../../domain/entities/appointment.entity';
import { ServiceTypesController } from './presentation/service-types.controller';
import { ServiceTypesService } from './application/service-types.service';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    CapabilitiesModule,
    SkillsModule,
    TypeOrmModule.forFeature([ServiceType, Appointment]),
  ],
  controllers: [ServiceTypesController],
  providers: [ServiceTypesService],
})
export class ServiceTypesModule {}
