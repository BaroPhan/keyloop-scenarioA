import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateAdminGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  privilegeIds?: number[];
}
