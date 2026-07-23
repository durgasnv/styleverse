// Maps a catalog subcategory to the body region the AI try-on endpoint uses
// to decide how to composite each garment (replace vs. layer vs. add).
// Keep in sync with GarmentRegion in artifacts/api-server/src/routes/tryon.ts.
export type GarmentRegion = "top" | "bottom" | "dress" | "outerwear" | "footwear" | "accessory";

const SUBCATEGORY_TO_REGION: Record<string, GarmentRegion> = {
  "T-Shirts": "top",
  "Tops": "top",
  "Jerseys": "top",
  "Sweaters": "top",
  "Blazers": "outerwear",
  "Jackets": "outerwear",
  "Jeans": "bottom",
  "Trousers": "bottom",
  "Skirts": "bottom",
  "Dresses": "dress",
  "Sneakers": "footwear",
  "Boots": "footwear",
  "Flats": "footwear",
  "Sandals": "footwear",
  "Bags": "accessory",
  "Eyewear": "accessory",
  "Headwear": "accessory",
  "Jewellery": "accessory",
};

export function subcategoryToRegion(subcategory: string): GarmentRegion | undefined {
  return SUBCATEGORY_TO_REGION[subcategory];
}
