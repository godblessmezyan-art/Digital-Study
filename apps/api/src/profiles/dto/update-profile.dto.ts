import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileRequest {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  signature?: string;
}
