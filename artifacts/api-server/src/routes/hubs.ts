import { Router, type IRouter } from "express";
import { HubModel } from "@workspace/db";
import { ListHubsResponse, GetHubResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/hubs", async (_req, res) => {
  const hubs = await HubModel.find().select("-_id").lean();
  res.json(ListHubsResponse.parse(hubs));
});

router.get("/hubs/:id", async (req, res) => {
  const hub = await HubModel.findOne({ id: req.params.id }).select("-_id").lean();
  if (!hub) {
    res.status(404).json({ error: "Hub not found" });
    return;
  }
  res.json(GetHubResponse.parse(hub));
});

export default router;
