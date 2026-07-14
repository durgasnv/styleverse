import { Router, type IRouter } from "express";
import { ProductModel } from "@workspace/db";
import { ListProductsResponse, GetProductResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (_req, res) => {
  const products = await ProductModel.find().select("-_id").lean();
  res.json(ListProductsResponse.parse(products));
});

router.get("/products/:id", async (req, res) => {
  const product = await ProductModel.findOne({ id: req.params.id }).select("-_id").lean();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse(product));
});

export default router;
