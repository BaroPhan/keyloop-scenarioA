import { IsOptional, IsString } from 'class-validator';

export class CreateDealershipDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;
}
