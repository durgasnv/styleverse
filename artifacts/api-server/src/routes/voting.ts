import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { VotingRoomModel } from "@workspace/db";
import { computeTally } from "../lib/voting-tally";

const router: IRouter = Router();

interface CreateRoomBody {
  productIds: string[];
  outfitId?: string;
  creatorLabel?: string;
  creatorVoterId: string;
}

router.post("/voting/rooms", async (req, res) => {
  const { productIds, outfitId, creatorLabel, creatorVoterId } = req.body as CreateRoomBody;
  if (!Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ error: "productIds must be a non-empty array" });
    return;
  }
  if (!creatorVoterId) {
    res.status(400).json({ error: "creatorVoterId is required" });
    return;
  }

  const room = await VotingRoomModel.create({
    id: randomUUID(),
    productIds,
    outfitId,
    creatorLabel: creatorLabel || "A StyleVerse look",
    creatorVoterId,
    createdAt: new Date().toISOString(),
    voters: [],
  });

  res.status(201).json({ id: room.id, productIds: room.productIds, outfitId: room.outfitId, creatorLabel: room.creatorLabel, createdAt: room.createdAt });
});

router.get("/voting/rooms/:id", async (req, res) => {
  const room = await VotingRoomModel.findOne({ id: req.params.id }).lean();
  if (!room) {
    res.status(404).json({ error: "Voting room not found" });
    return;
  }

  const voterId = typeof req.query.voterId === "string" ? req.query.voterId : undefined;
  const myReaction = voterId ? room.voters.find((v: { voterId: string }) => v.voterId === voterId)?.reaction ?? null : null;
  const isCreator = voterId !== undefined && voterId === room.creatorVoterId;

  res.json({
    room: {
      id: room.id,
      productIds: room.productIds,
      outfitId: room.outfitId,
      creatorLabel: room.creatorLabel,
      createdAt: room.createdAt,
    },
    tally: computeTally(room.voters),
    totalVoters: room.voters.length,
    myReaction,
    isCreator,
  });
});

export default router;
