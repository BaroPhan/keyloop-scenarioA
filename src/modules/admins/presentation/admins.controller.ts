import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/presentation/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../../shared/presentation/guards/auth-kind.guard';
import { PrivilegesGuard } from '../../../shared/presentation/guards/privileges.guard';
import { RequirePrivileges } from '../../../shared/presentation/decorators/require-privileges.decorator';
import { PrivilegeCode } from '../../../domain/rbac/privilege-codes';
import { AdminsService } from '../application/admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@ApiTags('Admins')
@Controller('admins')
@UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
@ApiBearerAuth('JWT')
export class AdminsController {
  constructor(private readonly admins: AdminsService) {}

  @Get()
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'List admin accounts' })
  list() {
    return this.admins.list();
  }

  @Get(':id')
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'Get one admin (no password hash)' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.admins.get(id);
  }

  @Post()
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'Create an admin account' })
  create(@Body() dto: CreateAdminDto) {
    return this.admins.create(dto);
  }

  @Patch(':id')
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'Update an admin account' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.admins.update(id, dto);
  }

  @Delete(':id')
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'Delete an admin account' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.admins.delete(id);
  }
}
