# Style Canvas Catalog Browsing

## What it does

The Style Canvas catalog panel's category filter used to be a single flat row: All, Men, Women, Footwear, Accessories. Picking "Women" dumped every item type — dresses, tops, trousers, skirts, sweaters, blazers — into one mixed grid, with each card showing only brand and price. That made it hard to find a specific kind of item, and hard to tell items apart without a name.

It now works like a real two-level browse: pick a top-level category, then narrow to an item type within it. Each card also shows the item's name, not just brand and price.

### User flow

1. In the catalog panel's search bar, pick a top-level category chip (e.g. **Women**).
2. A second row of chips appears below it — **All**, then every subcategory actually present in that category (e.g. Tops, Dresses, Trousers, Skirts, Sweaters, Blazers) — derived from the catalog data, not hardcoded.
3. Picking a subcategory narrows the grid further. Switching top-level category resets the subcategory back to "All".
4. Every card shows brand, item name, and price, so items of the same brand or similar thumbnail are still distinguishable at a glance.

## How it's built

`artifacts/styleverse/src/pages/canvas.tsx`:

- `subcategories` is derived per render from `allProducts`, filtered to the active top-level `category` and reduced to a deduped, ordered list of `subcategory` values — the same pattern already used for the top-level `categories` list, just scoped one level deeper. It's only computed (and only rendered) once a top-level category other than "All" is active, so there's no empty second row cluttering the default view.
- `handleSelectCategory` resets `activeSubcategory` to "All" whenever the top-level category changes, so a stale subcategory from a previous category (e.g. "Dresses" left over from Women) can't silently filter an unrelated category down to zero results.
- `filteredProducts` gained one more predicate, `matchesSubcat`, alongside the existing search and category matches.
- The catalog card's info block gained a `product.name` line between brand and price — previously only shown in the try-on mode "Selected items" rail, not in the main catalog grid.

## What's deliberately not built

- No persistence of the last-picked category/subcategory across visits — resets to "All" on every page load, consistent with the rest of Canvas's in-memory-only filter state.
- No count badge on subcategory chips (e.g. "Tops (12)") — considered, but the existing top-level category chips don't have one either, so adding it only here would be inconsistent.
