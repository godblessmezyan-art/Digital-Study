import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ReorderItem {
  @IsString()
  @MaxLength(36)
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  parentId?: string | null;

  @Type(() => Number)
  @IsInt()
  order!: number;
}

export class ReorderPlanTasksRequest {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items!: ReorderItem[];
}
