import { toHiragana } from 'wanakana';

/**
 * Convert any Japanese string (Kanji/Katakana) to pure Hiragana.
 * Non‑Japanese characters are left untouched.
 */
export function getKanaReading(text: string): string {
  return toHiragana(text);
}
