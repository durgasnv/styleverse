import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { VotingRoomModel } from "@workspace/db";
import { computeTally, extractComments } from "../lib/voting-tally";

const router: IRouter = Router();

interface CreateRoomBody {
  productIds: string[];
  outfitId?: string;
  tryOnImage?: string;
  creatorLabel?: string;
  creatorVoterId: string;
}

router.post("/voting/rooms", async (req, res) => {
  const { productIds, outfitId, tryOnImage, creatorLabel, creatorVoterId } = req.body as CreateRoomBody;
  if (!Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ error: "productIds must be a non-empty array" });
    return;
  }
  if (!creatorVoterId) {
    res.status(400).json({ error: "creatorVoterId is required" });
    return;
  }
  if (tryOnImage !== undefined && !tryOnImage.startsWith("data:image/")) {
    res.status(400).json({ error: "tryOnImage must be a data URL" });
    return;
  }

  const room = await VotingRoomModel.create({
    id: randomUUID(),
    productIds,
    outfitId,
    tryOnImage,
    creatorLabel: creatorLabel || "A StyleVerse look",
    creatorVoterId,
    createdAt: new Date().toISOString(),
    voters: [],
  });

  res.status(201).json({ id: room.id, productIds: room.productIds, outfitId: room.outfitId, tryOnImage: room.tryOnImage, creatorLabel: room.creatorLabel, createdAt: room.createdAt });
});

router.get("/voting/rooms/:id", async (req, res) => {
  const room = await VotingRoomModel.findOne({ id: req.params.id }).lean();
  if (!room) {
    res.status(404).json({ error: "Voting room not found" });
    return;
  }

  const voterId = typeof req.query.voterId === "string" ? req.query.voterId : undefined;
  const myVote = voterId ? room.voters.find((v: { voterId: string }) => v.voterId === voterId) : undefined;
  const isCreator = voterId !== undefined && voterId === room.creatorVoterId;

  res.json({
    room: {
      id: room.id,
      productIds: room.productIds,
      outfitId: room.outfitId,
      tryOnImage: room.tryOnImage,
      creatorLabel: room.creatorLabel,
      createdAt: room.createdAt,
    },
    tally: computeTally(room.voters),
    totalVoters: room.voters.length,
    comments: extractComments(room.voters),
    myReaction: myVote?.reaction ?? null,
    myComment: myVote?.comment ?? null,
    isCreator,
  });
});

export default router;
