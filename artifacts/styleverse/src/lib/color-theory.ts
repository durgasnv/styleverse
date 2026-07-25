// Approximate hue positions (degrees, 0-360) for the color names used in the
// catalog's `colors` tags. Colors not listed here (e.g. undertone tags like
// "warm"/"cool", or names we don't recognize) are treated as neutral rather
// than guessed at, so the harmony math never fabricates a hue relationship
// that isn't backed by data.
const HUE_MAP: Record<string, number> = {
  red: 0,
  maroon: 350,
  orange: 30,
  brown: 25,
  yellow: 60,
  olive: 70,
  green: 120,
  teal: 170,
  cyan: 185,
  blue: 215,
  navy: 220,
  indigo: 245,
  purple: 275,
  violet: 285,
  magenta: 310,
  pink: 330,
};

const NEUTRAL_COLORS = new Set([
  'neutral',
  'black',
  'white',
  'gray',
  'grey',
  'beige',
  'cream',
  'ivory',
  'tan',
  'khaki',
  'warm',
  'cool',
]);

export function isNeutralColor(color: string): boolean {
  return NEUTRAL_COLORS.has(color) || !(color in HUE_MAP);
}

export function colorHue(color: string): number | null {
  return HUE_MAP[color] ?? null;
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// How well two hues work together, on a 0-100 scale, based on their position
// on the color wheel: analogous (close together) and complementary (roughly
// opposite) pairings read as intentional; the "clash zone" in between
// (60-100 degrees apart) tends to read as accidental. Interpolated linearly
// between these control points (rather than stepped) so nearby hue-distances
// don't collapse onto an identical score — e.g. red-vs-blue (145 degrees
// apart) and pink-vs-blue (115 degrees apart) both used to land in the same
// bucket and score identically.
const HARMONY_CURVE: [number, number][] = [
  [0, 90], // monochrome
  [30, 95], // analogous
  [60, 78], // soft contrast
  [90, 50], // clash zone
  [150, 72], // triadic-ish
  [180, 92], // complementary
];

function pairHarmony(h1: number, h2: number): number {
  const diff = hueDistance(h1, h2);
  for (let i = 0; i < HARMONY_CURVE.length - 1; i++) {
    const [x0, y0] = HARMONY_CURVE[i];
    const [x1, y1] = HARMONY_CURVE[i + 1];
    if (diff >= x0 && diff <= x1) {
      return y0 + ((y1 - y0) * (diff - x0)) / (x1 - x0);
    }
  }
  return HARMONY_CURVE[HARMONY_CURVE.length - 1][1];
}

/**
 * Scores how well a set of items' colors work together, on a 0-100 scale.
 * `colorLists` is one color-tag array per item (e.g. product.colors).
 */
export function computeColorHarmonyScore(colorLists: string[][], skinTone: string): number {
  const chromaticByItem = colorLists.map((colors) =>
    colors.map(colorHue).filter((h): h is number => h !== null),
  );
  const allChromatic = chromaticByItem.flat();

  let harmonyBase: number;
  if (allChromatic.length < 2) {
    // Zero or one real hue in the outfit (the rest neutrals) is the safest
    // possible palette — nothing to clash.
    harmonyBase = 90;
  } else {
    const pairScores: number[] = [];
    for (let i = 0; i < chromaticByItem.length; i++) {
      for (let j = i + 1; j < chromaticByItem.length; j++) {
        for (const h1 of chromaticByItem[i]) {
          for (const h2 of chromaticByItem[j]) {
            pairScores.push(pairHarmony(h1, h2));
          }
        }
      }
    }
    harmonyBase = pairScores.length > 0
      ? pairScores.reduce((sum, s) => sum + s, 0) / pairScores.length
      : 90;
  }

  // Seasonal-color-analysis bonus: warm/cool undertone tags that agree with
  // the user's stated skin tone read as more flattering; a clash is a small
  // penalty rather than a hard fail, since it's a secondary signal.
  const undertones = colorLists.flat().filter((c) => c === 'warm' || c === 'cool');
  let undertoneAdjustment = 0;
  for (const tone of undertones) {
    if (tone === skinTone) undertoneAdjustment += 4;
    else if ((tone === 'warm' && skinTone === 'cool') || (tone === 'cool' && skinTone === 'warm')) {
      undertoneAdjustment -= 3;
    }
  }

  return Math.max(0, Math.min(100, Math.round(harmonyBase + undertoneAdjustment)));
}
