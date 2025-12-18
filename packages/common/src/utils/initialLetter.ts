/**
 * Mapping of first hiragana character → 五十音行 (row)
 */
const rowMap: Record<string, string> = {
  あ: 'ア行', い: 'ア行', う: 'ア行', え: 'ア行', お: 'ア行',
  か: 'カ行', き: 'カ行', く: 'カ行', け: 'カ行', こ: 'カ行',
  さ: 'サ行', し: 'サ行', す: 'サ行', せ: 'サ行', そ: 'サ行',
  た: 'タ行', ち: 'タ行', つ: 'タ行', て: 'タ行', と: 'タ行',
  な: 'ナ行', に: 'ナ行', ぬ: 'ナ行', ね: 'ナ行', の: 'ナ行',
  は: 'ハ行', ひ: 'ハ行', ふ: 'ハ行', へ: 'ハ行', ほ: 'ハ行',
  ま: 'マ行', み: 'マ行', む: 'マ行', め: 'マ行', も: 'マ行',
  や: 'ヤ行', ゆ: 'ヤ行', よ: 'ヤ行',
  ら: 'ラ行', り: 'ラ行', る: 'ラ行', れ: 'ラ行', ろ: 'ラ行',
  わ: 'ワ行', を: 'ワ行', ん: 'ン行'
};

/**
 * Determine the main group (英字はそのまま、日語は五十音行)
 */
export function getInitialLetter(title: string, language = 'ja'): string {
  if (language !== 'ja') {
    const firstAlpha = title.trim()[0];
    return firstAlpha ? firstAlpha.toUpperCase() : '';
  }

  // Japanese → kana reading first character
  const kana = toHiragana(title[0]);
  const row = rowMap[kana] ?? '';
  return row;
}

/**
 * When a row exceeds 50 items we split into vowel sub‑groups.
 */
export function getSubGroup(kanaReading: string): string | undefined {
  if (!kanaReading) return undefined;
  const firstChar = kanaReading[0];
  // Vowel groups
  if (['あ', 'い', 'う', 'え', 'お'].includes(firstChar)) return firstChar;
  // For other rows we use the same vowel logic based on the first char's vowel.
  const vowelMap: Record<string, string> = {
    か: 'あ', き: 'い', く: 'う', け: 'え', こ: 'お',
    さ: 'あ', し: 'い', す: 'う', せ: 'え', そ: 'お',
    た: 'あ', ち: 'い', つ: 'う', て: 'え', と: 'お',
    な: 'あ', に: 'い', ぬ: 'う', ね: 'え', の: 'お',
    は: 'あ', ひ: 'い', ふ: 'う', へ: 'え', ほ: 'お',
    ま: 'あ', み: 'い', む: 'う', め: 'え', も: 'お',
    や: 'あ', ゆ: 'う', よ: 'お',
    ら: 'あ', り: 'い', る: 'う', れ: 'え', ろ: 'お',
    わ: 'あ', を: 'お'
  };
  return vowelMap[firstChar];
}
