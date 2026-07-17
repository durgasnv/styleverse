# Photo-to-Catalog Ingestion Pipeline

## What it does

Turns a folder of raw product photos into real, browsable catalog entries — with a product name, category, price, colors, and hub assignment auto-generated from nothing but the filename and which folder it sat in. This is how most of the product catalog (Y2K, K-Fashion, Acubi, Coquette, Bohemian, and general Footwear — over 100 products as of this writing) got real photos instead of stock filler, without hand-authoring each product.

It's a one-way, rerunnable batch script — not a live upload feature in the app itself. Whoever's sourcing photos (currently split across a couple of people) drops files into a folder, someone runs the script, reviews the output, and re-seeds the database.

### How to use it

1. Create a subfolder per style under `~/Downloads` (or any directory), e.g. `Downloads/acubi/`, `Downloads/coquette/`.
2. Drop one image per product into that folder, **named after the product** — the filename becomes the product name. `"Chunky Platform Sneakers.jpg"` becomes a product literally named "Chunky Platform Sneakers".
3. Run `pnpm --filter @workspace/scripts run ingest-photos [sourceDir]` (defaults to `/mnt/c/Users/durga/Downloads` if no argument given).
4. Review `scripts/out/style-ingest-review.csv` — every generated product's name, category, price, and colors in one sheet, to catch anything that classified wrong before it hits the live site.
5. Re-seed the database so the change is actually visible: `MONGODB_URI=... pnpm --filter @workspace/scripts run seed-mongo` (the ingestion script only writes local files; nothing is live until this runs).

Rerunning is safe and idempotent — it regenerates `ingested-products.ts` from scratch every time based on whatever's currently in the source folders, rather than accumulating duplicates across runs.

## How it's built

`scripts/src/ingest-style-photos.ts` does three things per configured style folder:

1. **Copies images** into `artifacts/styleverse/public/img/`, renamed to `<folder>-<slugified-filename>.<ext>` (e.g. `acubi-black-leather-boots.jpg`) so filenames can't collide across folders.
2. **Generates product data** — one `Product` object per image, written to `artifacts/styleverse/src/data/ingested-products.ts` (a generated file, not hand-edited — it has a header comment saying so).
3. **Writes a CSV review sheet** to `scripts/out/style-ingest-review.csv` for a human to sanity-check before the data goes live.

### Style-to-hub mapping

`STYLE_CONFIGS` is the list of recognized folder names. Each entry maps a folder to a hub's `aestheticTag` (e.g. `acubi` folder → `acubi` tag, matching the existing Acubi hub in `mock-data.ts`). Adding a new folder for an aesthetic that doesn't have a hub yet means setting `newHub` on its config — this is how the Bohemian hub was added, entirely from a script run rather than hand-authoring hub data.

The `footwear` folder is the one exception: it doesn't map to any hub at all (footwear isn't an aesthetic, it cuts across all of them), so its config has no `newHub`. Its products just land in the general catalog as `category: "Footwear"`, findable the same way any other footwear product is — through Search, Home browsing, and the Style Canvas's product picker, not through a "Footwear hub" that doesn't exist.

### Auto-classification, and its sharp edge

`classify(name)` guesses a product's `category`/`subcategory` by scanning the filename's words **from the end backward**, checking each against a keyword list (`CLASSIFY_RULES`) until one matches. Scanning backward (rather than forward) is deliberate: product names put the actual garment noun last (`"Rose Washed Bag Jeans"` → the real category word is `"Jeans"`, not `"Bag"`), and whole-word matching (with basic plural handling) avoids `"Baggy"` false-matching the `"bag"` keyword.

The sharp edge: if a product's filename doesn't contain *any* recognized keyword, classification silently falls through to a hardcoded default (`Women / Tops`) — not an error, just a wrong guess. This actually happened and produced a real, visible bug: shoe photos named things like `"Party Stiletto Pumps.png"` or `"New Balance 5Series30.jpg"` got classified as `Women / Tops` (because `"pumps"` and `"5series30"` weren't in the footwear keyword list), which meant they showed up in the catalog as tops, and the AI Style Companion's "missing footwear" nudge fired on outfits that visibly already included shoes. Fixed two ways:
- Expanded `CLASSIFY_RULES` with more synonyms (`pump`, `loafer`, `wedge`, `stiletto`, `dress`, `jacket`/`blazer`/`coat`, `cap`/`beanie`/`headband`, `bracelet`, etc.) so more real product names actually match a keyword.
- Made the `footwear` folder itself an authoritative signal: any photo dropped there is now unconditionally classified as `Footwear`, bypassing keyword matching entirely — since the human already told the pipeline what it is by which folder they used, that's more reliable than trying to infer it from a product-model name with no descriptive words in it at all.

The review CSV exists specifically because this kind of misclassification is silent, not because the pipeline is expected to be perfect — always skim it after a run before re-seeding.

### Price generation

Price, MRP, and discount are deterministically derived from a hash of the folder name + product name (`hashString`), not random — so re-running the script on the same photos produces the same prices every time, rather than new random ones on every run. The price bands are intentionally tight to keep the catalog affordable:
- Footwear: ₹300–1100
- Accessories: ₹299–798
- Jeans/Trousers: ₹399–1098
- Everything else (tops, dresses, jackets, skirts, etc.): ₹349–1048

`discountPercent` is generated first (30-55%), then `mrp` is derived *from* `price` and `discountPercent` — so the displayed strikethrough price and discount badge are always mathematically consistent, unlike the hand-authored catalog entries, which needed a manual pass to fix mismatched price/MRP pairs that had drifted out of sync from independent hand-edits.

### What's deliberately not built

- No image processing/resizing/compression — photos are copied as-is, whatever format and size they were dropped in as (`.png`, `.jpg`, `.jpeg`, `.webp` are all accepted).
- No de-duplication check against already-ingested photos — if the same photo is dropped into the source folder twice under different filenames, it becomes two separate products. (Ingested filenames themselves are checked for uniqueness within a single run via the `<folder>-<slug>` naming scheme, but there's no cross-run image-similarity check.)
- Still waiting on `streetwear` and `minimalist` photo sets from a teammate — those `STYLE_CONFIGS` entries already exist and will pick up photos with zero code changes the moment the folders appear under the source directory; the script currently just logs `skip: streetwear (not found at ...)` and moves on.
