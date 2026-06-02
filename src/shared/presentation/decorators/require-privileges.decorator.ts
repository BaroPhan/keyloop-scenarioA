import { SetMetadata } from '@nestjs/common';
import { PrivilegeCode } from '../../../domain/rbac/privilege-codes';

export const REQUIRE_PRIVILEGES_KEY = 'require_privileges';

/**
 * Marks a route as requiring ALL of the given privileges. Enforced by
 * PrivilegesGuard (which must run behind JwtAuthGuard).
 */
export const RequirePrivileges = (...privileges: PrivilegeCode[]) =>
  SetMetadata(REQUIRE_PRIVILEGES_KEY, privileges);
