import { IsString, IsOptional, MaxLength, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreateTermDto {
  @IsString()
  @MaxLength(256)
  title: string;

  @IsString()
  markdownContent: string;

  @IsOptional()
  @IsString()
  language?: string; // default "ja"

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  seeIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  seeAlsoIds?: string[];

  @IsOptional()
  @IsString()
  categoryId?: string;
}
