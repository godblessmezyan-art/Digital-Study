import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateBookRequest {
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(160)
  slug: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  author?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summary?: string;

  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(100)
  categorySlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoryName?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  contentHtml: string;
}
