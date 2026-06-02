import { forwardRef, Module } from '@nestjs/common';
import { AdminPrivilegesModule } from '../../modules/admin-privileges/admin-privileges.module';
import { PrivilegesGuard } from '../../shared/presentation/guards/privileges.guard';

/** Wires RBAC guards to privilege resolution (Nest composition; not a domain module). */
@Module({
  imports: [forwardRef(() => AdminPrivilegesModule)],
  providers: [PrivilegesGuard],
  exports: [PrivilegesGuard, AdminPrivilegesModule],
})
export class RbacModule {}
