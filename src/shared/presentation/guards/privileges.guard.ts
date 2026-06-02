import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PRIVILEGES_KEY } from '../decorators/require-privileges.decorator';
import { PrivilegeCode } from '../../../domain/rbac/privilege-codes';
import { AuthKind, AuthenticatedPrincipal } from '../../../domain/auth/jwt-payload.interface';
import { AdminPrivilegesService } from '../../../modules/admin-privileges/application/admin-privileges.service';

/**
 * Authorizes admin requests against privileges declared by @RequirePrivileges.
 * The admin's group privileges determine which actions are allowed.
 */
@Injectable()
export class PrivilegesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminPrivileges: AdminPrivilegesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PrivilegeCode[]>(
      REQUIRE_PRIVILEGES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const principal = request.user as AuthenticatedPrincipal | undefined;
    if (!principal || principal.kind !== AuthKind.ADMIN) {
      throw new ForbiddenException('Admin authentication required.');
    }

    const granted = await this.adminPrivileges.effectivePrivileges(principal.id);
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing required privilege(s): ${missing.join(', ')}.`,
      );
    }
    return true;
  }
}
