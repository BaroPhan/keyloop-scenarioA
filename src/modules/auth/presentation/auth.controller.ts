import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '../application/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../../shared/presentation/guards/jwt-auth.guard';
import { CurrentUser } from '../../../shared/presentation/decorators/current-user.decorator';
import { AuthenticatedPrincipal } from '../../../domain/auth/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({ status: 201, description: 'Returns JWT accessToken' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Customer login' })
  @ApiResponse({ status: 201, description: 'Returns JWT accessToken (kind=CUSTOMER)' })
  loginCustomer(@Body() dto: LoginDto) {
    return this.auth.loginCustomer(dto);
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 201, description: 'Returns JWT accessToken (kind=ADMIN)' })
  loginAdmin(@Body() dto: LoginDto) {
    return this.auth.loginAdmin(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Current authenticated principal' })
  me(@CurrentUser() principal: AuthenticatedPrincipal) {
    return principal;
  }
}
