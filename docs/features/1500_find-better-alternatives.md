# Find Better Alternatives

## What it does

The AI Style Companion's "Upgrade Opportunity" card had a **dead button** — "Find better alternatives" had no `onClick` at all, next to copy promising "Swapping in a better-matching piece will make this outfit look even better." Clicking it did nothing.

It now opens a modal of real, cheaper, style-matched alternatives to the outfit's priciest item — computed entirely from the existing product catalog, no AI and no external data. Picking one swaps it into the outfit and re-scores the compatibility analysis live, for that session.

### User flow

1. On the Companion page, once an outfit is analyzed, the "Upgrade Opportunity" card shows whichever item in the outfit costs the most.
2. Clicking **Find better alternatives** opens a modal: the priciest item at the top for reference, and a grid of up to 6 ranked alternatives below — each cheaper, in the same subcategory, with thumbnail, brand/name, price, and rating.
3. Clicking an alternative's thumbnail/name navigates to that product's page, same as browsing anywhere else in the app.
4. Clicking **Swap In** on an alternative closes the modal, shows a confirmation toast, and immediately re-renders the radar chart and overall score with that item substituted in.
5. The swap only lasts for the current page session — it's never written to the saved Look or the Canvas draft. Reloading the page reverts to the original outfit.

## How it's built

### Matching algorithm (`artifacts/styleverse/src/lib/find-alternatives.ts`)

A pure function, no React involved:

- **Price is a hard filter, not a tiebreaker**: only candidates strictly cheaper than the priciest item are considered at all, and only within the same `subcategory` (not just `category` — a bag is never an "alternative" to shoes).
- Within that cheaper set, a combined match score ranks the results:
  - `+2` per shared color, `+3` per shared occasion tag (occasion mismatches are more visually jarring than color mismatches).
  - `+4` flat bonus for matching the priciest item's brand (a reasonable proxy for matching aesthetic and sizing).
  - `+rating` (0–5) added directly, so a well-reviewed item outranks an equally-matched but poorly-rated one, without letting rating alone beat a genuinely better style match.
- Price ascending breaks any remaining ties.
- Items already in the current outfit are excluded. If nothing in the catalog qualifies, the function returns `[]` — the modal shows an empty state instead of a blank or broken grid.

### Modal (`artifacts/styleverse/src/components/FindAlternativesModal.tsx`)

Same visual density as `SubmitLookModal`'s look-picker grid (thumbnail, brand/name, price) rather than the full `ProductCard`, which is sized for a main catalog grid and too large for a compact 6-item modal. Renders `priciest={null}` as its closed state, matching the existing `SubmissionDetailModal`/`SubmitLookModal` convention in this codebase where a nullable prop *is* the dialog's open/closed signal.

### Swap mechanics (`artifacts/styleverse/src/pages/companion.tsx`)

- State is a map, `swaps: Record<originalId, replacementId>`, not a single slot. After one swap, the priciest item can shift to a *different* item in the outfit — a single-slot design would silently discard an earlier swap the next time the user swaps something else. The map accumulates every swap made in the session.
- The existing `products` derivation (built from either the Canvas draft's `?items=` query param or a saved look's `productIds`) gets one extra step: substitute any product with an entry in `swaps` for its replacement, looked up from the already-fetched catalog.
- A `useEffect` resets `swaps` to `{}` whenever the underlying look/draft changes (`lookId`/`itemsParam`), so a stale swap can't bleed into an unrelated outfit.
- The existing `analysisData` computation already depends on the `products` array, so the radar chart, overall score, and "current priciest item" all update automatically once a swap is applied — no new memoization needed.

## What's deliberately not built

- **No persistence.** The swap is never written to the saved Look in Mongo or to the Canvas draft's URL state. This was an explicit choice, not an oversight: persisting would need a new `PATCH /api/looks/:id` endpoint (none exists today — Looks only support create/list/delete) and risks silently editing a look the user didn't choose to change, including the `looks[0]` dummy-fallback outfit Companion falls back to when no look is selected.
- **No backend or database changes at all.** The whole feature runs against the product catalog already fetched client-side via `useProducts()`.
- **No cross-category suggestions.** An alternative is only ever the same `subcategory` as the priciest item.
