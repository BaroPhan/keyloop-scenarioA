import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../../infrastructure/rbac/rbac.module';
import { Admin } from '../../domain/entities/admin.entity';
import { Privilege } from '../../domain/entities/privilege.entity';
import { AdminPrivilegesController } from './presentation/admin-privileges.controller';
import { AdminPrivilegesService } from './application/admin-privileges.service';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => RbacModule),
    TypeOrmModule.forFeature([Admin, Privilege]),
  ],
  controllers: [AdminPrivilegesController],
  providers: [AdminPrivilegesService],
  exports: [AdminPrivilegesService],
})
export class AdminPrivilegesModule {}
