import { IsString } from 'class-validator';

export class UpdateSkillDto {
  @IsString()
  name: string;
}
