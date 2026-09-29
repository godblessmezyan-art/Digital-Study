import { ArrayMaxSize, IsArray, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ReadingAiRequest {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  bookSlug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  chapterId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  chapterTitle?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  selectedText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  nearbyText?: string;

  @IsArray()
  @ArrayMaxSize(12)
  messages!: Array<{ role: 'user' | 'assistant'; content: string }>;
}
