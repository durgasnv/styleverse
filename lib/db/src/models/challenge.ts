import { Schema, model, type InferSchemaType } from "mongoose";

const entrySchema = new Schema(
  {
    id: { type: String, required: true },
    outfitId: { type: String, required: false },
    productIds: { type: [String], required: true },
    creatorName: { type: String, required: true },
    baseVoteCount: { type: Number, required: true },
  },
  { _id: false },
);

const challengeSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    prizeText: { type: String, required: true },
    endsAt: { type: String, required: true },
    entries: { type: [entrySchema], required: true },
  },
  { versionKey: false },
);

export type ChallengeDoc = InferSchemaType<typeof challengeSchema>;
export const ChallengeModel = model("Challenge", challengeSchema);
