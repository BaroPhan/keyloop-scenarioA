import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateTechnicianDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skillIds?: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  shiftStartMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  shiftEndMinutes?: number;
}
