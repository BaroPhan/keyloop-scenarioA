import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../../infrastructure/rbac/rbac.module';
import { AdminGroup } from '../../domain/entities/admin-group.entity';
import { Admin } from '../../domain/entities/admin.entity';
import { Privilege } from '../../domain/entities/privilege.entity';
import { AdminGroupsController } from './presentation/admin-groups.controller';
import { AdminGroupsService } from './application/admin-groups.service';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    TypeOrmModule.forFeature([AdminGroup, Admin, Privilege]),
  ],
  controllers: [AdminGroupsController],
  providers: [AdminGroupsService],
  exports: [AdminGroupsService],
})
export class AdminGroupsModule {}
