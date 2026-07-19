import fs from "node:fs";
import path from "node:path";

// Body types must match the base model images shipped in
// artifacts/styleverse/public/img/models/<id>.jpg and the frontend list in
// artifacts/styleverse/src/lib/tryon-api.ts.
export const BODY_TYPES = ["xs", "s", "m", "l", "plus"] as const;
export type BodyType = (typeof BODY_TYPES)[number];

// The api-server always runs with cwd = artifacts/api-server (pnpm run dev /
// run.sh), so the frontend's public dir is a sibling. Overridable for deploys
// where the layout differs.
const PUBLIC_DIR =
  process.env.TRYON_PUBLIC_DIR ?? path.resolve(process.cwd(), "../styleverse/public");

export const TRYON_CACHE_DIR = path.join(PUBLIC_DIR, "img", "tryon");

export function cachedResultPath(productId: string, bodyType: BodyType): string {
  return path.join(TRYON_CACHE_DIR, `${productId}--${bodyType}.jpg`);
}

export function baseModelPath(bodyType: BodyType): string {
  // Generated base models are PNG; hand-supplied photos may be JPG.
  const dir = path.join(PUBLIC_DIR, "img", "models");
  for (const ext of ["png", "jpg", "jpeg"]) {
    const candidate = path.join(dir, `${bodyType}.${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(dir, `${bodyType}.png`);
}

export function productImagePath(imageUrlPath: string): string {
  // Product images are stored as root-relative URLs like "/img/foo.jpg".
  return path.join(PUBLIC_DIR, imageUrlPath.replace(/^\//, ""));
}

function toDataUri(filePath: string): string {
  const format = path.extname(filePath).toLowerCase() === ".png" ? "png" : "jpeg";
  return `data:image/${format};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

// FASHN's category hint improves results when we know the garment kind;
// "auto" is the documented safe fallback for everything else.
export function fashnCategory(subcategory: string): string {
  const s = subcategory.toLowerCase();
  if (/(jean|short|skirt|trouser|pant|bottom)/.test(s)) return "bottoms";
  if (/(dress|jumpsuit|one-piece)/.test(s)) return "one-pieces";
  if (/(top|shirt|tee|blouse|jacket|hoodie|sweater|blazer|coat|henley)/.test(s)) return "tops";
  return "auto";
}

// Image-capable Gemini models on OpenRouter, tried in order — same fallback
// rationale as MENTOR_TIP_MODELS in routes/companion.ts.
const GEMINI_IMAGE_MODELS = [
  "google/gemini-3.1-flash-image",
  "google/gemini-3-pro-image",
  "google/gemini-2.5-flash-image",
];

/**
 * Runs a virtual try-on through an image-editing Gemini model on OpenRouter
 * (the user's existing key) and writes the result to `outputPath`.
 */
// Product photos usually show a full styled outfit, but only one item is being
// sold — the prompt must pin down exactly which garment to lift from the photo
// and what the base model keeps wearing everywhere else.
function slotInstruction(category: string, garmentDescription: string): string {
  switch (category) {
    case "tops":
      return (
        `The item being sold is ONLY the top: ${garmentDescription}. ` +
        `Replace only the woman's grey t-shirt with that top; she keeps wearing her black leggings. ` +
        `Ignore any trousers, skirts, shoes, bags or accessories visible in the product photo — do not transfer them.`
      );
    case "bottoms":
      return (
        `The item being sold is ONLY the bottom-wear: ${garmentDescription}. ` +
        `Replace only the woman's black leggings with it; she keeps wearing her grey t-shirt. ` +
        `Ignore any tops, jackets, shoes, bags or accessories visible in the product photo — do not transfer them.`
      );
    case "one-pieces":
      return (
        `The item being sold is the one-piece: ${garmentDescription}. ` +
        `Replace the woman's t-shirt and leggings with it. ` +
        `Ignore any shoes, bags or accessories visible in the product photo — do not transfer them.`
      );
    default:
      return (
        `The item being sold is ONLY: ${garmentDescription}. ` +
        `Add or swap just that one item on the woman, keeping the rest of her clothing as in the first image. ` +
        `Ignore every other garment or accessory visible in the product photo — do not transfer them.`
      );
  }
}

export async function runGeminiTryon(params: {
  apiKey: string;
  modelImagePath: string;
  garmentImagePath: string;
  garmentDescription: string;
  category: string;
  outputPath: string;
}): Promise<void> {
  const { apiKey, modelImagePath, garmentImagePath, garmentDescription, category, outputPath } = params;

  const prompt =
    `Virtual try-on. The first image is a full-body photo of a woman; the second image is a product photo that may show a full styled outfit. ` +
    slotInstruction(category, garmentDescription) +
    ` Generate a photorealistic full-body photo of the SAME woman wearing the sold item. ` +
    `Keep her face, hair, skin tone, body shape, pose, and the plain studio background exactly as in the first image. ` +
    `Reproduce the sold item's exact color, pattern, fabric and details from the product photo, ` +
    `fitted naturally to her body type. Output only the image.`;

  const failures: string[] = [];

  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          modalities: ["image", "text"],
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: toDataUri(modelImagePath) } },
                { type: "image_url", image_url: { url: toDataUri(garmentImagePath) } },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        failures.push(`${model}: ${response.status}`);
        continue;
      }

      const data = (await response.json()) as {
        choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
      };
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) {
        failures.push(`${model}: no image in response`);
        continue;
      }

      await saveImageOutput(imageUrl, outputPath);
      return;
    } catch (err) {
      failures.push(`${model}: ${(err as Error).message}`);
    }
  }

  throw new Error(`All Gemini image models failed: ${failures.join("; ")}`);
}

/** Writes an image given either a data URI or a downloadable URL. */
async function saveImageOutput(urlOrDataUri: string, outputPath: string): Promise<void> {
  let bytes: Buffer;
  if (urlOrDataUri.startsWith("data:")) {
    const base64 = urlOrDataUri.slice(urlOrDataUri.indexOf(",") + 1);
    bytes = Buffer.from(base64, "base64");
  } else {
    const response = await fetch(urlOrDataUri);
    if (!response.ok) throw new Error(`Failed to download output image (${response.status})`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytes);
}

interface FashnStatusResponse {
  id: string;
  status: "starting" | "in_queue" | "processing" | "completed" | "failed";
  output?: string[];
  error?: { name?: string; message?: string } | string | null;
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;

/**
 * Runs a FASHN tryon-v1.6 prediction and writes the resulting image to
 * `outputPath`. Throws with a descriptive message on any failure.
 */
export async function runFashnTryon(params: {
  apiKey: string;
  modelImagePath: string;
  garmentImagePath: string;
  category: string;
  outputPath: string;
}): Promise<void> {
  const { apiKey, modelImagePath, garmentImagePath, category, outputPath } = params;

  const runResponse = await fetch("https://api.fashn.ai/v1/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model_name: "tryon-v1.6",
      inputs: {
        model_image: toDataUri(modelImagePath),
        garment_image: toDataUri(garmentImagePath),
        category,
        garment_photo_type: "auto",
        mode: "balanced",
        num_samples: 1,
        output_format: "jpeg",
      },
    }),
  });

  if (!runResponse.ok) {
    const body = await runResponse.text().catch(() => "");
    throw new Error(`FASHN run failed (${runResponse.status}): ${body.slice(0, 300)}`);
  }

  const { id } = (await runResponse.json()) as { id: string };
  if (!id) throw new Error("FASHN run returned no prediction id");

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let outputUrl: string | undefined;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const statusResponse = await fetch(`https://api.fashn.ai/v1/status/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!statusResponse.ok) continue; // transient; keep polling until deadline

    const status = (await statusResponse.json()) as FashnStatusResponse;
    if (status.status === "completed") {
      outputUrl = status.output?.[0];
      break;
    }
    if (status.status === "failed") {
      const err = status.error;
      const message = typeof err === "string" ? err : (err?.message ?? "unknown error");
      throw new Error(`FASHN prediction failed: ${message}`);
    }
  }

  if (!outputUrl) throw new Error("FASHN prediction timed out or returned no output");

  await saveImageOutput(outputUrl, outputPath);
}
