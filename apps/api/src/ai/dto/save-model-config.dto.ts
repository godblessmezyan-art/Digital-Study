import { IsBoolean, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class SaveModelConfigRequest {
  @IsIn(['openai-chat-completions'])
  apiFormat!: string;

  @IsUrl({ require_tld: false, protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  baseUrl!: string;

  @IsBoolean()
  useFullUrl!: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  modelId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  apiKey?: string;

  @IsOptional()
  @IsBoolean()
  activate?: boolean;
}
