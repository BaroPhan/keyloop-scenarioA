import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../../infrastructure/rbac/rbac.module';
import { AdminGroupsModule } from '../admin-groups/admin-groups.module';
import { Admin } from '../../domain/entities/admin.entity';
import { AdminsController } from './presentation/admins.controller';
import { AdminsService } from './application/admins.service';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    AdminGroupsModule,
    TypeOrmModule.forFeature([Admin]),
  ],
  controllers: [AdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}
