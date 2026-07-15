import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Free-tier OpenRouter model — good enough for a short styling tip.
// llama-3.3-70b/qwen3-next free tiers were upstream rate-limited in testing;
// gemma-4-26b:free responded reliably. Swap here if that changes.
const MENTOR_TIP_MODEL = "google/gemma-4-26b-a4b-it:free";

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
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENROUTER_API_KEY must be set. Did you forget to provision it?" });
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

  try {
    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MENTOR_TIP_MODEL,
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!openRouterResponse.ok) {
      const errText = await openRouterResponse.text();
      res.status(502).json({ error: `OpenRouter request failed: ${openRouterResponse.status} ${errText}` });
      return;
    }

    const data = (await openRouterResponse.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const tip = data.choices?.[0]?.message?.content?.trim();
    if (!tip) {
      res.status(502).json({ error: "OpenRouter returned no content" });
      return;
    }

    res.json({ tip });
  } catch (err) {
    res.status(502).json({ error: `Failed to reach OpenRouter: ${(err as Error).message}` });
  }
});

export default router;
