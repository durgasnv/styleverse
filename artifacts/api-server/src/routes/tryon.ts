import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { createRateLimiter } from "../lib/rate-limit";

const router: IRouter = Router();

// Nano Banana (Gemini 2.5 Flash Image) on OpenRouter, paid tier — unlike the
// mentor-tip free-model chain, this only needs a one-item fallback in case
// the "-preview" alias is retired or renamed.
const TRYON_MODELS = ["google/gemini-2.5-flash-image", "google/gemini-2.5-flash-image-preview"];

// Every generate call is a live paid request, so cap how much one request
// can compose (cost + prompt quality) and how often a single caller can fire it.
const MAX_GARMENTS = 6;
const REQUEST_TIMEOUT_MS = 30_000;

// Re-running the exact same outfit on the exact same model (a demo re-run, a
// judge re-clicking, an accidental double submit after the dedup window
// closes) shouldn't cost credits twice. Short TTL and a small cap are
// deliberate — this is a live-demo safety net, not a real result store.
const CACHE_TTL_MS = 20 * 60_000;
const CACHE_MAX_ENTRIES = 50;

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

type TryOnResult = { ok: true; image: string } | { ok: false; status: number; error: string; details?: string };

// Keyed by a hash of the exact request payload, so a double-fired request
// for the *same* outfit on the *same* model reuses the in-flight call
// instead of paying for it twice. Different content always gets its own call.
const inFlight = new Map<string, Promise<TryOnResult>>();

// Same hash key as inFlight, but for completed results — covers repeats that
// arrive after the in-flight call already finished. Only successes are
// cached; a failure might be transient and shouldn't be remembered.
const resultCache = new Map<string, { result: Extract<TryOnResult, { ok: true }>; expiresAt: number }>();

function getCachedResult(key: string): Extract<TryOnResult, { ok: true }> | undefined {
  const entry = resultCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    resultCache.delete(key);
    return undefined;
  }
  return entry.result;
}

function setCachedResult(key: string, result: Extract<TryOnResult, { ok: true }>) {
  if (resultCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = resultCache.keys().next().value;
    if (oldestKey !== undefined) resultCache.delete(oldestKey);
  }
  resultCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function runTryOn(apiKey: string, baseImage: string, garments: TryOnGarment[]): Promise<TryOnResult> {
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
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

      return { ok: true, image };
    } catch (err) {
      const isTimeout = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
      failures.push(`${model}: ${isTimeout ? `timed out after ${REQUEST_TIMEOUT_MS / 1000}s` : (err as Error).message}`);
    }
  }

  return {
    ok: false,
    status: 503,
    error: "The AI try-on is temporarily unavailable — please try again in a moment.",
    details: failures.join("; "),
  };
}

router.post("/tryon/generate", createRateLimiter({ windowMs: 5 * 60_000, max: 8 }), async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENROUTER_API_KEY must be set. Did you forget to provision it?" });
    return;
  }

  const { baseImage, garments: rawGarments } = req.body as TryOnRequestBody;
  if (typeof baseImage !== "string" || !baseImage.startsWith("data:image/")) {
    res.status(400).json({ error: "baseImage must be a data: URL" });
    return;
  }
  if (!Array.isArray(rawGarments) || rawGarments.length === 0 || rawGarments.some((g) => !g?.image?.startsWith("data:image/"))) {
    res.status(400).json({ error: "garments must be a non-empty array of { name, image } with image data: URLs" });
    return;
  }
  if (rawGarments.length > MAX_GARMENTS) {
    res.status(400).json({ error: `garments must contain at most ${MAX_GARMENTS} items` });
    return;
  }
  const garments = rawGarments;

  const key = crypto.createHash("sha256").update(JSON.stringify({ baseImage, garments })).digest("hex");

  const cached = getCachedResult(key);
  if (cached) {
    res.json({ image: cached.image });
    return;
  }

  let pending = inFlight.get(key);
  if (!pending) {
    pending = runTryOn(apiKey, baseImage, garments)
      .then((result) => {
        if (result.ok) setCachedResult(key, result);
        return result;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }

  const result = await pending;
  if (result.ok) {
    res.json({ image: result.image });
  } else {
    res.status(result.status).json({ error: result.error, details: result.details });
  }
});

export default router;
