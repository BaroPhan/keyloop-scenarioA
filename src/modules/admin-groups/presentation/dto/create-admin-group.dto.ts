import { ArrayNotEmpty, IsArray, IsInt, IsString } from 'class-validator';

export class CreateAdminGroupDto {
  @IsString()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  privilegeIds: number[];
}
