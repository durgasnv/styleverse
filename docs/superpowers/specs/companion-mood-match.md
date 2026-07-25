# Style Companion Mood Match — design

Date: 2026-07-25

## Problem

`companion.tsx`'s "Companion Score" is a radar of 4 axes: Color Harmony, Style Cohesion, Occasion Fit, Mood Match. Color Harmony was already replaced with real color-wheel math (`lib/color-theory.ts`, see [companion-color-harmony branch]). Mood Match is still the original heuristic, and it's actively broken, not just simplistic:

```ts
let moodScore = 60;
if (mood === 'bold' && colors.some(c => !['neutral', 'black', 'white'].includes(c))) moodScore += 30;
if (mood === 'relaxed' && occasions.includes('casual')) moodScore += 30;
```

Only 2 of the 4 preset moods (`confident`, `relaxed`, `bold`, `romantic`) have any bonus logic — `confident` and `romantic` always score a flat 60, regardless of the outfit. Worse, the page already ships a free-text "Or describe your own mood..." input (`customMood` state, companion.tsx:238-246) that lets a user type anything — that input is entirely cosmetic for scoring today, since any string outside the 2 handled presets also falls through to flat 60.

## Scope

In scope:
1. Real signal-based scoring for all 4 preset moods, using tags/colors that already exist in the product catalog (no fabricated data).
2. Classification of free-text custom mood input into the nearest preset via keyword matching, including common Gen Z slang, so the existing "describe your own mood" box actually affects the score for most real input.
3. Wiring the new scoring function into `companion.tsx` in place of the old heuristic block.

Out of scope:
- Style Cohesion and Occasion Fit — separate, lower-priority follow-ups (Style Cohesion needs its own design pass; Occasion Fit is misleadingly named but not wrong for what it measures).
- LLM-based mood classification. The page already has one AI call (`/api/companion/mentor-tip`, OpenRouter-backed) for generating tip text, but the numeric score is explicitly a "deterministic fake scoring algorithm" (existing code comment) — instant, synchronous, no network dependency. Keeping mood classification keyword-based preserves that property; adding a network call here would make the score async for the first time and introduce a new failure mode.
- Automated tests — no test infra exists in this repo; verification is manual (typecheck + running the app), consistent with every other feature in this codebase.

## Decisions made during brainstorming

- **Signal scope: tags + color, not tags-only.** A pure tag-based match (like Style Cohesion's rough sketch) was the simpler option, but color is still a real, existing signal on every product, and Color Harmony already proved color data is usable — leaving it out of Mood Match would've thrown away information for no reason.
- **Mood → tag/color mapping: the draft table as proposed**, using only tags/colors that already exist in the catalog (`acubi`, `streetwear`, `coquette`, etc. — verified against `mock-data.ts` / `ingested-products.ts` before proposing them, not guessed).
- **Weighting: 70% tags / 30% color**, over a 50/50 split or a "tags-required, color-as-flat-bonus" model. Tags were judged the stronger, more direct mood signal (a "romantic" item is defined mostly by its style, not its color), so they dominate the weighted average rather than being combined as equals or having color reduced to a token bonus.
- **Custom mood handling: keyword classifier, not LLM classification or a flat-60 no-op.** The score is explicitly documented in-code as a "deterministic fake scoring algorithm" — synchronous, no network call. An LLM classifier (reusing the existing `/api/companion/mentor-tip` OpenRouter pattern) was considered but rejected for this task specifically because it would make the score async for the first time and add a new failure mode; doing nothing was rejected because the "describe your own mood" input already ships in the UI and deserves to actually work.
- **Keyword list includes Gen Z slang** (slay, unhinged, lowkey, delulu, etc.) alongside plain-English synonyms, since that's realistically what a free-text mood box receives from this app's audience.

## Design

### Mood → signal mapping

Each mood maps to a set of `occasionTags` and `colors` values that already exist in the catalog (verified against `mock-data.ts` and `ingested-products.ts`):

| Mood | Tags | Colors |
|---|---|---|
| confident | formal, office, acubi | black, red, navy |
| bold | streetwear, y2k, acubi | red, orange, magenta, yellow, pink |
| relaxed | casual, cottagecore, bohemian, sport | brown, olive, tan, beige |
| romantic | coquette, cottagecore, bohemian, party | pink, red, purple, cream |

### Scoring formula

For an outfit (array of items), compute two sub-scores against the resolved mood's signals:

- `tagScore = 60 + (fraction of items with a matching tag) * 40`
- `colorScore = 60 + (fraction of items with a matching color) * 40`

Both start at 60 (matches the baseline every other axis in this file uses — style=50, occasion=70, old mood=60 — rather than introducing a new floor) and top out at 100 when every item matches.

Final score: `round(tagScore * 0.7 + colorScore * 0.3)` — tags weighted higher since aesthetic/occasion tags define a mood more directly than color alone (a "romantic" item is mostly defined by its style, color is a supporting signal).

### Free-text mood resolution

The `mood` value passed into scoring may be one of the 4 presets or arbitrary free text (from `customMood`). Resolution:

1. Normalize: trim + lowercase.
2. If it's already one of the 4 preset keys, use it directly.
3. Otherwise, scan a keyword table (below) for a substring match and resolve to that mood.
4. If nothing matches, return `null` → caller falls back to a flat 60 (identical to today's behavior for any unhandled mood — a novel phrase never breaks, it just doesn't earn a bonus).

Keyword table (deliberately mixes plain synonyms and Gen Z slang, since that's the realistic vocabulary this free-text box receives):

| Mood | Keywords |
|---|---|
| confident | confident, powerful, sharp, professional, sleek, assertive, polished, boss, slay, iconic, main character, unbothered, ate |
| bold | bold, edgy, fierce, daring, loud, statement, wild, extra, unhinged, chaotic, feral |
| relaxed | relaxed, cozy, chill, lazy, comfy, easy, laid-back, vibing, lowkey, low-key, soft life |
| romantic | romantic, sweet, dreamy, soft, delicate, feminine, pretty, soft girl, delulu, hopeless romantic |

Example: "just vibing rn" contains "vibing" → resolves to `relaxed`. "feeling so slay today" contains "slay" → resolves to `confident`.

### New file: `lib/mood-match.ts`

Mirrors `lib/color-theory.ts`'s pattern — a lookup table plus one exported scoring function, isolated from `companion.tsx`:

```ts
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
```

### Integration (`companion.tsx`)

Add `import { computeMoodMatchScore } from '../lib/mood-match';`.

Replace:

```ts
let moodScore = 60;
if (mood === 'bold' && colors.some(c => !['neutral', 'black', 'white'].includes(c))) moodScore += 30;
if (mood === 'relaxed' && occasions.includes('casual')) moodScore += 30;
```

with:

```ts
let moodScore = computeMoodMatchScore(products.map(p => p.occasionTags), products.map(p => p.colors), mood);
```

The existing `moodScore = Math.min(100, moodScore);` line in the "Cap at 100" block stays as-is (harmless no-op now, since the formula can't exceed 100 by construction) — same defense-in-depth precedent as `colorScore`'s cap after the color-harmony rewrite.

## Testing

No automated test infra exists in this repo. Verification is manual: launch the app, select each of the 4 preset moods against a few different outfits and confirm the score moves (not flat 60) for `confident` and `romantic` specifically (the previously-broken cases), then type free text into "describe your own mood" — both a plain synonym (e.g. "cozy") and a Gen Z term (e.g. "slay") — and confirm the score reflects the resolved mood rather than sitting at flat 60. Also confirm a genuinely unmatched phrase (e.g. "purple elephant") still scores 60 without erroring.

## Known drawbacks & future enhancements

- **Substring keyword matching is brittle and can false-positive.** `.includes()` matches anywhere in the string, so short keywords can match inside unrelated words — e.g. `"ate"` (a `confident` keyword) is a substring of "upd**ate**", "l**ate**r", "cre**ate**", "pl**ate**". *Future fix:* switch to word-boundary regex matching (`new RegExp(`\\b${kw}\\b`)`) instead of plain `.includes()`, so keywords only match whole words/phrases.
- **The mood → tag/color mapping is a static, hand-picked table.** It doesn't grow with the catalog (a new aesthetic tag or a 5th mood requires a manual code edit) and isn't validated against how users actually perceive these moods. *Future fix:* derive candidate tag associations from `StyleHub.aestheticTag` co-occurrence data, or at minimum move the table to a small standalone config so it's easy to extend without touching scoring logic.
- **The 70/30 tag/color weighting is a judgment call, not a tuned value.** *Future fix:* once there's usage data (e.g. which scores correlate with users keeping vs. swapping items via Find Better Alternatives), revisit the weighting — possibly per-mood, since some moods may be more color-driven than others.
- **The keyword list will go stale and can't cover negation, sarcasm, or multi-mood text** (e.g. "not feeling bold today" still matches `bold`). *Future fix:* fall back to the existing OpenRouter mentor-tip call to classify only the inputs that fail keyword matching (keeping the common/preset path instant and network-free, while covering the long tail); optionally log unmatched custom-mood strings to grow the keyword list from real usage over time.
- **Color matching is exact-name-only**, unlike Color Harmony's continuous hue-distance math. "Maroon" or "crimson" won't credit toward `bold`'s "red" signal even though they're close on the color wheel. *Future fix:* reuse `color-theory.ts`'s hue map and `pairHarmony`-style distance curve to score color-mood closeness continuously instead of via exact lookup.
