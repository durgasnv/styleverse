import { Router, type IRouter } from "express";
import { ChallengeModel } from "@workspace/db";
import { ListChallengesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/challenges", async (_req, res) => {
  const challenges = await ChallengeModel.find().select("-_id -entries.votedBy").lean();
  res.json(ListChallengesResponse.parse(challenges));
});

export default router;
