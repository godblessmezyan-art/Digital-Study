import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString,
  Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';

/** Context collected from the user before asking the model to break a goal down. */
export class AiPlanBreakdownRequest {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  planId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  goal!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  goalDescription?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  currentState?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  availableTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  constraints?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resources?: string;
}

/** Break a single existing task into subtasks. */
export class AiTaskBreakdownRequest {
  @IsString()
  @MaxLength(36)
  planId!: string;

  @IsString()
  @MaxLength(36)
  taskId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instruction?: string;
}

export class AiApplyTaskDraft {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  estimatedMinutes?: number;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  acceptanceCriteria?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  dueDate?: string;
}

export class AiApplyMilestoneDraft {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => AiApplyTaskDraft)
  tasks!: AiApplyTaskDraft[];
}

/**
 * The reviewed preview the user confirms. Milestones become parent tasks,
 * their tasks become children. Nothing is written before this call.
 */
export class AiApplyBreakdownRequest {
  @IsString()
  @MaxLength(36)
  planId!: string;

  /** When set, the milestones are appended as children of this task instead. */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  parentTaskId?: string;

  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => AiApplyMilestoneDraft)
  milestones!: AiApplyMilestoneDraft[];
}
