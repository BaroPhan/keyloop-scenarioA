import { IsEmail, IsInt, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  displayName: string;

  @IsInt()
  @IsPositive()
  adminGroupId: number;
}
