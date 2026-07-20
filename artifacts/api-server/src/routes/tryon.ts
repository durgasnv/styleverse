import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Nano Banana (Gemini 2.5 Flash Image) on OpenRouter, paid tier — unlike the
// mentor-tip free-model chain, this only needs a one-item fallback in case
// the "-preview" alias is retired or renamed.
const TRYON_MODELS = ["google/gemini-2.5-flash-image", "google/gemini-2.5-flash-image-preview"];

interface TryOnGarment {
  name: string;
  image: string; // data: URL
}

interface TryOnRequestBody {
  baseImage: string; // data: URL
  garments: TryOnGarment[];
}

interface OpenRouterImageContent {
  type: "image_url";
  image_url: { url: string };
}

router.post("/tryon/generate", async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENROUTER_API_KEY must be set. Did you forget to provision it?" });
    return;
  }

  const { baseImage, garments } = req.body as TryOnRequestBody;
  if (typeof baseImage !== "string" || !baseImage.startsWith("data:image/")) {
    res.status(400).json({ error: "baseImage must be a data: URL" });
    return;
  }
  if (!Array.isArray(garments) || garments.length === 0 || garments.some((g) => !g?.image?.startsWith("data:image/"))) {
    res.status(400).json({ error: "garments must be a non-empty array of { name, image } with image data: URLs" });
    return;
  }

  const garmentNames = garments.map((g) => g.name).join(", ");
  const instructions = `You are a virtual try-on image generator. The first image is a photo of a person. The following image(s) are product photos of clothing/accessory items: ${garmentNames}. Generate a single photorealistic image of the same person wearing all of these items together, combined naturally into one outfit. Preserve the person's face, body shape, pose, and the original background exactly. Match lighting and perspective so the garments look naturally worn, not pasted on.`;

  const content: (OpenRouterImageContent | { type: "text"; text: string })[] = [
    { type: "text", text: instructions },
    { type: "image_url", image_url: { url: baseImage } },
  ];
  for (const garment of garments) {
    content.push({ type: "text", text: `Garment: ${garment.name}` });
    content.push({ type: "image_url", image_url: { url: garment.image } });
  }

  const failures: string[] = [];

  for (const model of TRYON_MODELS) {
    try {
      const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          modalities: ["image", "text"],
          messages: [{ role: "user", content }],
        }),
      });

      if (!openRouterResponse.ok) {
        failures.push(`${model}: ${openRouterResponse.status}`);
        continue;
      }

      const data = (await openRouterResponse.json()) as {
        choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
      };
      const image = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!image) {
        failures.push(`${model}: no image in response`);
        continue;
      }

      res.json({ image });
      return;
    } catch (err) {
      failures.push(`${model}: ${(err as Error).message}`);
    }
  }

  res.status(503).json({
    error: "The AI try-on is temporarily unavailable — please try again in a moment.",
    details: failures.join("; "),
  });
});

export default router;
