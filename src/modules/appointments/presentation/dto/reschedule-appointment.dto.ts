import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class RescheduleAppointmentDto {
  /** New desired start time (ISO 8601). End is derived from the service duration. */
  @Type(() => Date)
  @IsDate()
  startTime: Date;
}
