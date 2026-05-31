import { Type } from 'class-transformer';
import { IsDate, IsInt, IsPositive } from 'class-validator';

export class QueryAvailabilityDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  dealershipId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  serviceTypeId: number;

  /** Desired start time to check (ISO 8601). */
  @Type(() => Date)
  @IsDate()
  startTime: Date;
}
