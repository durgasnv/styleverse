import { Schema, model, type InferSchemaType } from "mongoose";

const sizeSchema = new Schema(
  {
    label: { type: String, required: true },
    inStock: { type: Boolean, required: true },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    subcategory: { type: String, required: true },
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    discountPercent: { type: Number, required: true },
    rating: { type: Number, required: true },
    reviewCount: { type: Number, required: true },
    images: { type: [String], required: true },
    colors: { type: [String], required: true },
    sizes: { type: [sizeSchema], required: true },
    occasionTags: { type: [String], required: true },
    description: { type: String, required: true },
    deliveryEstimate: { type: String, required: true },
  },
  { versionKey: false },
);

export type ProductDoc = InferSchemaType<typeof productSchema>;
export const ProductModel = model("Product", productSchema);
