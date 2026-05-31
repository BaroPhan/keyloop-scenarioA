import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';

@Controller()
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post('appointments')
  book(@Body() dto: CreateAppointmentDto) {
    return this.appointments.book(dto);
  }

  @Get('availability')
  checkAvailability(@Query() dto: QueryAvailabilityDto) {
    return this.appointments.checkAvailability(dto);
  }

  @Get('appointments')
  findAll(@Query() filter: ListAppointmentsDto) {
    return this.appointments.findAll(filter);
  }

  @Get('appointments/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.appointments.findOne(id);
  }

  @Post('appointments/:id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.appointments.cancel(id);
  }
}
