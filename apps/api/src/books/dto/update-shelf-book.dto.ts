import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateShelfBookRequest {
  @IsOptional()
  @IsIn(['want_to_read', 'reading', 'completed'])
  status?: 'want_to_read' | 'reading' | 'completed';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}
