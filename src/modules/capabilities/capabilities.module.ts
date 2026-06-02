import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../../infrastructure/rbac/rbac.module';
import { Capability } from '../../domain/entities/capability.entity';
import { CapabilitiesController } from './presentation/capabilities.controller';
import { CapabilitiesService } from './application/capabilities.service';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    TypeOrmModule.forFeature([Capability]),
  ],
  controllers: [CapabilitiesController],
  providers: [CapabilitiesService],
  exports: [CapabilitiesService],
})
export class CapabilitiesModule {}
