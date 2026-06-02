import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../../domain/entities/customer.entity';
import { Admin } from '../../../domain/entities/admin.entity';
import {
  AuthKind,
  AuthenticatedPrincipal,
  JwtPayload,
} from '../../../domain/auth/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Admin)
    private readonly admins: Repository<Admin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedPrincipal> {
    if (payload.kind === AuthKind.CUSTOMER) {
      const customer = await this.customers.findOne({
        where: { id: payload.sub },
      });
      if (!customer) {
        throw new UnauthorizedException('Account no longer exists.');
      }
      return {
        kind: AuthKind.CUSTOMER,
        id: customer.id,
        email: customer.email,
      };
    }

    if (payload.kind === AuthKind.ADMIN) {
      const admin = await this.admins.findOne({ where: { id: payload.sub } });
      if (!admin) {
        throw new UnauthorizedException('Account no longer exists.');
      }
      return {
        kind: AuthKind.ADMIN,
        id: admin.id,
        email: admin.email,
      };
    }

    throw new UnauthorizedException('Invalid token.');
  }
}
