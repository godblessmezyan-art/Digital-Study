import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegenerateSectionRequest {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instruction?: string;
}
