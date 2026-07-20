// Generates the 5 base body-type model images used by Virtual Try-On, via an
// image-capable Gemini model on OpenRouter (paid — needs credits on the key).
//
//   OPENROUTER_API_KEY=... pnpm --filter @workspace/scripts generate-tryon-models
//
// Writes artifacts/styleverse/public/img/models/<bodyType>.png. Skips images
// that already exist so re-runs only fill gaps; delete a file to regenerate it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../artifacts/styleverse/public/img/models",
);

// Must match BODY_TYPES in artifacts/api-server/src/lib/tryon.ts.
const BODY_TYPES: { id: string; build: string }[] = [
  {
    id: "inverted-triangle",
    build:
      "an inverted-triangle body shape: shoulders visibly broader than her hips, athletic upper body, narrower hips and slim legs",
  },
  {
    id: "apple",
    build:
      "an apple body shape: fuller rounded midsection and torso, less defined waist, slimmer hips and legs",
  },
  {
    id: "hourglass",
    build:
      "an hourglass body shape: balanced bust and hips with a clearly defined narrow waist",
  },
  {
    id: "pear",
    build:
      "a pear body shape: narrower shoulders and bust, visibly wider hips and fuller thighs",
  },
  {
    id: "rectangle",
    build:
      "a rectangle body shape: straight balanced silhouette with similar shoulder, waist and hip widths, minimal waist definition",
  },
];

const IMAGE_MODELS = [
  "google/gemini-3.1-flash-image",
  "google/gemini-3-pro-image",
  "google/gemini-2.5-flash-image",
];

// One shared scene description keeps the five images visually consistent, so
// the body-type strip in the try-on dialog reads as one photoshoot.
function prompt(build: string): string {
  return (
    `Photorealistic full-body studio photograph of a young Indian woman in her early twenties with ${build}. ` +
    `She stands facing the camera in a relaxed, natural pose, arms at her sides, gentle smile. ` +
    `She wears a plain fitted heather-grey scoop-neck t-shirt and plain black fitted leggings — simple, neutral clothing suitable for a virtual try-on base model. ` +
    `Shoulder-length dark hair, minimal makeup, barefoot. ` +
    `Plain light-grey seamless studio backdrop, soft even lighting, full body visible head to toe, centered, 3:4 portrait orientation. ` +
    `No text, no watermark, no props.`
  );
}

async function generateOne(apiKey: string, id: string, build: string): Promise<void> {
  const outPath = path.join(OUT_DIR, `${id}.png`);
  if (fs.existsSync(outPath)) {
    console.log(`skip ${id} (exists)`);
    return;
  }

  const failures: string[] = [];
  for (const model of IMAGE_MODELS) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        modalities: ["image", "text"],
        messages: [{ role: "user", content: prompt(build) }],
      }),
    });

    if (!response.ok) {
      failures.push(`${model}: ${response.status} ${(await response.text()).slice(0, 200)}`);
      continue;
    }

    const data = (await response.json()) as {
      choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
    };
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) {
      failures.push(`${model}: no image in response`);
      continue;
    }

    const bytes = url.startsWith("data:")
      ? Buffer.from(url.slice(url.indexOf(",") + 1), "base64")
      : Buffer.from(await (await fetch(url)).arrayBuffer());
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(outPath, bytes);
    console.log(`wrote ${outPath} (${(bytes.length / 1024).toFixed(0)} KB, ${model})`);
    return;
  }

  throw new Error(`${id}: all models failed — ${failures.join("; ")}`);
}

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("OPENROUTER_API_KEY must be set.");
  process.exit(1);
}

for (const { id, build } of BODY_TYPES) {
  await generateOne(apiKey, id, build);
}
console.log("Done. Review the images and delete+re-run any you want regenerated.");
