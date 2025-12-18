export class CreateTermDto {
  title!: string;
  language?: string;
  kanaReading!: string;
  initialLetter!: string;
  subGroup?: string;
  markdownContent!: string;
  categoryId?: string;
}
