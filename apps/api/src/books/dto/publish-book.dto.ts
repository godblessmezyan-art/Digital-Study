import { IsBoolean, IsOptional } from 'class-validator';
import { CreateBookRequest } from './create-book.dto';

export class PublishBookRequest extends CreateBookRequest {
  @IsOptional()
  @IsBoolean()
  syncToGit?: boolean;
}

export class PublishOptionsRequest {
  @IsOptional()
  @IsBoolean()
  syncToGit?: boolean;
}

export class DeleteBookRequest {
  @IsOptional()
  @IsBoolean()
  deleteFromGit?: boolean;
}
