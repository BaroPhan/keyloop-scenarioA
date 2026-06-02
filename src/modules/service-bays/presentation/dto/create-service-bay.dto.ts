import { ArrayNotEmpty, IsArray, IsInt, IsString } from 'class-validator';

export class CreateServiceBayDto {
  @IsString()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  capabilityIds: number[];
}
