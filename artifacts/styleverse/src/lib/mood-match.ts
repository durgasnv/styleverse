export type Mood = 'confident' | 'bold' | 'relaxed' | 'romantic';

interface MoodSignals {
  tags: string[];
  colors: string[];
}

const MOOD_SIGNALS: Record<Mood, MoodSignals> = {
  confident: { tags: ['formal', 'office', 'acubi'], colors: ['black', 'red', 'navy'] },
  bold: { tags: ['streetwear', 'y2k', 'acubi'], colors: ['red', 'orange', 'magenta', 'yellow', 'pink'] },
  relaxed: { tags: ['casual', 'cottagecore', 'bohemian', 'sport'], colors: ['brown', 'olive', 'tan', 'beige'] },
  romantic: { tags: ['coquette', 'cottagecore', 'bohemian', 'party'], colors: ['pink', 'red', 'purple', 'cream'] },
};

// Free-text "describe your own mood" input is classified into the nearest
// preset via keyword match, so scoring stays deterministic (no LLM call).
const MOOD_KEYWORDS: Record<Mood, string[]> = {
  confident: ['confident', 'powerful', 'sharp', 'professional', 'sleek', 'assertive', 'polished', 'boss', 'slay', 'iconic', 'main character', 'unbothered', 'ate'],
  bold: ['bold', 'edgy', 'fierce', 'daring', 'loud', 'statement', 'wild', 'extra', 'unhinged', 'chaotic', 'feral'],
  relaxed: ['relaxed', 'cozy', 'chill', 'lazy', 'comfy', 'easy', 'laid-back', 'vibing', 'lowkey', 'low-key', 'soft life'],
  romantic: ['romantic', 'sweet', 'dreamy', 'soft', 'delicate', 'feminine', 'pretty', 'soft girl', 'delulu', 'hopeless romantic'],
};

function resolveMood(rawMood: string): Mood | null {
  const normalized = rawMood.trim().toLowerCase();
  if (normalized in MOOD_SIGNALS) return normalized as Mood;

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS) as [Mood, string[]][]) {
    if (keywords.some((kw) => normalized.includes(kw))) return mood;
  }
  return null;
}

function fractionMatching(itemSignals: string[][], targetSignals: string[]): number {
  if (itemSignals.length === 0) return 0;
  const matchingCount = itemSignals.filter((signals) => signals.some((s) => targetSignals.includes(s))).length;
  return matchingCount / itemSignals.length;
}

/**
 * Scores how well an outfit matches a stated mood, on a 0-100 scale.
 * `itemTags`/`itemColors` are one array per item (e.g. product.occasionTags / product.colors).
 * `rawMood` may be a preset or free text (e.g. from a "describe your own mood" input).
 */
export function computeMoodMatchScore(itemTags: string[][], itemColors: string[][], rawMood: string): number {
  const mood = resolveMood(rawMood);
  if (!mood) return 60;

  const signals = MOOD_SIGNALS[mood];
  const tagScore = 60 + fractionMatching(itemTags, signals.tags) * 40;
  const colorScore = 60 + fractionMatching(itemColors, signals.colors) * 40;

  return Math.round(tagScore * 0.7 + colorScore * 0.3);
}
