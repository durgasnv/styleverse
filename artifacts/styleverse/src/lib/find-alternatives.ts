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
