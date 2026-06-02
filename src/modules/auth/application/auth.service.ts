import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { Customer } from '../../../domain/entities/customer.entity';
import { Admin } from '../../../domain/entities/admin.entity';
import { RegisterDto } from '../presentation/dto/register.dto';
import { LoginDto } from '../presentation/dto/login.dto';
import { AuthKind, JwtPayload } from '../../../domain/auth/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const passwordHash = await argon2.hash(dto.password);
    const email = dto.email.toLowerCase();

    const customer = await this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(Customer, { where: { email } });
      if (existing) {
        throw new ConflictException('Email is already registered.');
      }

      return manager.save(Customer, {
        name: dto.name,
        email,
        passwordHash,
        phone: dto.phone ?? null,
      });
    });

    return { accessToken: await this.signCustomer(customer) };
  }

  async loginCustomer(dto: LoginDto): Promise<{ accessToken: string }> {
    const email = dto.email.toLowerCase();
    const customer = await this.dataSource.manager.findOne(Customer, {
      where: { email },
    });
    if (
      !customer ||
      !(await argon2.verify(customer.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    return { accessToken: await this.signCustomer(customer) };
  }

  async loginAdmin(dto: LoginDto): Promise<{ accessToken: string }> {
    const email = dto.email.toLowerCase();
    const admin = await this.dataSource.manager.findOne(Admin, {
      where: { email },
    });
    if (!admin || !(await argon2.verify(admin.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    return { accessToken: await this.signAdmin(admin) };
  }

  private signCustomer(customer: Customer): Promise<string> {
    const payload: JwtPayload = {
      sub: customer.id,
      email: customer.email,
      kind: AuthKind.CUSTOMER,
    };
    return this.jwt.signAsync(payload);
  }

  private signAdmin(admin: Admin): Promise<string> {
    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      kind: AuthKind.ADMIN,
    };
    return this.jwt.signAsync(payload);
  }
}
