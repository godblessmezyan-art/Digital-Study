import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RetryGenerationRequest {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9-]{16,64}$/)
  @MaxLength(64)
  clientRequestId?: string;
}
