import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type { GenerationInput } from '../ai.types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateGenerationRequest implements GenerationInput {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(160)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  author?: string;

  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(100)
  categorySlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoryName?: string;

  @IsString()
  @Matches(SLUG_PATTERN)
  templateId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsString({ each: true })
  modules: string[];

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100000)
  sourceText: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  style?: string;

  @IsOptional()
  @IsIn(['short', 'medium', 'long'])
  length?: 'short' | 'medium' | 'long';

  @IsOptional()
  @IsBoolean()
  allowBackgroundKnowledge?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9-]{16,64}$/)
  @MaxLength(64)
  clientRequestId?: string;
}
