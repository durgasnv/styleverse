# Find Better Alternatives — design

Date: 2026-07-25

## Problem

`pages/companion.tsx` has a dead "Find better alternatives" button (no `onClick`) inside the "Upgrade Opportunity" card, which is shown next to the outfit's priciest item with the copy "Swapping in a better-matching piece will make this outfit look even better." Nothing happens when it's clicked.

## Scope

This is the second of two sequential builds (see the [Fashion Challenges revamp](fashion_challenges_improvements.md), done first). In scope:

1. A pure, client-side matching function that finds cheaper, style-similar alternatives to the outfit's priciest item, computed entirely from the existing product dataset — no AI, no external data.
2. A modal showing the priciest item alongside up to 6 ranked alternatives.
3. A "Swap In" action that substitutes the chosen alternative into the current Companion analysis and re-scores live, for this session only.

Out of scope (explicitly decided against during brainstorming, not oversights):

- **Persisting the swap** — no write to the saved Look in Mongo, no update to the Canvas draft's URL state. Reloading the page reverts to the original outfit. Chosen specifically to avoid a new `PATCH /api/looks/:id` endpoint and to avoid silently editing a look the user didn't explicitly ask to change (including the `looks[0]` dummy-fallback case in `companion.tsx`, which is not the user's deliberate selection).
- **Any backend/API changes** — the whole feature runs against the product catalog already fetched client-side via `useProducts()`.
- **Cross-category suggestions** — an alternative is only ever in the same `subcategory` as the priciest item (e.g. "Sneakers" for "Sneakers", not any Footwear). Suggesting a different kind of item isn't an "alternative."

## Matching algorithm (`artifacts/styleverse/src/lib/find-alternatives.ts`, new)

A pure function, no React/hooks, so it's usable directly and easy to reason about in isolation:

```ts
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

Rules, decided explicitly during brainstorming (not defaults):

- **Price is a hard filter, not just a tiebreaker**: only candidates strictly cheaper than the priciest item are considered at all. This keeps the "Upgrade Opportunity" framing honest — every suggestion genuinely saves money.
- Within that cheaper set, ranking is a combined match score:
  - `+2` per shared color, `+3` per shared occasion tag (weighted higher since occasion mismatches are more visually jarring than color mismatches).
  - `+4` flat bonus if the candidate is the same brand as the priciest item (same brand is a reasonable proxy for matching aesthetic and sizing).
  - `+candidate.rating` (0–5) added directly, so a well-reviewed item outranks an otherwise-equal but poorly-rated one, without letting rating alone dominate over actual style match (a perfect color+occasion+brand match with a mediocre rating still beats a highly-rated item with no style overlap).
- Price ascending breaks ties between equally-scored candidates.
- Items already in the current outfit are excluded (no suggesting something the user already has).
- If no candidates exist (e.g. the priciest item's subcategory has nothing cheaper in the catalog), the function returns `[]` — the modal renders an empty state, not an error.

## UI (`artifacts/styleverse/src/components/FindAlternativesModal.tsx`, new)

- Opens from the existing button in the Upgrade Opportunity card (`companion.tsx:356`).
- Header shows the current priciest item for reference (thumbnail, brand/name, price).
- Below it, a grid of alternatives at the same visual density as `SubmitLookModal`'s look-picker grid (thumbnail, brand/name, price, rating) — not the full `ProductCard`, which is sized for a main catalog grid and too large for a compact 6-item modal.
- Each alternative:
  - Clicking the thumbnail/name navigates to `/product/:id` (browse), same as `ProductCard` does elsewhere.
  - A separate **Swap In** button performs the swap and closes the modal.
- Empty state: "No cheaper alternatives found in [subcategory] right now."

## Swap mechanics (`artifacts/styleverse/src/pages/companion.tsx`)

- New state: `const [swaps, setSwaps] = useState<Record<string, string>>({});` — a map of `originalId -> replacementId`, not a single slot. After one swap, the priciest item can shift to a *different* item in the outfit; if the user then swaps that one too, a single-slot design would silently discard the first swap. A map accumulates every swap made this session: `setSwaps((prev) => ({ ...prev, [originalId]: replacementId }))`.
- The existing `products` derivation (currently built from `itemsParam` or `look.productIds`) gets one additional step: after building the base list, map over it and replace any product whose `id` has an entry in `swaps` with the corresponding replacement product looked up from `allProducts`.
- `useEffect(() => setSwaps({}), [lookId, itemsParam])` — resets all active swaps when the user navigates to a different look/draft, so stale swaps can't bleed into unrelated outfits.
- `analysisData` (the `useMemo` computing the radar chart and scores) already depends on the `products` array, so the score, radar chart, and "priciest item" all update automatically once `products` reflects the swap(s) — no new memoization logic needed.
- Not persisted anywhere. This is a deliberate, explicit decision (see Scope) — reloading the page reverts to the original outfit.
- On swap: close the modal, show a toast (e.g. "Swapped in {name} — outfit re-scored.").

## Testing

No automated test infra exists in this repo (consistent with how the rest of the codebase has shipped). Verification is manual: run the app via `./run.sh`, open Companion with a look that has a clear priciest item, click "Find better alternatives," confirm every listed item is cheaper than the priciest item and in the same subcategory, confirm the empty state renders correctly for a subcategory with no cheaper items (if one exists in the seeded catalog), swap one in, and confirm the radar chart, overall score, and the Upgrade Opportunity card's referenced item all update immediately without a page reload.
