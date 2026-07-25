import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Free-tier OpenRouter models, tried in order. The free tier gets upstream
// rate-limited unpredictably (different provider behind each model, and
// which one is throttled changes day to day) — verified by direct testing,
// so this is a fallback chain, not a single hardcoded model. On a 429 (or
// any other failure) from one model, we immediately retry the next.
const MENTOR_TIP_MODELS = [
  "inclusionai/ling-3.0-flash:free",
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

interface MentorTipItem {
  name: string;
  brand: string;
  category: string;
  colors: string[];
  occasionTags: string[];
}

interface MentorTipRequestBody {
  items: MentorTipItem[];
  mood: string;
  weather: string;
  skinTone: string;
}

router.post("/companion/mentor-tip", async (req, res) => {
  // Separate key from the one tryon.ts uses, so the two OpenRouter
  // integrations can be rate-limited/rotated/revoked independently. Falls
  // back to OPENROUTER_API_KEY for setups that haven't split it out yet.
  const apiKey = process.env.MENTOR_TIP_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "MENTOR_TIP_OPENROUTER_API_KEY (or OPENROUTER_API_KEY) must be set. Did you forget to provision it?" });
    return;
  }

  const { items, mood, weather, skinTone } = req.body as MentorTipRequestBody;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items must be a non-empty array" });
    return;
  }

  const outfitDescription = items
    .map((p) => `${p.brand} ${p.name} (${p.category}, colors: ${p.colors.join("/")})`)
    .join("; ");

  const prompt = `You are a friendly, expert fashion stylist mentor. A user has put together this outfit: ${outfitDescription}. Their mood is "${mood}", the weather is "${weather}", and their skin tone context is "${skinTone}". In 2-3 sentences, give one specific, actionable styling tip that explains WHY it works (e.g. color theory, silhouette, proportion) — teach, don't just praise. Be concise and concrete.`;

  const failures: string[] = [];

  for (const model of MENTOR_TIP_MODELS) {
    try {
      const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!openRouterResponse.ok) {
        failures.push(`${model}: ${openRouterResponse.status}`);
        continue;
      }

      const data = (await openRouterResponse.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const tip = data.choices?.[0]?.message?.content?.trim();
      if (!tip) {
        failures.push(`${model}: empty response`);
        continue;
      }

      res.json({ tip });
      return;
    } catch (err) {
      failures.push(`${model}: ${(err as Error).message}`);
    }
  }

  res.status(503).json({
    error: "The style mentor is temporarily busy — please tap Retry in a moment.",
    details: failures.join("; "),
  });
});

export default router;
