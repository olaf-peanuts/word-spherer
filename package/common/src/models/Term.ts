export interface Term {
  id: string;
  title: string;
  slug: string;
  language: 'ja' | 'en';
  kanaReading: string;            // Hiragana only (for Japanese terms)
  initialLetter: string;          // e.g. "A", "ア行"
  subGroup?: string;              // e.g. "あ","い" when >50 items in row
  markdownPath: string;
  htmlPath: string;
  markdownContent: string;
  htmlContent: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  categoryId?: string;
}
