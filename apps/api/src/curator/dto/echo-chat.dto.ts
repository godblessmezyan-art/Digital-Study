import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ContextRefInput {
  @IsString()
  @MaxLength(40)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(190)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class EchoChatRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(20000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  inscriptionId?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ContextRefInput)
  contextRefs?: ContextRefInput[];

  @IsOptional()
  @IsBoolean()
  useLibrary?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  model?: string;
}

export class SaveEchoNoteRequest {
  @IsString()
  @MaxLength(20000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}

export class SaveEchoJournalRequest {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  @MaxLength(20000)
  content!: string;
}
