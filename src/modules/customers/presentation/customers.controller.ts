import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CustomersService } from '../application/customers.service';
import { PaginationQueryDto } from '../../../shared/presentation/dto/pagination-query.dto';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers with vehicles (paginated)' })
  list(@Query() query: PaginationQueryDto) {
    return this.customers.listPaginated(query);
  }

  @Get(':id/vehicles')
  @ApiOperation({ summary: 'List vehicles for a customer (paginated)' })
  @ApiParam({ name: 'id', type: Number })
  vehicles(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.customers.listVehiclesPaginated(id, query);
  }
}
