import { IsOptional, IsString } from 'class-validator';

export class CreateCapabilityDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
