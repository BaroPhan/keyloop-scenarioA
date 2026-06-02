import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './application/auth.service';
import { AuthController } from './presentation/auth.controller';
import { JwtStrategy } from '../../shared/presentation/strategies/jwt.strategy';
import { CustomerAuthGuard, AdminAuthGuard } from '../../shared/presentation/guards/auth-kind.guard';
import { Customer } from '../../domain/entities/customer.entity';
import { Admin } from '../../domain/entities/admin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Admin]),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
        signOptions: {
          expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as `${number}h`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, CustomerAuthGuard, AdminAuthGuard],
  exports: [
    JwtStrategy,
    PassportModule,
    JwtModule,
    CustomerAuthGuard,
    AdminAuthGuard,
  ],
})
export class AuthModule {}
