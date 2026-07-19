import fs from "node:fs";
import path from "node:path";
import { Router, type IRouter } from "express";
import { ProductModel } from "@workspace/db";
import {
  BODY_TYPES,
  type BodyType,
  TRYON_CACHE_DIR,
  baseModelPath,
  cachedResultPath,
  fashnCategory,
  productImagePath,
  runFashnTryon,
  runGeminiTryon,
} from "../lib/tryon";

const router: IRouter = Router();

// Serialize generation per (productId, bodyType) so a double-click doesn't
// pay for the same FASHN prediction twice.
const inFlight = new Map<string, Promise<void>>();

interface TryonRequestBody {
  productId: string;
  bodyType: BodyType;
}

router.post("/tryon", async (req, res) => {
  const { productId, bodyType } = req.body as TryonRequestBody;

  if (!productId || !BODY_TYPES.includes(bodyType)) {
    res.status(400).json({ error: `bodyType must be one of: ${BODY_TYPES.join(", ")}` });
    return;
  }

  const resultPath = cachedResultPath(productId, bodyType);
  const imageUrl = `/api/tryon/images/${path.basename(resultPath)}`;

  if (fs.existsSync(resultPath)) {
    res.json({ imageUrl, cached: true });
    return;
  }

  // Engine selection: FASHN (purpose-built try-on) when its key is present,
  // otherwise Gemini image models through the existing OpenRouter key.
  // TRYON_ENGINE=fashn|gemini overrides.
  const fashnKey = process.env.FASHN_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const engine = process.env.TRYON_ENGINE ?? (fashnKey ? "fashn" : "gemini");
  const apiKey = engine === "fashn" ? fashnKey : openRouterKey;
  if (!apiKey) {
    res.status(500).json({
      error: `Virtual try-on needs ${engine === "fashn" ? "FASHN_API_KEY" : "OPENROUTER_API_KEY"} to be set. Did you forget to provision it?`,
    });
    return;
  }

  const product = await ProductModel.findOne({ id: productId }).lean();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const modelImage = baseModelPath(bodyType);
  if (!fs.existsSync(modelImage)) {
    res.status(500).json({
      error: `Base model image missing for body type "${bodyType}" — expected ${modelImage}`,
    });
    return;
  }

  const garmentImage = productImagePath(product.images[0] ?? "");
  if (!product.images[0] || !fs.existsSync(garmentImage)) {
    res.status(500).json({ error: "Product image file not found on server" });
    return;
  }

  const key = `${productId}--${bodyType}`;
  try {
    let pending = inFlight.get(key);
    if (!pending) {
      pending =
        engine === "fashn"
          ? runFashnTryon({
              apiKey,
              modelImagePath: modelImage,
              garmentImagePath: garmentImage,
              category: fashnCategory(product.subcategory),
              outputPath: resultPath,
            })
          : runGeminiTryon({
              apiKey,
              modelImagePath: modelImage,
              garmentImagePath: garmentImage,
              garmentDescription: `${product.brand} ${product.name} (${product.subcategory}, colors: ${product.colors.join("/")})`,
              category: fashnCategory(product.subcategory),
              outputPath: resultPath,
            });
      pending = pending.finally(() => inFlight.delete(key));
      inFlight.set(key, pending);
    }
    await pending;
    res.json({ imageUrl, cached: false });
  } catch (err) {
    req.log.error({ err }, "try-on generation failed");
    res.status(503).json({
      error: "The virtual try-on studio is busy right now — please try again in a moment.",
      details: (err as Error).message,
    });
  }
});

router.get("/tryon/images/:file", (req, res) => {
  const file = path.basename(req.params.file); // strip any path traversal
  const fullPath = path.join(TRYON_CACHE_DIR, file);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: "Try-on image not found" });
    return;
  }
  res.sendFile(fullPath);
});

export default router;
