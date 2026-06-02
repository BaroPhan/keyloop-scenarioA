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
import { CapabilitiesService } from '../application/capabilities.service';
import { CreateCapabilityDto } from './dto/create-capability.dto';
import { UpdateCapabilityDto } from './dto/update-capability.dto';
import { PaginationQueryDto } from '../../../shared/presentation/dto/pagination-query.dto';

@ApiTags('Capabilities')
@Controller('capabilities')
export class CapabilitiesController {
  constructor(private readonly capabilities: CapabilitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List capabilities (paginated, public)' })
  list(@Query() query: PaginationQueryDto) {
    return this.capabilities.listPaginated(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one capability (public)' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.capabilities.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_CAPABILITIES)
  @ApiOperation({ summary: 'Create a capability' })
  create(@Body() dto: CreateCapabilityDto) {
    return this.capabilities.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_CAPABILITIES)
  @ApiOperation({ summary: 'Update a capability' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCapabilityDto,
  ) {
    return this.capabilities.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_CAPABILITIES)
  @ApiOperation({ summary: 'Delete a capability' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.capabilities.delete(id);
  }
}
