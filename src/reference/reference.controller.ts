import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Dealership } from '../entities/dealership.entity';
import { ServiceType } from '../entities/service-type.entity';
import { ServiceBay } from '../entities/service-bay.entity';
import { Technician } from '../entities/technician.entity';

/**
 * Read-only endpoints exposing the reference/master data so a client can
 * discover valid ids to book against. Not part of the core scheduling logic.
 */
@Controller()
export class ReferenceController {
  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Vehicle)
    private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Dealership)
    private readonly dealerships: Repository<Dealership>,
    @InjectRepository(ServiceType)
    private readonly serviceTypes: Repository<ServiceType>,
    @InjectRepository(ServiceBay)
    private readonly serviceBays: Repository<ServiceBay>,
    @InjectRepository(Technician)
    private readonly technicians: Repository<Technician>,
  ) {}

  @Get('dealerships')
  findDealerships() {
    return this.dealerships.find();
  }

  @Get('dealerships/:id/service-bays')
  findBaysByDealership(@Param('id', ParseIntPipe) id: number) {
    return this.serviceBays.find({ where: { dealershipId: id } });
  }

  @Get('dealerships/:id/technicians')
  findTechniciansByDealership(@Param('id', ParseIntPipe) id: number) {
    return this.technicians.find({ where: { dealershipId: id } });
  }

  @Get('service-types')
  findServiceTypes() {
    return this.serviceTypes.find();
  }

  @Get('customers')
  findCustomers() {
    return this.customers.find({ relations: { vehicles: true } });
  }

  @Get('customers/:id/vehicles')
  findVehiclesByCustomer(@Param('id', ParseIntPipe) id: number) {
    return this.vehicles.find({ where: { customerId: id } });
  }
}
