import { Type } from 'class-transformer';
import { IsDate, IsInt, IsPositive } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  @IsPositive()
  customerId: number;

  @IsInt()
  @IsPositive()
  vehicleId: number;

  @IsInt()
  @IsPositive()
  dealershipId: number;

  @IsInt()
  @IsPositive()
  serviceTypeId: number;

  /** Desired appointment start time (ISO 8601). End is derived from duration. */
  @Type(() => Date)
  @IsDate()
  startTime: Date;
}
