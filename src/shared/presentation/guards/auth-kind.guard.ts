import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthKind, AuthenticatedPrincipal } from '../../../domain/auth/jwt-payload.interface';

/** Requires a valid JWT whose subject is a customer. Admins are allowed through (bypass). */
@Injectable()
export class CustomerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const principal = context
      .switchToHttp()
      .getRequest().user as AuthenticatedPrincipal | undefined;
    if (!principal) {
      throw new ForbiddenException('Authentication required.');
    }
    if (principal.kind === AuthKind.ADMIN) {
      return true;
    }
    if (principal.kind !== AuthKind.CUSTOMER) {
      throw new ForbiddenException('Customer authentication required.');
    }
    return true;
  }
}

/** Requires a valid JWT whose subject is an admin. */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const principal = context
      .switchToHttp()
      .getRequest().user as AuthenticatedPrincipal | undefined;
    if (!principal) {
      throw new ForbiddenException('Authentication required.');
    }
    if (principal.kind !== AuthKind.ADMIN) {
      throw new ForbiddenException('Admin authentication required.');
    }
    return true;
  }
}
