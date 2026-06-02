import { Type } from 'class-transformer';
import { IsInt, IsPositive, Matches } from 'class-validator';

export class SlotsQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  dealershipId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  serviceTypeId: number;

  /** UTC calendar day to enumerate open start times for (YYYY-MM-DD). */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;
}
