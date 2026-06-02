import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../domain/entities/customer.entity';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { CustomersController } from './presentation/customers.controller';
import { CustomersService } from './application/customers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Vehicle])],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
