import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SavePlanRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'])
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  dueDate?: string;
}
