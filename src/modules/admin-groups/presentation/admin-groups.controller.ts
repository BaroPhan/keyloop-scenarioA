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
import { AdminGroupsService } from '../application/admin-groups.service';
import { CreateAdminGroupDto } from './dto/create-admin-group.dto';
import { UpdateAdminGroupDto } from './dto/update-admin-group.dto';

@ApiTags('Admin groups')
@Controller('admin-groups')
@UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
@ApiBearerAuth('JWT')
export class AdminGroupsController {
  constructor(private readonly groups: AdminGroupsService) {}

  @Get()
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'List admin groups' })
  list() {
    return this.groups.list();
  }

  @Get(':id')
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'Get one admin group' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.groups.get(id);
  }

  @Post()
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'Create an admin group with privileges' })
  create(@Body() dto: CreateAdminGroupDto) {
    return this.groups.create(dto);
  }

  @Patch(':id')
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'Update an admin group' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminGroupDto,
  ) {
    return this.groups.update(id, dto);
  }

  @Delete(':id')
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'Delete an admin group (409 if has members)' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.groups.delete(id);
  }
}
