import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { LookModel } from "@workspace/db";

const router: IRouter = Router();

interface CreateLookBody {
  userId: string;
  name: string;
  productIds: string[];
  companionScore?: number;
}

router.post("/looks", async (req, res) => {
  const { userId, name, productIds, companionScore } = req.body as CreateLookBody;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ error: "productIds must be a non-empty array" });
    return;
  }

  const look = await LookModel.create({
    id: randomUUID(),
    userId,
    name: name.trim(),
    productIds,
    companionScore,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    id: look.id,
    userId: look.userId,
    name: look.name,
    productIds: look.productIds,
    companionScore: look.companionScore,
    createdAt: look.createdAt,
  });
});

router.get("/looks", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  if (!userId) {
    res.status(400).json({ error: "userId query param is required" });
    return;
  }

  const looks = await LookModel.find({ userId }).select("-_id").sort({ createdAt: -1 }).lean();
  res.json(looks);
});

router.delete("/looks/:id", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  if (!userId) {
    res.status(400).json({ error: "userId query param is required" });
    return;
  }

  const result = await LookModel.deleteOne({ id: req.params.id, userId });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Look not found" });
    return;
  }

  res.status(204).end();
});

export default router;
