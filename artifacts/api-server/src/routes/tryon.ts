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
const DESCRIBE_TIMEOUT_MS = 15_000;

// Catalog garment photos are frequently on-model shots of an unrelated real
// person (this is a Y2K/street-style catalog — many product photos are
// influencer mirror selfies with a clearly visible face). Sending that photo
// straight into the identity-critical generation call lets the model's face
// leak into the output; prompt text alone ("ignore that person") consistently
// loses to the actual pixels. So garments are described in a separate,
// non-identity-critical vision call first, and only the resulting TEXT
// description — never the photo — goes into the main generation call. The
// photo is only sent as a fallback if describing it fails.
const descriptionCache = new Map<string, string>();
const DESCRIPTION_CACHE_MAX_ENTRIES = 500;

function hashImage(image: string): string {
  return crypto.createHash("sha256").update(image).digest("hex");
}

async function describeGarment(apiKey: string, garment: TryOnGarment): Promise<string> {
  const key = hashImage(garment.image);
  const cached = descriptionCache.get(key);
  if (cached) return cached;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: TRYON_MODELS[0],
      modalities: ["text"],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `The product being sold in this photo is: "${garment.name}"${garment.region ? ` (a ${garment.region} item)` : ""}. Describe ONLY that specific product, precisely enough that someone could redraw it without seeing the photo. This is catalog photography that may show a model wearing a full styled outfit — the photo can include OTHER garments (a top, jacket, shoes, headwear, etc.) that are not the product being described. Completely ignore and omit every one of those other garments; describe only the single item named above. Cover, in order: (1) exact neckline/collar and strap style (e.g. strapless, halter, one-shoulder, crew neck, collared) — for tops/dresses always state this explicitly; (2) sleeve length if any (sleeveless, cap, short, 3/4, long); (3) garment length/hem (e.g. mini, above-knee, midi, maxi, ankle, cropped, full-length) — for dresses/skirts/bottoms always state this explicitly; (4) fit/silhouette (fitted, A-line, straight, flared, oversized, bodycon, wide-leg, etc.); (5) every distinct color present and roughly where each appears (e.g. 'white base with pink and green floral print scattered throughout', not just 'floral'); (6) fabric/material look; (7) any notable design details (buttons, straps, hardware, ruffles, prints, logos). Also completely ignore and omit the person wearing it — do not describe their face, hair, skin, body, pose, or background, and do not mention that a person is present at all. Answer in 3-4 dense sentences covering all points above, no preamble.`,
            },
            { type: "image_url", image_url: { url: garment.image } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(DESCRIBE_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`describe failed: ${response.status}`);

  const data = (await response.json()) as { choices?: { message?: { content?: string | null } }[] };
  const description = data.choices?.[0]?.message?.content?.trim();
  if (!description) throw new Error("describe returned no text");

  if (descriptionCache.size >= DESCRIPTION_CACHE_MAX_ENTRIES) {
    const oldestKey = descriptionCache.keys().next().value;
    if (oldestKey !== undefined) descriptionCache.delete(oldestKey);
  }
  descriptionCache.set(key, description);
  return description;
}

// Re-running the exact same outfit on the exact same model (a demo re-run, a
// judge re-clicking, an accidental double submit after the dedup window
// closes) shouldn't cost credits twice. Short TTL and a small cap are
// deliberate — this is a live-demo safety net, not a real result store.
const CACHE_TTL_MS = 20 * 60_000;
const CACHE_MAX_ENTRIES = 50;

// Keep in sync with GarmentRegion in artifacts/styleverse/src/lib/garment-region.ts
type GarmentRegion = "top" | "bottom" | "dress" | "outerwear" | "footwear" | "accessory";
const GARMENT_REGIONS = new Set<GarmentRegion>(["top", "bottom", "dress", "outerwear", "footwear", "accessory"]);

interface TryOnGarment {
  name: string;
  image: string; // data: URL
  region?: GarmentRegion;
}

interface TryOnRequestBody {
  baseImage: string; // data: URL
  garments: TryOnGarment[];
}

// Per-region compositing instruction — the previous one-size-fits-all "remove
// and replace" wording worked for a lone top but broke down for outerwear
// (which should layer, not strip) and gave the model no signal at all about
// footwear/accessories. Falls back to REGION_FALLBACK when a garment has no
// (or an unrecognized) region.
const REGION_INSTRUCTIONS: Record<GarmentRegion, string> = {
  top: "This is a top (shirt/tee/blouse/sweater). Completely remove and replace whatever the person is currently wearing on their upper body — no original collar, sleeves, or hem should remain visible underneath.",
  bottom: "This is a bottom (pants/jeans/skirt/shorts). Completely remove and replace whatever the person is currently wearing on their lower body — no original waistband or hem should remain visible underneath or peeking out.",
  dress: "This is a dress. Completely remove and replace the person's entire current outfit (top and bottom) with this dress — this includes any leggings, tights, trousers, or other legwear the person currently has on. Their legs below the dress hem must be bare skin (or hosiery this dress itself comes with), never the original pants poking out underneath.",
  outerwear: "This is an outerwear layer (jacket/blazer). Add it OVER the person's existing top rather than replacing it — the layer underneath should still be visible wherever the outerwear is open.",
  footwear: "This is footwear. Completely remove and replace whatever shoes the person is currently wearing.",
  accessory: "This is an accessory (bag/eyewear/headwear/jewellery). Add it naturally without removing or altering any existing clothing.",
};
const REGION_FALLBACK =
  "Completely remove and replace whatever the person is originally wearing in that same area — none of the original clothing should remain visible underneath or peeking out.";

interface OpenRouterImageContent {
  type: "image_url";
  image_url: { url: string };
}

type TryOnResult =
  | { ok: true; image: string; fitNote?: string }
  | { ok: false; status: number; error: string; details?: string };

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
  // Describe each garment in a separate, non-identity-critical call so the
  // main generation call never sees the catalog photo's own model — only a
  // text description of the item. Falls back to sending the raw photo (with
  // an explicit "ignore that person" reminder) only if describing it fails.
  const describedGarments = await Promise.all(
    garments.map(async (garment) => {
      try {
        return { garment, description: await describeGarment(apiKey, garment) };
      } catch {
        return { garment, description: undefined as string | undefined };
      }
    }),
  );

  const garmentNames = garments.map((g) => g.name).join(", ");
  const instructions = `You are a virtual try-on image generator editing an existing photo — not generating a new person. The only photo attached is of a person. Garments to add are given below as text descriptions (occasionally with a reference photo, if noted).

CRITICAL IDENTITY LOCK: the output must show the exact same individual as the attached photo only — identical face, facial features, skin tone, hairstyle, and body shape, in the same pose, in front of the same background. If any garment item below includes a reference photo, never substitute the person, face, or body shown in it — that model is not relevant to this task; treat their photo purely as a swatch of the item's color, fabric, cut, and fit, and discard everything else about them (face, hair, skin, body, their own outfit, their background).

BODY SIZE MUST NOT CHANGE: this is a common failure mode to avoid — do not slim down, resize, or "idealize" the attached photo's body toward a more typical/average build. If the person is plus-size, curvy, petite, tall, or any other build, the output must keep that exact same body size and proportions. The garments should be drawn fitting THIS body.

The following items should be added: ${garmentNames}, each described below with what it is and exactly how to composite it onto the person. Generate a single photorealistic image of the person wearing all of these items together, combined naturally into one outfit, following each item's specific instruction below. Match lighting and perspective so the garments look naturally worn, not pasted on. Alongside the image, write a short (2-3 sentence) fit note in plain text: say whether the fit looks true-to-size, loose, or snug on this body shape, and if it's not a great fit, suggest one concrete alternative (a different size, cut, or style) that would work better. Be constructive, never body-shaming.`;

  const content: (OpenRouterImageContent | { type: "text"; text: string })[] = [
    { type: "text", text: instructions },
    { type: "image_url", image_url: { url: baseImage } },
  ];
  for (const { garment, description } of describedGarments) {
    const regionNote = (garment.region && REGION_INSTRUCTIONS[garment.region]) || REGION_FALLBACK;
    if (description) {
      content.push({
        type: "text",
        text: `Garment: ${garment.name} (${garment.region ?? "item"}). ${regionNote} Appearance: ${description}`,
      });
    } else {
      content.push({
        type: "text",
        text: `Garment: ${garment.name} (${garment.region ?? "item"}). ${regionNote} If this photo shows a model wearing it, that model is a different, unrelated person — ignore their face, hair, skin, and body entirely; use only the garment itself.`,
      });
      content.push({ type: "image_url", image_url: { url: garment.image } });
    }
  }
  content.push({
    type: "text",
    text: `Final reminder before you generate: the output's face, hairstyle, skin tone, and body must exactly match the attached photo, not any model shown in a garment reference photo above (if any). Do not output the identity of any such model. Body size and proportions specifically must stay exactly as in the attached photo — do not slim down, bulk up, or otherwise resize the body toward a more "average" build; this is a common failure mode to avoid, and the whole point of this tool is to preview fit on THIS body, unchanged. If a dress is among the items above, double-check that none of the person's original leggings, tights, or trousers remain visible below the dress hem — this is also a common failure mode to avoid.`,
  });

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
        choices?: { message?: { content?: string | null; images?: { image_url?: { url?: string } }[] } }[];
      };
      const message = data.choices?.[0]?.message;
      const image = message?.images?.[0]?.image_url?.url;
      if (!image) {
        failures.push(`${model}: no image in response`);
        continue;
      }
      const fitNote = message?.content?.trim() || undefined;

      return { ok: true, image, fitNote };
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
  // Region is advisory prompt guidance, not trusted input — pass through only
  // recognized values so an unexpected value can't inject arbitrary text into
  // the per-garment instruction line.
  const garments: TryOnGarment[] = rawGarments.map((g) => ({
    name: g.name,
    image: g.image,
    region: typeof g.region === "string" && GARMENT_REGIONS.has(g.region as GarmentRegion) ? (g.region as GarmentRegion) : undefined,
  }));

  const key = crypto.createHash("sha256").update(JSON.stringify({ baseImage, garments })).digest("hex");

  const cached = getCachedResult(key);
  if (cached) {
    res.json({ image: cached.image, fitNote: cached.fitNote });
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
    res.json({ image: result.image, fitNote: result.fitNote });
  } else {
    res.status(result.status).json({ error: result.error, details: result.details });
  }
});

export default router;
