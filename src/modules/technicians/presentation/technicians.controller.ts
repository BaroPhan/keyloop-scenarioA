import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/presentation/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../../shared/presentation/guards/auth-kind.guard';
import { PrivilegesGuard } from '../../../shared/presentation/guards/privileges.guard';
import { RequirePrivileges } from '../../../shared/presentation/decorators/require-privileges.decorator';
import { PrivilegeCode } from '../../../domain/rbac/privilege-codes';
import { TechniciansService } from '../application/technicians.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { PaginationQueryDto } from '../../../shared/presentation/dto/pagination-query.dto';

@ApiTags('Technicians')
@Controller()
export class TechniciansController {
  constructor(private readonly technicians: TechniciansService) {}

  @Get('technicians')
  @ApiOperation({ summary: 'List technicians (paginated, public)' })
  @ApiQuery({ name: 'dealershipId', required: false, type: Number })
  list(
    @Query() query: PaginationQueryDto,
    @Query('dealershipId') dealershipId?: string,
  ) {
    return this.technicians.listPaginated(
      query,
      dealershipId ? parseInt(dealershipId, 10) : undefined,
    );
  }

  @Get('dealerships/:dealershipId/technicians')
  @ApiOperation({ summary: 'List technicians at a dealership (paginated, public)' })
  @ApiParam({ name: 'dealershipId', type: Number })
  listByDealership(
    @Param('dealershipId', ParseIntPipe) dealershipId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.technicians.listPaginated(query, dealershipId);
  }

  @Get('technicians/:id')
  @ApiOperation({ summary: 'Get one technician (public)' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.technicians.get(id);
  }

  @Post('dealerships/:id/technicians')
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_TECHNICIANS)
  @ApiOperation({ summary: 'Add a technician to a dealership' })
  @ApiParam({ name: 'id', description: 'Dealership id' })
  create(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTechnicianDto,
  ) {
    return this.technicians.create(id, dto);
  }

  @Patch('technicians/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_TECHNICIANS)
  @ApiOperation({ summary: 'Update a technician' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTechnicianDto,
  ) {
    return this.technicians.update(id, dto);
  }

  @Delete('technicians/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_TECHNICIANS)
  @ApiOperation({ summary: 'Delete a technician (409 if has appointments)' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.technicians.delete(id);
  }
}
