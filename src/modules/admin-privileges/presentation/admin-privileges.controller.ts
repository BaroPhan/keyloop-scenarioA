import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/presentation/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../../shared/presentation/guards/auth-kind.guard';
import { PrivilegesGuard } from '../../../shared/presentation/guards/privileges.guard';
import { RequirePrivileges } from '../../../shared/presentation/decorators/require-privileges.decorator';
import { PrivilegeCode } from '../../../domain/rbac/privilege-codes';
import { AdminPrivilegesService } from '../application/admin-privileges.service';
import { CreatePrivilegeDto } from './dto/create-privilege.dto';
import { PaginationQueryDto } from '../../../shared/presentation/dto/pagination-query.dto';

/**
 * Privileges are immutable identifiers used in code (`PrivilegeCode`, `@RequirePrivileges`)
 * and stored as stable `code` values in the database. There is no PATCH endpoint because
 * changing a code would desync running guards/decorators from the DB, and renaming via
 * update would break group assignments without a deliberate remove-and-recreate flow.
 * Adjust display text at creation time; to change a code, delete (if unassigned) and create anew.
 */
@ApiTags('Privileges')
@Controller('privileges')
@UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
@ApiBearerAuth('JWT')
export class AdminPrivilegesController {
  constructor(private readonly privileges: AdminPrivilegesService) {}

  @Get()
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'List privileges (paginated)' })
  list(@Query() query: PaginationQueryDto) {
    return this.privileges.listPaginated(query);
  }

  @Post()
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'Create a privilege' })
  create(@Body() dto: CreatePrivilegeDto) {
    return this.privileges.create(dto);
  }

  @Delete(':id')
  @RequirePrivileges(PrivilegeCode.MANAGE_ADMINS)
  @ApiOperation({ summary: 'Delete a privilege (409 if assigned to a group)' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.privileges.delete(id);
  }
}
