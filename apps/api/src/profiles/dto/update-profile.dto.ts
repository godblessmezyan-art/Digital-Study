import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileRequest {
  /** Empty string clears the display name (falls back to account name). */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  signature?: string;
}
