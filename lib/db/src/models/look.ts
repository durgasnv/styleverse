import { Schema, model, type InferSchemaType } from "mongoose";

const lookSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    productIds: { type: [String], required: true },
    companionScore: { type: Number, required: false },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);

export type LookDoc = InferSchemaType<typeof lookSchema>;
export const LookModel = model("Look", lookSchema);
