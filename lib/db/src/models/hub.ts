import { Schema, model, type InferSchemaType } from "mongoose";

const creatorSchema = new Schema(
  {
    name: { type: String, required: true },
    avatar: { type: String },
  },
  { _id: false },
);

const hubSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    aestheticTag: { type: String, required: true },
    description: { type: String, required: true },
    coverImage: { type: String, required: true },
    baseViewerCount: { type: Number, required: true },
    memberCount: { type: Number, required: true },
    trendingOutfitIds: { type: [String], required: true },
    weeklyChallenge: { type: String, required: true },
    topCreators: { type: [creatorSchema], required: true },
  },
  { versionKey: false },
);

export type HubDoc = InferSchemaType<typeof hubSchema>;
export const HubModel = model("StyleHub", hubSchema);
