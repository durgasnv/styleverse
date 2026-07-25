---
name: StyleVerse app architecture
description: Key architecture decisions for the StyleVerse (Myntra-replica) e-commerce artifact at artifacts/styleverse.
---

StyleVerse (`artifacts/styleverse`, react-vite, previewPath `/`) is a Myntra-look-and-feel fashion e-commerce app plus social/AI styling features (Style Hubs, Style Canvas, AI Style Companion, Fashion Challenges, Saved Collections, My Looks).

- No backend/OpenAPI/DB was used. All product/hub/challenge data is static mock data seeded in the frontend; all user state (bag, wishlist, prefs, votes, saved looks, collections) lives in `localStorage`.
  **Why:** the spec only needed persistence of user prefs/local state, not multi-user shared data, so a backend added no value and would have slowed first-build delivery.
- The "AI Style Companion" outfit-compatibility scoring (radar chart: Color Harmony / Style Consistency / Occasion Match / Budget Compatibility) is a deterministic client-side heuristic based on product color/occasion tags and price variance — not a real LLM/AI call.
  **Why:** matches the source spec's request for a persistent, explainable scoring companion without needing external AI infra; keep this pattern if extending the companion rather than swapping in a live LLM call unless the user explicitly asks for real AI.
- Brand system is a literal replica of Myntra: coral-pink `#FF3F6C` accent, near-black `#282C3F` text, `#FAFAFA`/`#EAEAEC` backgrounds, Sora (headings) + Manrope (body) + JetBrains Mono (labels/prices). Preserve these tokens in `index.css` when touching this artifact's styling.
