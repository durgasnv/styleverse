import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { UserModel } from "@workspace/db";

const router: IRouter = Router();

interface IdentifyBody {
  username: string;
}

router.post("/users/identify", async (req, res) => {
  const { username } = req.body as IdentifyBody;
  const trimmed = username?.trim();
  if (!trimmed) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  const existing = await UserModel.findOne({ username: trimmed }).lean();
  if (existing) {
    res.json({ id: existing.id, username: existing.username });
    return;
  }

  try {
    const user = await UserModel.create({
      id: randomUUID(),
      username: trimmed,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ id: user.id, username: user.username });
  } catch (err) {
    // Two concurrent first-time requests for the same new username can both
    // pass the findOne check above; fall back to the now-existing record.
    if ((err as { code?: number }).code === 11000) {
      const race = await UserModel.findOne({ username: trimmed }).lean();
      if (race) {
        res.json({ id: race.id, username: race.username });
        return;
      }
    }
    throw err;
  }
});

export default router;
