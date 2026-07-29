import { Schema, model, type InferSchemaType } from "mongoose";

const voterReactionSchema = new Schema(
  {
    voterId: { type: String, required: true },
    voterName: { type: String, required: false },
    reaction: { type: String, required: true },
    comment: { type: String, required: false },
    updatedAt: { type: String, required: true },
  },
  { _id: false },
);

const votingRoomSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    productIds: { type: [String], required: true },
    outfitId: { type: String, required: false },
    tryOnImage: { type: String, required: false },
    creatorLabel: { type: String, required: true },
    creatorVoterId: { type: String, required: true },
    createdAt: { type: String, required: true },
    voters: { type: [voterReactionSchema], required: true, default: [] },
  },
  { versionKey: false },
);

export type VotingRoomDoc = InferSchemaType<typeof votingRoomSchema>;
export const VotingRoomModel = model("VotingRoom", votingRoomSchema);
