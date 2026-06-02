import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateCapabilityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
