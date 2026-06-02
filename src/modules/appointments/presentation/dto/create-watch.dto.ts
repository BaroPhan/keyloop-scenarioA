import { Type } from 'class-transformer';
import { IsDate, IsInt, IsPositive } from 'class-validator';

export class CreateWatchDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  dealershipId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  serviceTypeId: number;

  /** Earliest acceptable start (ISO 8601, inclusive). */
  @Type(() => Date)
  @IsDate()
  windowStart: Date;

  /** Latest acceptable start (ISO 8601, exclusive). */
  @Type(() => Date)
  @IsDate()
  windowEnd: Date;
}
