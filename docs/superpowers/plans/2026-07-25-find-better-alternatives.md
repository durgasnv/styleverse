# Find Better Alternatives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the dead "Find better alternatives" button on the AI Style Companion page so it opens a modal of real, cheaper, same-subcategory catalog alternatives to the outfit's priciest item, and lets the user swap one in to re-score the outfit live.

**Architecture:** A pure client-side matching function (`find-alternatives.ts`) ranks candidates from the already-fetched product catalog. A new modal component (`FindAlternativesModal.tsx`) renders the ranked list and a "Swap In" action. `companion.tsx` holds a small `swaps` map in local state, applies it when deriving the outfit's product list, and resets it whenever the underlying look/draft changes. No backend or database changes.

**Tech Stack:** React, TypeScript, `@tanstack/react-query`'s already-loaded product catalog (`useProducts()`), existing Radix-based `Dialog`/`Button` UI primitives, `wouter` for navigation, `lucide-react` icons.

## Global Constraints

- No backend/API changes. Everything is computed client-side from the product catalog already fetched via `useProducts()`.
- Alternatives must be strictly cheaper than the priciest item — a hard filter applied before ranking, not a tiebreaker.
- Alternatives must share the priciest item's exact `subcategory` (not just `category`).
- The match score is `sharedColors * 2 + sharedOccasionTags * 3 + (sameBrand ? 4 : 0) + candidate.rating`, sorted descending, with price ascending as the final tiebreaker. Return at most 6 results.
- A swap is session-only. It must never be written to the saved Look in Mongo or to the Canvas draft's URL state. Reloading the page must revert to the original outfit.
- No automated test infrastructure exists anywhere in this repo (verified: no `vitest`/`jest` config or `*.test.ts` files in the whole workspace). Verification is manual, consistent with every other feature in this codebase — do not introduce a test framework as part of this plan.
- Match existing UI conventions: Myntra pink `#FF3F6C` for primary actions, ink `#282C3F` for headings/body text, `font-heading` for headings, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` from `@/components/ui/dialog`, `Button` from `@/components/ui/button`, toasts via `useToast` from `@/hooks/use-toast`.

---

### Task 1: Write the matching algorithm

**Files:**
- Create: `artifacts/styleverse/src/lib/find-alternatives.ts`

**Interfaces:**
- Produces: `findAlternatives(priciest: Product, allProducts: Product[], currentOutfitIds: string[], limit?: number): Product[]` — used by Task 2's modal.

- [ ] **Step 1: Write the function**

```ts
import type { Product } from '../data/mock-data';

export function findAlternatives(
  priciest: Product,
  allProducts: Product[],
  currentOutfitIds: string[],
  limit = 6,
): Product[] {
  const candidates = allProducts.filter(
    (p) =>
      p.subcategory === priciest.subcategory &&
      p.id !== priciest.id &&
      !currentOutfitIds.includes(p.id) &&
      p.price < priciest.price,
  );

  const scored = candidates.map((p) => {
    const sharedColors = p.colors.filter((c) => priciest.colors.includes(c)).length;
    const sharedOccasions = p.occasionTags.filter((t) => priciest.occasionTags.includes(t)).length;
    const sameBrand = p.brand === priciest.brand ? 4 : 0;
    const score = sharedColors * 2 + sharedOccasions * 3 + sameBrand + p.rating;
    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score || a.product.price - b.product.price);

  return scored.slice(0, limit).map((s) => s.product);
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 && corepack disable >/dev/null 2>&1 && export PATH="$PATH:/home/durga/.nvm/versions/node/v20.9.0/bin"
pnpm --filter @workspace/styleverse run typecheck
```
Expected: passes.

- [ ] **Step 3: Manual sanity check against real seeded data**

There's no test framework in this repo, so verify with a throwaway script run via `tsx` (already a dependency, used the same way by `scripts/src/seed-mongo.ts`). Write this to a scratch location — do NOT put it inside `artifacts/styleverse/src` or any other package, since it is not meant to be committed:

```ts
// /tmp/verify-find-alternatives.ts
import { findAlternatives } from '/mnt/c/Users/durga/OneDrive/Desktop/svc/artifacts/styleverse/src/lib/find-alternatives';
import { MOCK_PRODUCTS } from '/mnt/c/Users/durga/OneDrive/Desktop/svc/artifacts/styleverse/src/data/mock-data';

// Pick the single most expensive product in the whole seeded catalog as a stand-in "priciest item".
const priciest = [...MOCK_PRODUCTS].sort((a, b) => b.price - a.price)[0];
const results = findAlternatives(priciest, MOCK_PRODUCTS, []);

console.log('Priciest:', priciest.name, priciest.subcategory, priciest.price);
console.log('Alternatives:');
for (const r of results) {
  console.log(' -', r.name, r.subcategory, r.price, 'brand:', r.brand, 'rating:', r.rating);
}

const allCheaper = results.every((r) => r.price < priciest.price);
const allSameSubcat = results.every((r) => r.subcategory === priciest.subcategory);
console.log('All cheaper?', allCheaper, '| All same subcategory?', allSameSubcat, '| Count <= 6?', results.length <= 6);
```

Run:
```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 && corepack disable >/dev/null 2>&1 && export PATH="$PATH:/home/durga/.nvm/versions/node/v20.9.0/bin"
npx tsx /tmp/verify-find-alternatives.ts
```

Expected: `All cheaper? true | All same subcategory? true | Count <= 6? true`, and the printed list looks like genuine style-similar cheaper items (shared brand/colors/occasions visible in the printed rows for the top results). If a real product in the catalog has no cheaper same-subcategory items at all, `results` will legitimately be an empty array — that's correct behavior, not a bug (the modal's empty state, built in Task 2, handles this).

Delete the scratch file afterward: `rm /tmp/verify-find-alternatives.ts`.

- [ ] **Step 4: Commit**

```bash
git add artifacts/styleverse/src/lib/find-alternatives.ts
git commit -m "feat(styleverse): add find-alternatives matching algorithm"
```

---

### Task 2: Build the `FindAlternativesModal` component

**Files:**
- Create: `artifacts/styleverse/src/components/FindAlternativesModal.tsx`

**Interfaces:**
- Consumes: `findAlternatives` from Task 1 (`../lib/find-alternatives`), `Product` type from `../data/mock-data`.
- Produces: `FindAlternativesModal` component, props `{ priciest: Product | null; allProducts: Product[]; currentOutfitIds: string[]; onSwap: (originalId: string, replacement: Product) => void; onOpenChange: (open: boolean) => void }` — used by Task 3 in `companion.tsx`.

- [ ] **Step 1: Write the component**

```tsx
import { useMemo } from 'react';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { findAlternatives } from '../lib/find-alternatives';
import type { Product } from '../data/mock-data';

export function FindAlternativesModal({
  priciest,
  allProducts,
  currentOutfitIds,
  onSwap,
  onOpenChange,
}: {
  priciest: Product | null;
  allProducts: Product[];
  currentOutfitIds: string[];
  onSwap: (originalId: string, replacement: Product) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const alternatives = useMemo(
    () => (priciest ? findAlternatives(priciest, allProducts, currentOutfitIds) : []),
    [priciest, allProducts, currentOutfitIds],
  );

  if (!priciest) return null;

  return (
    <Dialog open={priciest !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Better alternatives to {priciest.name}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 bg-gray-50 border rounded-lg p-3 mb-2">
          <img src={priciest.images[0]} alt={priciest.name} className="w-14 h-14 rounded-md object-cover bg-white shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold uppercase text-gray-400">{priciest.brand}</p>
            <p className="text-sm font-semibold text-[#282C3F] truncate">{priciest.name}</p>
          </div>
          <p className="text-sm font-extrabold text-[#282C3F] shrink-0">₹{priciest.price.toLocaleString('en-IN')}</p>
        </div>

        {alternatives.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No cheaper alternatives found in {priciest.subcategory} right now.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto py-1">
            {alternatives.map((alt) => (
              <div key={alt.id} className="border rounded-lg p-2 flex flex-col gap-1.5">
                <Link href={`/product/${alt.id}`} className="flex flex-col gap-1.5">
                  <img src={alt.images[0]} alt={alt.name} className="w-full aspect-square object-cover rounded bg-gray-100" />
                  <p className="text-[10px] font-extrabold uppercase text-gray-400 truncate">{alt.brand}</p>
                  <p className="text-xs font-semibold text-[#282C3F] truncate">{alt.name}</p>
                </Link>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-[#282C3F]">₹{alt.price.toLocaleString('en-IN')}</span>
                  <span className="flex items-center gap-0.5 text-gray-500">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {alt.rating}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 text-white mt-1"
                  onClick={() => onSwap(priciest.id, alt)}
                >
                  Swap In
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 && corepack disable >/dev/null 2>&1 && export PATH="$PATH:/home/durga/.nvm/versions/node/v20.9.0/bin"
pnpm --filter @workspace/styleverse run typecheck
```
Expected: passes. (The component isn't imported anywhere yet, so this only checks it's internally well-typed — Task 3 wires it up.)

- [ ] **Step 3: Commit**

```bash
git add artifacts/styleverse/src/components/FindAlternativesModal.tsx
git commit -m "feat(styleverse): add FindAlternativesModal component"
```

---

### Task 3: Wire the modal and swap state into `companion.tsx`

**Files:**
- Modify: `artifacts/styleverse/src/pages/companion.tsx`

**Interfaces:**
- Consumes: `findAlternatives` indirectly via `FindAlternativesModal` (Task 2), `Product` type from `../data/mock-data`, `useToast` from `@/hooks/use-toast` (already used elsewhere in this codebase, e.g. `SubmissionDetailModal.tsx`).

- [ ] **Step 1: Add the new imports**

Find this block near the top of the file:

```tsx
import { useLocation } from 'wouter';
import { useProducts } from '../hooks/use-catalog';
import { useStore } from '../hooks/use-store';
import { useLooks } from '../hooks/use-looks';
import { useIdentity } from '../hooks/use-identity';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Wand2, Search, SlidersHorizontal, CheckCircle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Spinner } from '@/components/ui/spinner';
```

Replace it with:

```tsx
import { useLocation } from 'wouter';
import { useProducts } from '../hooks/use-catalog';
import { useStore } from '../hooks/use-store';
import { useLooks } from '../hooks/use-looks';
import { useIdentity } from '../hooks/use-identity';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Wand2, Search, SlidersHorizontal, CheckCircle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { FindAlternativesModal } from '../components/FindAlternativesModal';
import type { Product } from '../data/mock-data';
```

- [ ] **Step 2: Add swap state, the toast hook, and the swap handler**

Find this block:

```tsx
  const { state, updatePrefs } = useStore();
  const { products: allProducts, isLoading } = useProducts();
  const identity = useIdentity();
  const { looks, isLoading: looksLoading } = useLooks(identity?.userId);

  const [mood, setMood] = useState(state.prefs.mood);
  const [customMood, setCustomMood] = useState(() => (PRESET_MOODS.includes(state.prefs.mood) ? '' : state.prefs.mood));
  const [weather, setWeather] = useState(state.prefs.weather);
  const [skinTone, setSkinTone] = useState(state.prefs.skinTone);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [mentorTip, setMentorTip] = useState<string | null>(null);
  const [mentorTipLoading, setMentorTipLoading] = useState(false);
  const [mentorTipError, setMentorTipError] = useState<string | null>(null);
  const [mentorTipRetryToken, setMentorTipRetryToken] = useState(0);
```

Replace it with:

```tsx
  const { state, updatePrefs } = useStore();
  const { products: allProducts, isLoading } = useProducts();
  const identity = useIdentity();
  const { looks, isLoading: looksLoading } = useLooks(identity?.userId);
  const { toast } = useToast();

  const [mood, setMood] = useState(state.prefs.mood);
  const [customMood, setCustomMood] = useState(() => (PRESET_MOODS.includes(state.prefs.mood) ? '' : state.prefs.mood));
  const [weather, setWeather] = useState(state.prefs.weather);
  const [skinTone, setSkinTone] = useState(state.prefs.skinTone);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [mentorTip, setMentorTip] = useState<string | null>(null);
  const [mentorTipLoading, setMentorTipLoading] = useState(false);
  const [mentorTipError, setMentorTipError] = useState<string | null>(null);
  const [mentorTipRetryToken, setMentorTipRetryToken] = useState(0);
  // originalProductId -> replacementProductId. Session-only: never persisted
  // to the saved Look or the Canvas draft. Reset whenever the look/draft
  // being analyzed changes, so a stale swap can't bleed into a new outfit.
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [alternativesModalOpen, setAlternativesModalOpen] = useState(false);
```

- [ ] **Step 3: Apply swaps when deriving `products`, and reset swaps when the look/draft changes**

Find this block:

```tsx
  const products = itemsParam
    ? itemsParam.split(',').filter(Boolean).map(id => allProducts.find(p => p.id === id)).filter(Boolean) as typeof allProducts
    : look
    ? look.productIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as typeof allProducts
    : [];

  const lookName = look?.name ?? 'Your Canvas Look';
```

Replace it with:

```tsx
  const rawProducts = itemsParam
    ? itemsParam.split(',').filter(Boolean).map(id => allProducts.find(p => p.id === id)).filter(Boolean) as typeof allProducts
    : look
    ? look.productIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as typeof allProducts
    : [];

  const products = rawProducts.map((p) => {
    const replacementId = swaps[p.id];
    if (!replacementId) return p;
    return allProducts.find((candidate) => candidate.id === replacementId) ?? p;
  });

  const lookName = look?.name ?? 'Your Canvas Look';

  const handleSwap = useCallback(
    (originalId: string, replacement: Product) => {
      setSwaps((prev) => ({ ...prev, [originalId]: replacement.id }));
      setAlternativesModalOpen(false);
      toast({ title: 'Look updated', description: `Swapped in ${replacement.name} — outfit re-scored.` });
    },
    [toast],
  );
```

Now find this block (the mentor-tip effect, so the reset effect sits right before it):

```tsx
  useEffect(() => {
    if (products.length === 0) return;

    const controller = new AbortController();
    setMentorTipLoading(true);
    setMentorTipError(null);
```

Replace its opening with:

```tsx
  useEffect(() => {
    setSwaps({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookId, itemsParam]);

  useEffect(() => {
    if (products.length === 0) return;

    const controller = new AbortController();
    setMentorTipLoading(true);
    setMentorTipError(null);
```

- [ ] **Step 4: Wire the button and render the modal**

Find this block (the Upgrade Opportunity card):

```tsx
                    {analysisData.priciest && (
                      <div className="bg-white p-4 rounded border border-green-100 flex items-start gap-3">
                        <div className="bg-green-100 text-green-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                        <div>
                          <p className="text-sm font-bold text-[#282C3F]">Upgrade Opportunity</p>
                          <p className="text-xs text-gray-600 mt-1 mb-2">Swapping in a better-matching piece will make this outfit look even better.</p>
                          <Button variant="outline" size="sm" className="h-7 text-xs border-green-200 text-green-600">Find better alternatives</Button>
                        </div>
                      </div>
                    )}
```

Replace it with:

```tsx
                    {analysisData.priciest && (
                      <div className="bg-white p-4 rounded border border-green-100 flex items-start gap-3">
                        <div className="bg-green-100 text-green-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                        <div>
                          <p className="text-sm font-bold text-[#282C3F]">Upgrade Opportunity</p>
                          <p className="text-xs text-gray-600 mt-1 mb-2">Swapping in a better-matching piece will make this outfit look even better.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-green-200 text-green-600"
                            onClick={() => setAlternativesModalOpen(true)}
                          >
                            Find better alternatives
                          </Button>
                        </div>
                      </div>
                    )}
```

Then find the end of that same conditional block, a few lines further down:

```tsx
                    <div className="bg-white p-4 rounded border flex items-start gap-3">
                      <div className="bg-pink-100 text-[#FF3F6C] w-8 h-8 rounded-full flex items-center justify-center shrink-0"><CheckCircle className="h-4 w-4" /></div>
                      <div>
                        <p className="text-sm font-bold text-[#282C3F]">Ready for Challenges</p>
                        <p className="text-xs text-gray-600 mt-1 mb-2">This look is strong enough to compete. Submit it to an active fashion challenge!</p>
                        <Button size="sm" className="h-7 text-xs bg-[#FF3F6C] hover:bg-[#d93059] text-white" onClick={() => setLocation('/challenges')}>View Challenges</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
```

Replace it with:

```tsx
                    <div className="bg-white p-4 rounded border flex items-start gap-3">
                      <div className="bg-pink-100 text-[#FF3F6C] w-8 h-8 rounded-full flex items-center justify-center shrink-0"><CheckCircle className="h-4 w-4" /></div>
                      <div>
                        <p className="text-sm font-bold text-[#282C3F]">Ready for Challenges</p>
                        <p className="text-xs text-gray-600 mt-1 mb-2">This look is strong enough to compete. Submit it to an active fashion challenge!</p>
                        <Button size="sm" className="h-7 text-xs bg-[#FF3F6C] hover:bg-[#d93059] text-white" onClick={() => setLocation('/challenges')}>View Challenges</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <FindAlternativesModal
        priciest={alternativesModalOpen ? (analysisData?.priciest ?? null) : null}
        allProducts={allProducts}
        currentOutfitIds={products.map((p) => p.id)}
        onSwap={handleSwap}
        onOpenChange={setAlternativesModalOpen}
      />
    </div>
  );
}
```

Note the `alternativesModalOpen ? (analysisData?.priciest ?? null) : null` guard: `FindAlternativesModal` treats `priciest !== null` as its own open/closed signal, matching the existing `SubmissionDetailModal`/`SubmitLookModal` pattern in this codebase (`entry`/`challengeId` being non-null is what drives `Dialog open={...}`). This also means closing the modal (`onOpenChange(false)`, which sets `alternativesModalOpen` to `false`) correctly tears down the `priciest` prop back to `null` on next render.

- [ ] **Step 5: Typecheck**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 && corepack disable >/dev/null 2>&1 && export PATH="$PATH:/home/durga/.nvm/versions/node/v20.9.0/bin"
pnpm --filter @workspace/styleverse run typecheck
```
Expected: passes.

- [ ] **Step 6: Manual verification against the running app**

No automated tests exist for this repo's frontend. Verify by hand:

1. Start the app: `./run.sh` (from the repo root; requires `.env` with `MONGODB_URI` already set).
2. Go to a saved look with items across at least two categories, then open **Style Companion** for it (or use `?items=<id,id,...>` from Canvas).
3. Confirm an "Upgrade Opportunity" card appears (it only shows when `analysisData.priciest` is set, i.e., whenever the outfit has any items at all) and click **Find better alternatives**.
4. In the modal: confirm the header item matches the actual priciest item in the outfit, every listed alternative is cheaper than it and in the same subcategory, and the rating stars/price shown match what's in the catalog for those products (spot-check one against `/product/:id`).
5. Click an alternative's thumbnail/name — confirm it navigates to that product's page.
6. Go back, reopen the modal, click **Swap In** on an alternative — confirm: the modal closes, a toast appears, the radar chart and overall score change, and the outfit's item list now shows the new item in place of the old one.
7. Reload the page — confirm the outfit reverts to the original (unswapped) items, proving the swap was session-only.
8. If the seeded catalog happens to have a product whose subcategory has no cheaper items, verify the empty state message renders instead of a blank/broken grid (can force this by testing with the single cheapest item in its subcategory as a stand-in "priciest" via `?items=`).

- [ ] **Step 7: Commit**

```bash
git add artifacts/styleverse/src/pages/companion.tsx
git commit -m "feat(styleverse): wire up Find Better Alternatives modal and session-only swap"
```

---

### Task 4: Update the feature docs

**Files:**
- Create: `docs/features/1500_find-better-alternatives.md`

- [ ] **Step 1: Write the doc**

Follow the exact style of `docs/features/1400_fashion-challenges.md` (What it does / User flow / How it's built / What's deliberately not built). Cover: the dead button it replaces, the cheaper-and-best-match algorithm (with the exact scoring weights from Global Constraints above), the modal, and that swaps are explicitly session-only with the reasoning why (avoids a new `PATCH /api/looks/:id` endpoint and avoids silently editing a look/draft the user didn't choose to persist).

- [ ] **Step 2: Commit**

```bash
git add docs/features/1500_find-better-alternatives.md
git commit -m "docs: add Find Better Alternatives feature doc"
```
