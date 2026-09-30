import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString,
  MaxLength, MinLength, ValidateNested,
} from 'class-validator';
import { TEMPLATE_KINDS } from '../contexts';

export class InscriptionVariableInput {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultValue?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;
}

export class SaveInscriptionRequest {
  @IsIn(['PROMPT', 'TEMPLATE'])
  type!: 'PROMPT' | 'TEMPLATE';

  @IsOptional()
  @IsIn([...TEMPLATE_KINDS])
  templateKind?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  systemPrompt?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  bindings?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => InscriptionVariableInput)
  variables?: InscriptionVariableInput[];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  modelId?: string;

  @IsOptional()
  modelParams?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeNote?: string;
}

export class SaveInscriptionCategoryRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class ReorderCategoriesRequest {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CategoryOrderItem)
  items!: CategoryOrderItem[];
}

export class CategoryOrderItem {
  @IsInt()
  id!: number;

  @Type(() => Number)
  @IsInt()
  sortOrder!: number;
}
