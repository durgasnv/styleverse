# Companion Mood Match Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Style Companion's broken Mood Match heuristic (2 of 4 moods score flat 60 always; free-text custom mood is cosmetic) with real, deterministic scoring for all 4 moods plus a keyword classifier for free-text input.

**Architecture:** One new isolated module, `lib/mood-match.ts`, exporting a single pure function `computeMoodMatchScore(itemTags, itemColors, rawMood) => number`. `companion.tsx` calls it in place of its old inline heuristic — no other files change, no backend involved.

**Tech Stack:** TypeScript, React (existing `useMemo` in `companion.tsx`). No new dependencies.

## Global Constraints

- No backend/API changes — this is entirely frontend, entirely deterministic (no network calls), per spec's "Out of scope."
- No automated tests exist in this repo — verification is manual (typecheck + running the app via the `run` skill), per spec's "Out of scope" and every prior feature's convention in this codebase.
- Score formula, mood/signal mapping, and keyword table must match `docs/superpowers/specs/companion-mood-match.md` exactly — the spec's code block is the source of truth copied into Task 1 below.

---

### Task 1: Create `lib/mood-match.ts`

**Files:**
- Create: `artifacts/styleverse/src/lib/mood-match.ts`

**Interfaces:**
- Produces: `export type Mood = 'confident' | 'bold' | 'relaxed' | 'romantic';` and `export function computeMoodMatchScore(itemTags: string[][], itemColors: string[][], rawMood: string): number` — Task 2 imports and calls this function directly.

- [ ] **Step 1: Write the file**

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

- [ ] **Step 2: Typecheck**

Run: `export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 && corepack disable >/dev/null 2>&1 && export PATH="$PATH:/home/durga/.nvm/versions/node/v20.9.0/bin" && pnpm run typecheck`
Expected: exits 0, no errors from the new file.

- [ ] **Step 3: Manual verification via a throwaway script**

This repo has no test runner, so verify the function directly with `tsx` before wiring it in (same technique used to verify `find-alternatives.ts` earlier in this project):

```bash
cat > /tmp/verify-mood-match.ts << 'EOF'
import { computeMoodMatchScore } from '/mnt/c/Users/durga/OneDrive/Desktop/svc/artifacts/styleverse/src/lib/mood-match';

// confident preset, all-matching outfit -> should be 100
console.log('confident/all-match:', computeMoodMatchScore([['formal'], ['office']], [['black'], ['red']], 'confident'));

// romantic preset, no matching tags/colors -> should be 60
console.log('romantic/no-match:', computeMoodMatchScore([['sport']], [['gray']], 'romantic'));

// previously-broken preset: confident with zero matches used to always be 60 too,
// so also check a partial match actually moves the score above 60
console.log('confident/partial-match:', computeMoodMatchScore([['formal'], ['sport']], [['gray'], ['gray']], 'confident'));

// free-text Gen Z slang -> should resolve like 'confident'
console.log('custom "feeling so slay today":', computeMoodMatchScore([['formal'], ['office']], [['black'], ['red']], 'feeling so slay today'));

// free-text plain synonym -> should resolve like 'relaxed'
console.log('custom "just vibing rn":', computeMoodMatchScore([['casual']], [['brown']], 'just vibing rn'));

// genuinely unmatched free text -> flat 60, no throw
console.log('custom "purple elephant":', computeMoodMatchScore([['formal']], [['black']], 'purple elephant'));
EOF
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 && corepack disable >/dev/null 2>&1 && export PATH="$PATH:/home/durga/.nvm/versions/node/v20.9.0/bin" && npx tsx /tmp/verify-mood-match.ts
rm /tmp/verify-mood-match.ts
```

Expected output: `confident/all-match` is `100`; `romantic/no-match` is `60`; `confident/partial-match` is greater than `60`; the two custom-mood lines match their resolved preset's scoring (same numbers as an equivalent direct-preset call); `purple elephant` is `60`.

- [ ] **Step 4: Commit**

```bash
git add artifacts/styleverse/src/lib/mood-match.ts
git commit -m "feat(styleverse): add real mood-match scoring with free-text classification"
```

---

### Task 2: Wire `computeMoodMatchScore` into `companion.tsx`

**Files:**
- Modify: `artifacts/styleverse/src/pages/companion.tsx:13` (import block)
- Modify: `artifacts/styleverse/src/pages/companion.tsx:151-153` (old `moodScore` heuristic)

**Interfaces:**
- Consumes: `computeMoodMatchScore(itemTags: string[][], itemColors: string[][], rawMood: string): number` from Task 1's `../lib/mood-match`.

- [ ] **Step 1: Add the import**

In `artifacts/styleverse/src/pages/companion.tsx`, directly below the existing color-theory import (line 13):

```ts
import { computeColorHarmonyScore } from '../lib/color-theory';
import { computeMoodMatchScore } from '../lib/mood-match';
```

- [ ] **Step 2: Replace the old heuristic**

Find (lines 151-153):

```ts
    let moodScore = 60;
    if (mood === 'bold' && colors.some(c => !['neutral', 'black', 'white'].includes(c))) moodScore += 30;
    if (mood === 'relaxed' && occasions.includes('casual')) moodScore += 30;
```

Replace with:

```ts
    let moodScore = computeMoodMatchScore(products.map(p => p.occasionTags), products.map(p => p.colors), mood);
```

Leave the later `moodScore = Math.min(100, moodScore);` line (in the "Cap at 100" block) untouched — it's now a harmless no-op, matching the precedent already set for `colorScore` after the color-harmony rewrite.

- [ ] **Step 3: Typecheck**

Run: `export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 && corepack disable >/dev/null 2>&1 && export PATH="$PATH:/home/durga/.nvm/versions/node/v20.9.0/bin" && pnpm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Manual browser verification**

Launch the app (use the `run` skill if not already running). In the Style Companion page, with an outfit loaded:
1. Select each of the 4 preset moods in turn and confirm the "Mood Match" radar axis value changes outfit-to-outfit (not pinned at 60 for `confident`/`romantic` — the previously-broken cases).
2. Type a plain-English custom mood (e.g. "cozy") into "Or describe your own mood..." and confirm the score updates as if `relaxed` were selected.
3. Type a Gen Z term (e.g. "slay") and confirm the score updates as if `confident` were selected.
4. Type a genuinely unrelated phrase (e.g. "purple elephant") and confirm the score reads 60 with no console error.

- [ ] **Step 5: Commit**

```bash
git add artifacts/styleverse/src/pages/companion.tsx
git commit -m "feat(styleverse): wire real mood-match scoring into Style Companion"
```

---

### Task 3: Confirm no stale docs, final verification

**Files:** none modified — this task only verifies, it does not change any file.

This repo documents shipped *features* one-doc-per-feature (see `docs/features/1400_fashion-challenges.md`, `docs/features/1500_find-better-alternatives.md`). Style Companion's scoring axes were never given their own feature doc even before this fix, and the spec's Scope section doesn't call for creating one now — so this task is a verification pass, not a doc-writing task.

- [ ] **Step 1: Confirm no doc references the old broken behavior**

Run: `grep -rl "Companion Score\|Mood Match\|Color Harmony" docs/features/` — expected: no results (confirms no existing feature doc describes companion scoring, so there's nothing stale to fix).

- [ ] **Step 2: Final full-workspace typecheck**

Run: `export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 && corepack disable >/dev/null 2>&1 && export PATH="$PATH:/home/durga/.nvm/versions/node/v20.9.0/bin" && pnpm run typecheck`
Expected: exits 0, covering all workspaces.
