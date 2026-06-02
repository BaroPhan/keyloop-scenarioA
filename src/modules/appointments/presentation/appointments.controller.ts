import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppointmentsService } from '../application/appointments.service';
import { AvailabilityWatchService } from '../application/availability-watch.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { SlotsQueryDto } from './dto/slots-query.dto';
import { CreateWatchDto } from './dto/create-watch.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { JwtAuthGuard } from '../../../shared/presentation/guards/jwt-auth.guard';
import { CustomerAuthGuard } from '../../../shared/presentation/guards/auth-kind.guard';
import { CurrentUser } from '../../../shared/presentation/decorators/current-user.decorator';
import {
  AuthenticatedPrincipal,
  AuthKind,
} from '../../../domain/auth/jwt-payload.interface';
import { AdminPrivilegesService } from '../../admin-privileges/application/admin-privileges.service';
import { PrivilegeCode } from '../../../domain/rbac/privilege-codes';

@Controller()
export class AppointmentsController {
  constructor(
    private readonly appointments: AppointmentsService,
    private readonly watches: AvailabilityWatchService,
    private readonly adminPrivileges: AdminPrivilegesService,
  ) { }

  @Post('appointments')
  @ApiTags('Appointments')
  @ApiOperation({ summary: 'Book an appointment (assigns technician + bay)' })
  @ApiResponse({ status: 201, description: 'Appointment confirmed' })
  @ApiResponse({ status: 409, description: 'No availability' })
  book(@Body() dto: CreateAppointmentDto) {
    return this.appointments.book(dto);
  }

  @Get('me/appointments')
  @ApiTags('Appointments')
  @UseGuards(JwtAuthGuard, CustomerAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Order history for the authenticated customer' })
  myAppointments(@CurrentUser() principal: AuthenticatedPrincipal) {
    return this.appointments.findForCustomer(principal.id);
  }

  @Get('availability')
  @ApiTags('Availability')
  @ApiOperation({ summary: 'Probe availability for one start time (cached)' })
  checkAvailability(@Query() dto: QueryAvailabilityDto) {
    return this.appointments.checkAvailability(dto);
  }

  @Get('availability/slots')
  @ApiTags('Availability')
  @ApiOperation({ summary: 'Enumerate open slots for a UTC day (cached)' })
  findSlots(@Query() dto: SlotsQueryDto) {
    return this.appointments.findSlots(dto);
  }

  @Post('availability/watches')
  @ApiTags('Availability')
  @UseGuards(JwtAuthGuard, CustomerAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Watch for an open slot in a time window' })
  createWatch(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateWatchDto,
  ) {
    return this.watches.create(principal.id, dto);
  }

  @Get('availability/watches')
  @ApiTags('Availability')
  @UseGuards(JwtAuthGuard, CustomerAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List your active availability watches' })
  myWatches(@CurrentUser() principal: AuthenticatedPrincipal) {
    return this.watches.findForCustomer(principal.id);
  }

  @Post('availability/watches/:id/cancel')
  @ApiTags('Availability')
  @UseGuards(JwtAuthGuard, CustomerAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cancel your own availability watch' })
  @ApiParam({ name: 'id', type: Number })
  cancelWatch(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.watches.cancel(principal.id, id);
  }

  @Get('appointments')
  @ApiTags('Appointments')
  @UseGuards(JwtAuthGuard, CustomerAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary:
      'List appointments. Customers see their own. Admins with VIEW_APPOINTMENTS see all (newest first).',
  })
  async findAll(
    @Query() _filter: ListAppointmentsDto,
    @CurrentUser() principal: AuthenticatedPrincipal,
  ) {
    if (principal.kind === AuthKind.ADMIN) {
      const granted = await this.adminPrivileges.effectivePrivileges(
        principal.id,
      );
      if (!granted.has(PrivilegeCode.VIEW_APPOINTMENTS)) {
        throw new ForbiddenException(
          `Missing required privilege(s): ${PrivilegeCode.VIEW_APPOINTMENTS}.`,
        );
      }
      return this.appointments.listAll();
    }
    return this.appointments.findForCustomer(principal.id);
  }

  @Get('appointments/:id')
  @ApiTags('Appointments')
  @UseGuards(JwtAuthGuard, CustomerAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary:
      'Get one appointment. Customers: own only. Admins: any appointment.',
  })
  @ApiParam({ name: 'id', type: Number })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() principal: AuthenticatedPrincipal,
  ) {
    if (principal.kind === AuthKind.ADMIN) {
      return this.appointments.findOne(id);
    }
    return this.appointments.findOneForCustomer(id, principal.id);
  }

  @Post('appointments/:id/cancel')
  @ApiTags('Appointments')
  @UseGuards(JwtAuthGuard, CustomerAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary:
      'Cancel an appointment (frees resources). Customers: own only. Admins: any.',
  })
  @ApiParam({ name: 'id', type: Number })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() principal: AuthenticatedPrincipal,
  ) {
    if (principal.kind === AuthKind.ADMIN) {
      return this.appointments.cancel(id);
    }
    return this.appointments.cancelForCustomer(id, principal.id);
  }

  @Post('appointments/:id/reschedule')
  @ApiTags('Appointments')
  @UseGuards(JwtAuthGuard, CustomerAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary:
      'Reschedule atomically. Customers: own only. Admins: any appointment.',
  })
  @ApiParam({ name: 'id', type: Number })
  reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() principal: AuthenticatedPrincipal,
  ) {
    const newStart = new Date(dto.startTime);
    if (principal.kind === AuthKind.ADMIN) {
      return this.appointments.reschedule(id, newStart);
    }
    return this.appointments.rescheduleForCustomer(id, principal.id, newStart);
  }
}
