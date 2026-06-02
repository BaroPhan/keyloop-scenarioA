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
import { DealershipsService } from '../application/dealerships.service';
import { CreateDealershipDto } from './dto/create-dealership.dto';
import { UpdateDealershipDto } from './dto/update-dealership.dto';
import { PaginationQueryDto } from '../../../shared/presentation/dto/pagination-query.dto';

@ApiTags('Dealerships')
@Controller('dealerships')
export class DealershipsController {
  constructor(private readonly dealerships: DealershipsService) {}

  @Get()
  @ApiOperation({ summary: 'List dealerships (paginated, public)' })
  list(@Query() query: PaginationQueryDto) {
    return this.dealerships.listPaginated(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one dealership (public)' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.dealerships.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_DEALERSHIPS)
  @ApiOperation({ summary: 'Create a dealership' })
  create(@Body() dto: CreateDealershipDto) {
    return this.dealerships.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_DEALERSHIPS)
  @ApiOperation({ summary: 'Update a dealership' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDealershipDto,
  ) {
    return this.dealerships.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard, PrivilegesGuard)
  @ApiBearerAuth('JWT')
  @RequirePrivileges(PrivilegeCode.MANAGE_DEALERSHIPS)
  @ApiOperation({ summary: 'Delete a dealership (409 if has appointments)' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.dealerships.delete(id);
  }
}
