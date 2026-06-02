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
import { ServiceBaysService } from '../application/service-bays.service';
import { CreateServiceBayDto } from './dto/create-service-bay.dto';
import { UpdateServiceBayDto } from './dto/update-service-bay.dto';
import { PaginationQueryDto } from '../../../shared/presentation/dto/pagination-query.dto';

@ApiTags('Service bays')
@Controller()
export class ServiceBaysController {
  constructor(private readonly bays: ServiceBaysService) {}

  @Get('service-bays')
  @ApiOperation({ summary: 'List service bays (paginated, public)' })
  @ApiQuery({ name: 'dealershipId', required: false, type: Number })
  list(
    @Query() query: PaginationQueryDto,
    @Query('dealershipId') dealershipId?: string,
  ) {
    return this.bays.listPaginated(
      query,
      dealershipId ? parseInt(dealershipId, 10) : undefined,
    );
  }

  @Get('dealerships/:dealershipId/service-bays')
  @ApiOperation({ summary: 'List service bays at a dealership (paginated, public)' })
  @ApiParam({ name: 'dealershipId', type: Number })
  listByDealership(
    @Param('dealershipId', ParseIntPipe) dealershipId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.bays.listPaginated(query, dealershipId);
  }

  @Get('service-bays/:id')
  @ApiOperation({ summary: 'Get one service bay (public)' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.bays.get(id);
  }

  @Post('dealerships/:id/service-bays')
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_BAYS)
  @ApiOperation({ summary: 'Add a service bay to a dealership' })
  @ApiParam({ name: 'id', description: 'Dealership id' })
  create(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateServiceBayDto,
  ) {
    return this.bays.create(id, dto);
  }

  @Patch('service-bays/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_BAYS)
  @ApiOperation({ summary: 'Update a service bay' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceBayDto,
  ) {
    return this.bays.update(id, dto);
  }

  @Delete('service-bays/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_BAYS)
  @ApiOperation({ summary: 'Delete a service bay (409 if has appointments)' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.bays.delete(id);
  }
}
