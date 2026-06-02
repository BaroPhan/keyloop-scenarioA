import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePrivilegeDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
