import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SaveReadingEntryRequest {
  @IsIn(['note', 'quote'])
  type!: 'note' | 'quote';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  pageLabel?: string;

  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  bookSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  chapterId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  chapterTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  quote?: string;

  @IsOptional()
  @IsObject()
  anchor?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  readingProgress?: number;
}
