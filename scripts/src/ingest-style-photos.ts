// Ingests raw per-style product photo folders (see README below) into:
//   1. artifacts/styleverse/public/img/<slug>.<ext>        (copied, renamed images)
//   2. artifacts/styleverse/src/data/ingested-products.ts  (generated Product/StyleHub data)
//   3. scripts/out/style-ingest-review.csv                 (human-readable review sheet)
//
// Usage:
//   pnpm --filter @workspace/scripts run ingest-photos [sourceDir]
//
// sourceDir defaults to /mnt/c/Users/durga/Downloads and must contain one
// subfolder per style (e.g. y2k/, boho/, k-fashion/), each holding one image
// file per product, named after the product (e.g. "Mini Heart Hair Clip.png").
//
// Rerunnable: add a new style folder later (e.g. streetwear/, minimalist/)
// and rerun with no code changes — the STYLE_CONFIGS list already knows
// about every hub in the app.

import { existsSync, mkdirSync, readdirSync, copyFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));

type Category = "Men" | "Women" | "Kids" | "Footwear" | "Beauty" | "Accessories" | "Home & Living";

interface GeneratedProduct {
  id: string;
  name: string;
  brand: string;
  category: Category;
  subcategory: string;
  price: number;
  mrp: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  images: string[];
  colors: string[];
  sizes: { label: string; inStock: boolean }[];
  occasionTags: string[];
  description: string;
  deliveryEstimate: string;
}

interface GeneratedHub {
  id: string;
  name: string;
  aestheticTag: string;
  description: string;
  coverImage: string;
  baseViewerCount: number;
  memberCount: number;
  trendingOutfitIds: string[];
  weeklyChallenge: string;
  topCreators: { name: string; avatar: string }[];
}

interface StyleConfig {
  folder: string; // subfolder name under sourceDir
  aestheticTag: string; // must match StyleHub.aestheticTag in mock-data.ts
  displayName: string; // used in generated descriptions
  newHub?: GeneratedHub; // only set for hubs that don't already exist in MOCK_HUBS
}

const STYLE_CONFIGS: StyleConfig[] = [
  { folder: "y2k", aestheticTag: "y2k", displayName: "Y2K Nostalgia" },
  { folder: "k-fashion", aestheticTag: "k-fashion", displayName: "K-Fashion Pop" },
  { folder: "streetwear", aestheticTag: "streetwear", displayName: "Streetwear Central" },
  { folder: "minimalist", aestheticTag: "minimalist", displayName: "Minimalist Edit" },
  {
    folder: "boho",
    aestheticTag: "bohemian",
    displayName: "Bohemian Bazaar",
    newHub: {
      id: "h9",
      name: "Bohemian Bazaar",
      aestheticTag: "bohemian",
      description: "Flowing silhouettes, earthy tones, and free-spirited layering.",
      coverImage: "/img/bohemian-hub.jpg",
      baseViewerCount: 260,
      memberCount: 9400,
      trendingOutfitIds: [],
      weeklyChallenge: "Festival Layering Look",
      topCreators: [{ name: "@boho_soul", avatar: "" }],
    },
  },
];

interface ClassifyRule {
  words: string[]; // singular forms; plurals (+s/+es) are matched automatically
  category: Category;
  subcategory: string;
}

// Checked against each word of the product name, from the last word backwards,
// since product names put the actual garment/item noun last (e.g. "Rose Washed
// Bag Jeans" -> "Jeans"). Whole-word matching only (with simple plural handling)
// so e.g. "Baggy" never matches the "bag" keyword.
const CLASSIFY_RULES: ClassifyRule[] = [
  { words: ["belt"], category: "Accessories", subcategory: "Belts" },
  { words: ["clip"], category: "Accessories", subcategory: "Hair Accessories" },
  { words: ["earring", "necklace", "jewellery", "jewelry"], category: "Accessories", subcategory: "Jewellery" },
  { words: ["bag", "handbag"], category: "Accessories", subcategory: "Bags" },
  { words: ["hat", "sunglasses", "headwear", "scarf", "clutch"], category: "Accessories", subcategory: "Accessories" },
  { words: ["shoe", "sneaker", "boot", "sandal", "flat", "heel", "trainer"], category: "Footwear", subcategory: "Footwear" },
  { words: ["jean", "jort"], category: "Women", subcategory: "Jeans" },
  { words: ["short"], category: "Women", subcategory: "Shorts" },
  { words: ["skirt"], category: "Women", subcategory: "Skirts" },
  { words: ["jumpsuit"], category: "Women", subcategory: "Jumpsuits" },
  { words: ["trouser", "pant"], category: "Women", subcategory: "Trousers" },
  { words: ["sweater", "cardigan", "sweatshirt", "hoodie"], category: "Women", subcategory: "Sweaters" },
];
const COLOR_WORDS: Record<string, string> = {
  black: "black", white: "white", pink: "pink", red: "red", green: "green",
  brown: "brown", beige: "beige", grey: "grey", gray: "grey", blue: "blue",
  denim: "blue", washed: "blue", cream: "beige", olive: "green",
};
const BRANDS = ["H&M", "ZARA", "MANGO", "ONLY", "VERO MODA", "FOREVER 21", "URBAN OUTFITTERS", "BERSHKA", "PULL&BEAR", "STREET STYLE STORE"];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function wordMatchesRule(word: string, rule: ClassifyRule): boolean {
  return rule.words.some((base) => word === base || word === `${base}s` || word === `${base}es`);
}

function classify(name: string): { category: Category; subcategory: string } {
  const words = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").split(/\s+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const rule = CLASSIFY_RULES.find((r) => wordMatchesRule(words[i], r));
    if (rule) return { category: rule.category, subcategory: rule.subcategory };
  }
  return { category: "Women", subcategory: "Tops" };
}

function guessColors(name: string): string[] {
  const n = name.toLowerCase();
  const found = Object.keys(COLOR_WORDS).filter((k) => n.includes(k)).map((k) => COLOR_WORDS[k]);
  const unique = [...new Set(found)];
  return unique.length > 0 ? unique : ["neutral"];
}

function guessSizes(category: Category): { label: string; inStock: boolean }[] {
  if (category === "Accessories") return [{ label: "One Size", inStock: true }];
  if (category === "Footwear")
    return ["6", "7", "8", "9", "10"].map((label, i) => ({ label, inStock: i !== 4 }));
  return ["XS", "S", "M", "L", "XL"].map((label, i) => ({ label, inStock: i !== 4 }));
}

function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function buildProduct(
  rawFileName: string,
  config: StyleConfig,
  destImagePath: string,
): GeneratedProduct {
  const name = cleanName(rawFileName);
  const { category, subcategory } = classify(name);
  const h = hashString(config.folder + ":" + name);

  const basePrice =
    category === "Accessories" ? 299 + (h % 700) :
    category === "Footwear" ? 1499 + (h % 2000) :
    subcategory === "Jeans" || subcategory === "Trousers" ? 999 + (h % 1500) :
    499 + (h % 1000);
  const discountPercent = 30 + (h % 26);
  const mrp = Math.round(basePrice / (1 - discountPercent / 100) / 10) * 10;

  return {
    id: `p-${config.aestheticTag}-${slugify(name)}`,
    name,
    brand: BRANDS[h % BRANDS.length],
    category,
    subcategory,
    price: basePrice,
    mrp,
    discountPercent,
    rating: Math.round((3.9 + ((h >> 3) % 7) / 10) * 10) / 10,
    reviewCount: 40 + ((h >> 6) % 360),
    images: [destImagePath],
    colors: guessColors(name),
    sizes: guessSizes(category),
    occasionTags: [config.aestheticTag, "casual"],
    description: `${name} — a must-have piece for the ${config.displayName} aesthetic. (auto-generated, review before demo)`,
    deliveryEstimate: "2-4 business days",
  };
}

function main() {
  const sourceDir = process.argv[2] ?? "/mnt/c/Users/durga/Downloads";
  const repoRoot = join(scriptDir, "..", "..");
  const imgDestDir = join(repoRoot, "artifacts", "styleverse", "public", "img");
  const dataDestFile = join(repoRoot, "artifacts", "styleverse", "src", "data", "ingested-products.ts");
  const csvOutDir = join(scriptDir, "..", "out");
  const csvOutFile = join(csvOutDir, "style-ingest-review.csv");

  mkdirSync(imgDestDir, { recursive: true });
  mkdirSync(csvOutDir, { recursive: true });

  const allProducts: GeneratedProduct[] = [];
  const allHubs: GeneratedHub[] = [];
  const csvRows: string[] = ["id,style,name,category,subcategory,price,mrp,brand,colors,occasionTags,imagePath,sourceFile"];

  for (const config of STYLE_CONFIGS) {
    const folderPath = join(sourceDir, config.folder);
    if (!existsSync(folderPath)) {
      console.log(`skip: ${config.folder} (not found at ${folderPath})`);
      continue;
    }

    const files = readdirSync(folderPath).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
    if (files.length === 0) {
      console.log(`skip: ${config.folder} (no image files)`);
      continue;
    }

    if (config.newHub) allHubs.push(config.newHub);

    for (const file of files) {
      const ext = extname(file);
      const rawName = file.slice(0, -ext.length);
      const slug = `${config.folder}-${slugify(rawName)}`;
      const destFileName = `${slug}${ext.toLowerCase()}`;
      const destImagePath = `/img/${destFileName}`;

      copyFileSync(join(folderPath, file), join(imgDestDir, destFileName));

      const product = buildProduct(rawName, config, destImagePath);
      allProducts.push(product);

      csvRows.push(
        [
          product.id, config.folder, product.name, product.category, product.subcategory,
          product.price, product.mrp, product.brand, product.colors.join("|"),
          product.occasionTags.join("|"), destImagePath, file,
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      );
    }

    console.log(`ingested: ${config.folder} -> ${files.length} product(s)`);
  }

  const fileContents = `// AUTO-GENERATED by scripts/src/ingest-style-photos.ts — do not hand-edit.
// Rerun the script to regenerate after adding/updating source photo folders.
import type { Product, StyleHub } from "./mock-data";

export const INGESTED_PRODUCTS: Product[] = ${JSON.stringify(allProducts, null, 2)};

export const INGESTED_HUBS: StyleHub[] = ${JSON.stringify(allHubs, null, 2)};
`;

  writeFileSync(dataDestFile, fileContents);
  writeFileSync(csvOutFile, csvRows.join("\n"));

  console.log(`\nWrote ${allProducts.length} product(s) and ${allHubs.length} new hub(s).`);
  console.log(`- Data:   ${dataDestFile}`);
  console.log(`- Review: ${csvOutFile}`);
  console.log(`- Images: ${imgDestDir}`);
}

main();
