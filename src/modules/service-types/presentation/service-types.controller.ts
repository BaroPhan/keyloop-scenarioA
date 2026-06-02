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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/presentation/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../../shared/presentation/guards/auth-kind.guard';
import { PrivilegesGuard } from '../../../shared/presentation/guards/privileges.guard';
import { RequirePrivileges } from '../../../shared/presentation/decorators/require-privileges.decorator';
import { PrivilegeCode } from '../../../domain/rbac/privilege-codes';
import { ServiceTypesService } from '../application/service-types.service';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';
import { UpdateServiceTypeDto } from './dto/update-service-type.dto';
import { PaginationQueryDto } from '../../../shared/presentation/dto/pagination-query.dto';

@ApiTags('Service types')
@Controller('service-types')
export class ServiceTypesController {
  constructor(private readonly serviceTypes: ServiceTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List service types (paginated, public)' })
  list(@Query() query: PaginationQueryDto) {
    return this.serviceTypes.listPaginated(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one service type (public)' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.serviceTypes.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_SERVICE_TYPES)
  @ApiOperation({ summary: 'Create a service type' })
  create(@Body() dto: CreateServiceTypeDto) {
    return this.serviceTypes.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_SERVICE_TYPES)
  @ApiOperation({ summary: 'Update a service type' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceTypeDto,
  ) {
    return this.serviceTypes.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_SERVICE_TYPES)
  @ApiOperation({ summary: 'Delete a service type (409 if has appointments)' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.serviceTypes.delete(id);
  }
}
