import { ArrayMinSize, IsArray, IsString, MaxLength, MinLength } from 'class-validator';

export interface EditableTemplateModule {
  key: string;
  title: string;
  instruction: string;
}

export class UpdateTemplateRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  contentType!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10_000)
  systemPrompt!: string;

  @IsArray()
  @ArrayMinSize(1)
  defaultModules!: string[];

  @IsArray()
  @ArrayMinSize(1)
  modules!: EditableTemplateModule[];
}
