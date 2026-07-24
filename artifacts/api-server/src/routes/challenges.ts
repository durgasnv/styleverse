import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { ChallengeModel, ProductModel } from "@workspace/db";
import { ListChallengesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/challenges", async (_req, res) => {
  const challenges = await ChallengeModel.find().select("-_id -entries.votedBy").lean();
  res.json(ListChallengesResponse.parse(challenges));
});

interface SubmitEntryBody {
  productIds: string[];
  creatorName: string;
  creatorId: string;
}

router.post("/challenges/:id/entries", async (req, res) => {
  const { productIds, creatorName, creatorId } = req.body as SubmitEntryBody;
  if (!Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ error: "productIds must be a non-empty array" });
    return;
  }
  if (!creatorName?.trim()) {
    res.status(400).json({ error: "creatorName is required" });
    return;
  }
  if (!creatorId) {
    res.status(400).json({ error: "creatorId is required" });
    return;
  }

  const products = await ProductModel.find({ id: { $in: productIds } }).lean();
  const totalPrice = productIds.reduce((sum, id) => {
    const product = products.find((p) => p.id === id);
    return sum + (product?.price ?? 0);
  }, 0);

  const entry = {
    id: randomUUID(),
    productIds,
    creatorName: creatorName.trim(),
    creatorId,
    voteCount: 0,
    votedBy: [] as string[],
    totalPrice,
    submittedAt: new Date().toISOString(),
  };

  const challenge = await ChallengeModel.findOneAndUpdate(
    { id: req.params.id },
    { $push: { entries: entry } },
  ).lean();

  if (!challenge) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }

  const { votedBy: _votedBy, ...entryResponse } = entry;
  res.status(201).json(entryResponse);
});

interface VoteEntryBody {
  voterId: string;
}

router.post("/challenges/:id/entries/:entryId/vote", async (req, res) => {
  const { voterId } = req.body as VoteEntryBody;
  if (!voterId) {
    res.status(400).json({ error: "voterId is required" });
    return;
  }

  const updated = await ChallengeModel.findOneAndUpdate(
    {
      id: req.params.id,
      "entries.id": req.params.entryId,
      "entries.votedBy": { $ne: voterId },
    },
    {
      $inc: { "entries.$.voteCount": 1 },
      $addToSet: { "entries.$.votedBy": voterId },
    },
    { new: true },
  ).lean();

  if (!updated) {
    // Either the challenge/entry doesn't exist, or this voter already voted —
    // a second lookup disambiguates which error to return.
    const existing = await ChallengeModel.findOne({ id: req.params.id, "entries.id": req.params.entryId }).lean();
    if (!existing) {
      res.status(404).json({ error: "Challenge or entry not found" });
      return;
    }
    res.status(409).json({ error: "Already voted" });
    return;
  }

  const updatedEntry = updated.entries.find((e) => e.id === req.params.entryId);
  res.json({ voteCount: updatedEntry?.voteCount ?? 0 });
});

export default router;
