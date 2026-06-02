import { IsOptional, IsString } from 'class-validator';

export class UpdateDealershipDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
