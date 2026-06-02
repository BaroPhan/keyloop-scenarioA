import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateTechnicianDto {
  @IsString()
  name: string;

  @IsArray()
  @IsInt({ each: true })
  skillIds: number[];

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
