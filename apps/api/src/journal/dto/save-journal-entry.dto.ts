import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SaveJournalEntryRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  content!: string;

  @IsDateString({ strict: true })
  entryDate!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags!: string[];

  @IsOptional()
  @IsIn(['calm', 'happy', 'excited', 'tired', 'sad', 'anxious', 'thoughtful', 'neutral'])
  mood?: string;

  @IsOptional()
  @IsIn(['sunny', 'cloudy', 'rain', 'snow', 'fog', 'storm'])
  weather?: string;

  @IsOptional()
  @IsIn(['dawn', 'day', 'dusk', 'night'])
  worldPeriod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  relatedBooks?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  relatedNotes?: string[];

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
