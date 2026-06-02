import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateServiceTypeDto {
  @IsString()
  name: string;

  @IsInt()
  @IsPositive()
  durationMinutes: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  requiredCapabilityIds: number[];

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  requiredSkillIds: number[];
}
