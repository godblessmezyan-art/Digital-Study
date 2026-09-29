import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { SemanticScope } from '../../semantic/semantic.types';

export class CuratorQueryRequest {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  query!: string;

  @IsOptional()
  @IsIn(['all', 'books', 'notes', 'excerpts'])
  scope?: SemanticScope;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}
