import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsPositive } from 'class-validator';

export class ListAppointmentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  dealershipId?: number;

  /** Inclusive lower bound on startTime. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  /** Exclusive upper bound on startTime. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
