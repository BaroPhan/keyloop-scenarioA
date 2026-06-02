import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateServiceBayDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  capabilityIds?: number[];
}
