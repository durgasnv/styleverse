# Fashion Challenges Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake/broken parts of the Fashion Challenges feature (localStorage-only voting, dead Submit button, hardcoded entry thumbnails) with a real card-based Challenges list, a dedicated Challenge Details page, and a submission detail modal — all backed by real server-persisted votes and submissions.

**Architecture:** MongoDB/Mongoose model extended with real vote/submission fields; two new hand-rolled Express routes (submit entry, vote) following the existing `looks.ts`/`voting.ts` pattern; the existing generated `GET /challenges` list endpoint extended via OpenAPI + codegen to carry the new fields; frontend gets a card-grid list page, a new `/challenges/:id` detail page, and two new modals, all wired through React Query.

**Tech Stack:** Express + Mongoose (api-server), React + wouter + TanStack Query + Tailwind + shadcn/ui (styleverse), OpenAPI + orval codegen (lib/api-spec, lib/api-zod, lib/api-client-react).

## Global Constraints

- Branch: all work happens on `feature/fashion-challenges-revamp` (already created off `main`).
- No test framework exists anywhere in this repo. Verification is `pnpm run typecheck` (or a package-scoped `pnpm --filter <pkg> run typecheck`) plus manual curl/browser checks. Do not introduce a new test runner as a side effect of this plan.
- Brand colors/typography must match the existing app exactly: pink `#FF3F6C` (primary CTA/accent), ink `#282C3F` (headings/body), `font-heading` class for titles, Tailwind gray scale for secondary text/borders — copy these literal values, don't invent new ones.
- `votedBy` (the per-entry list of user IDs who've voted) must never appear in any API response — it's enforcement-only server state.
- The codegen pipeline (`pnpm --filter @workspace/api-spec run codegen`) needs Node ≥20.12 (uses `node:util.styleText`) but the repo is pinned to pnpm 9.15.9 — corepack under Node 24 will try to auto-upgrade pnpm and trigger a destructive `node_modules` purge prompt. Use exactly this incantation before any codegen command:
  ```bash
  export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 && corepack disable >/dev/null 2>&1 && export PATH="$PATH:/home/durga/.nvm/versions/node/v20.9.0/bin"
  ```
- A real `MONGODB_URI` is already configured in `.env` at the repo root — Task 4's reseed/verify step runs against the real live database, not a mock.

---

### Task 1: Extend the OpenAPI schema and regenerate the client code

**Files:**
- Modify: `lib/api-spec/openapi.yaml`

**Interfaces:**
- Produces: regenerated `Challenge` / `ChallengeEntry` types and `ListChallengesResponse` Zod schema in `@workspace/api-zod`, and a regenerated `@workspace/api-client-react` (including `getListChallengesQueryKey()`, already present and unchanged) — consumed by Task 2 (backend route validation) and Task 6 (frontend cache invalidation).

- [ ] **Step 1: Edit the `ChallengeEntry` schema**

In `lib/api-spec/openapi.yaml`, replace the existing `ChallengeEntry` schema (currently has `id`, `outfitId`, `productIds`, `creatorName`, `baseVoteCount`) with:

```yaml
    ChallengeEntry:
      type: object
      properties:
        id:
          type: string
        outfitId:
          type: string
        productIds:
          type: array
          items:
            type: string
        creatorName:
          type: string
        creatorId:
          type: string
        voteCount:
          type: number
        totalPrice:
          type: number
        submittedAt:
          type: string
      required: [id, productIds, creatorName, creatorId, voteCount, totalPrice, submittedAt]
```

- [ ] **Step 2: Edit the `Challenge` schema**

Replace the existing `Challenge` schema with:

```yaml
    Challenge:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
        description:
          type: string
        prizeText:
          type: string
        rules:
          type: string
        endsAt:
          type: string
        entries:
          type: array
          items:
            $ref: "#/components/schemas/ChallengeEntry"
      required:
        - id
        - title
        - description
        - prizeText
        - rules
        - endsAt
        - entries
```

- [ ] **Step 3: Run codegen**

```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 && corepack disable >/dev/null 2>&1 && export PATH="$PATH:/home/durga/.nvm/versions/node/v20.9.0/bin"
pnpm --filter @workspace/api-spec run codegen
```

Expected: orval regenerates `lib/api-zod/src/generated/*` and `lib/api-client-react/src/generated/*` without error, and the trailing `pnpm -w run typecheck:libs` it runs passes.

- [ ] **Step 4: Verify the new fields made it into the generated Zod schema**

```bash
grep -n "voteCount\|totalPrice\|submittedAt\|rules" lib/api-zod/src/generated/*.ts
```

Expected: matches in the Challenge/ChallengeEntry schema definitions. If nothing matches, the codegen step failed silently — re-run Step 3 and check its output for errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add lib/api-spec/openapi.yaml lib/api-zod/src/generated lib/api-client-react/src/generated
git commit -m "feat(api-spec): add rules/voteCount/totalPrice/submittedAt to Challenge schema"
```

---

### Task 2: Extend the Mongoose Challenge model and strip `votedBy` from the list route

**Files:**
- Modify: `lib/db/src/models/challenge.ts`
- Modify: `artifacts/api-server/src/routes/challenges.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ChallengeModel` with the extended schema (including internal-only `votedBy`) — consumed by Task 3 (seed data), Task 4 (reseed), Task 5 (new routes).

- [ ] **Step 1: Rewrite the Mongoose schema**

Replace the full contents of `lib/db/src/models/challenge.ts` with:

```ts
import { Schema, model, type InferSchemaType } from "mongoose";

const entrySchema = new Schema(
  {
    id: { type: String, required: true },
    outfitId: { type: String, required: false },
    productIds: { type: [String], required: true },
    creatorName: { type: String, required: true },
    creatorId: { type: String, required: true },
    voteCount: { type: Number, required: true, default: 0 },
    votedBy: { type: [String], required: true, default: [] },
    totalPrice: { type: Number, required: true },
    submittedAt: { type: String, required: true },
  },
  { _id: false },
);

const challengeSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    prizeText: { type: String, required: true },
    rules: { type: String, required: true },
    endsAt: { type: String, required: true },
    entries: { type: [entrySchema], required: true },
  },
  { versionKey: false },
);

export type ChallengeDoc = InferSchemaType<typeof challengeSchema>;
export const ChallengeModel = model("Challenge", challengeSchema);
```

- [ ] **Step 2: Strip `votedBy` from the existing list route**

In `artifacts/api-server/src/routes/challenges.ts`, change:

```ts
router.get("/challenges", async (_req, res) => {
  const challenges = await ChallengeModel.find().select("-_id").lean();
  res.json(ListChallengesResponse.parse(challenges));
});
```

to:

```ts
router.get("/challenges", async (_req, res) => {
  const challenges = await ChallengeModel.find().select("-_id -entries.votedBy").lean();
  res.json(ListChallengesResponse.parse(challenges));
});
```

- [ ] **Step 3: Typecheck**

```bash
pnpm run typecheck:libs
pnpm --filter api-server run typecheck
```

Expected: both pass. (They will actually fail until Task 3 updates the mock data feeding the seed script's types — if `pnpm run typecheck:libs` fails specifically because of `scripts/src/seed-mongo.ts`, that's expected and already excluded from strict typecheck per its `tsconfig.json` `exclude`; anything else failing here is a real problem to fix before moving on.)

- [ ] **Step 4: Commit**

```bash
git add lib/db/src/models/challenge.ts artifacts/api-server/src/routes/challenges.ts
git commit -m "feat(db): add creatorId/voteCount/votedBy/totalPrice/submittedAt/rules to Challenge model"
```

---

### Task 3: Update `mock-data.ts` types and seed content

**Files:**
- Modify: `artifacts/styleverse/src/data/mock-data.ts`

**Interfaces:**
- Produces: exported `ChallengeEntry` interface (newly named/exported) and updated `Challenge` interface, plus updated `MOCK_CHALLENGES` — consumed by every frontend file that imports `Challenge`/`ChallengeEntry`/`MOCK_CHALLENGES` (Task 4's reseed, and all of Tasks 7–11's components).

- [ ] **Step 1: Replace the `Challenge` interface block**

Find (around line 45):

```ts
export interface Challenge {
  id: string;
  title: string;
  description: string;
  prizeText: string;
  endsAt: string;
  entries: {
    id: string;
    outfitId?: string;
    productIds: string[];
    creatorName: string;
    baseVoteCount: number;
  }[];
}
```

Replace with:

```ts
export interface ChallengeEntry {
  id: string;
  outfitId?: string;
  productIds: string[];
  creatorName: string;
  creatorId: string;
  voteCount: number;
  totalPrice: number;
  submittedAt: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  prizeText: string;
  rules: string;
  endsAt: string;
  entries: ChallengeEntry[];
}
```

- [ ] **Step 2: Replace `MOCK_CHALLENGES`**

Find the `MOCK_CHALLENGES` array (around line 642) and replace it entirely with:

```ts
export const MOCK_CHALLENGES: Challenge[] = [
  {
    id: "c1",
    title: "Outfit Under ₹1500",
    description: "Put together a full cohesive look without breaking the bank. Shoes included!",
    prizeText: "Win ₹5000 Myntra Credit",
    rules: "One entry per person. All items must be currently available on StyleVerse. Judged on cost, cohesion, and creativity — winner announced when the challenge ends.",
    endsAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    entries: [
      {
        id: "e1",
        productIds: ["p1", "p3", "p6"],
        creatorName: "@budget_king",
        creatorId: "seed-budget-king",
        voteCount: 124,
        totalPrice: 2497,
        submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: "e2",
        productIds: ["p2", "p5"],
        creatorName: "@deal_hunter",
        creatorId: "seed-deal-hunter",
        voteCount: 89,
        totalPrice: 2198,
        submittedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ],
  },
  {
    id: "c2",
    title: "Monsoon Ready",
    description: "Stylish but practical outfits for the rainy season. No white pants allowed!",
    prizeText: "Win a Premium Raincoat + ₹2000 Credit",
    rules: "Outfits should be weather-appropriate for monsoon season. No white bottoms. One entry per person.",
    endsAt: new Date(Date.now() + 86400000 * 5).toISOString(),
    entries: [
      {
        id: "e3",
        productIds: ["p4", "p1", "p3"],
        creatorName: "@monsoon_child",
        creatorId: "seed-monsoon-child",
        voteCount: 312,
        totalPrice: 3497,
        submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
  },
];
```

(Prices: p1=599, p2=899, p3=1099, p4=1799, p5=1299, p6=799 — confirmed from the `MOCK_PRODUCTS` entries already in this file. `totalPrice` sums each entry's real product prices.)

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter styleverse run typecheck
```

Expected: passes. If any other file errors on `baseVoteCount` not existing, that's expected — later tasks (7 onward) remove those usages.

- [ ] **Step 4: Commit**

```bash
git add artifacts/styleverse/src/data/mock-data.ts
git commit -m "feat(data): update Challenge/ChallengeEntry mock data for real voting and submissions"
```

---

### Task 4: Reseed MongoDB and verify the live API response

**Files:** none (data operation only)

**Interfaces:** none.

- [ ] **Step 1: Reseed**

```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 && corepack disable >/dev/null 2>&1 && export PATH="$PATH:/home/durga/.nvm/versions/node/v20.9.0/bin"
pnpm --filter @workspace/scripts run seed-mongo
```

Expected output: `seeded 2 challenges` (plus product/hub counts), no errors. This reads `MONGODB_URI` from the environment — if it's only in `.env` and not exported in the shell, run `set -a && source .env && set +a` first.

- [ ] **Step 2: Start the API server and verify the response shape**

```bash
pnpm --filter api-server run dev &
sleep 3
curl -s http://localhost:8080/api/challenges | head -c 2000
```

Expected: JSON containing `"rules"`, `"voteCount"`, `"totalPrice"`, `"submittedAt"`, `"creatorId"` per entry, and **no** `"votedBy"` key anywhere in the output. Stop the server afterward (`kill %1` or `fg` + Ctrl-C).

- [ ] **Step 3: No commit needed** — this task only touches the live database, not the repo.

---

### Task 5: Add submit-entry and vote routes

**Files:**
- Modify: `artifacts/api-server/src/routes/challenges.ts`

**Interfaces:**
- Consumes: `ChallengeModel`, `ProductModel` (from `@workspace/db`).
- Produces: `POST /challenges/:id/entries` (body `{ productIds: string[], creatorName: string, creatorId: string }`, returns the created entry without `votedBy`) and `POST /challenges/:id/entries/:entryId/vote` (body `{ voterId: string }`, returns `{ voteCount: number }`, `404` if challenge/entry missing, `409` if already voted) — consumed by Task 6's frontend fetch wrappers.

- [ ] **Step 1: Add the imports and new routes**

In `artifacts/api-server/src/routes/challenges.ts`, change the top imports from:

```ts
import { Router, type IRouter } from "express";
import { ChallengeModel } from "@workspace/db";
import { ListChallengesResponse } from "@workspace/api-zod";
```

to:

```ts
import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { ChallengeModel, ProductModel } from "@workspace/db";
import { ListChallengesResponse } from "@workspace/api-zod";
```

Then, after the existing `router.get("/challenges", ...)` handler and before `export default router;`, add:

```ts
interface SubmitEntryBody {
  productIds: string[];
  creatorName: string;
  creatorId: string;
}

router.post("/challenges/:id/entries", async (req, res) => {
  const { productIds, creatorName, creatorId } = req.body as SubmitEntryBody;
  if (!Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ error: "productIds must be a non-empty array" });
    return;
  }
  if (!creatorName?.trim()) {
    res.status(400).json({ error: "creatorName is required" });
    return;
  }
  if (!creatorId) {
    res.status(400).json({ error: "creatorId is required" });
    return;
  }

  const products = await ProductModel.find({ id: { $in: productIds } }).lean();
  const totalPrice = productIds.reduce((sum, id) => {
    const product = products.find((p) => p.id === id);
    return sum + (product?.price ?? 0);
  }, 0);

  const entry = {
    id: randomUUID(),
    productIds,
    creatorName: creatorName.trim(),
    creatorId,
    voteCount: 0,
    votedBy: [] as string[],
    totalPrice,
    submittedAt: new Date().toISOString(),
  };

  const challenge = await ChallengeModel.findOneAndUpdate(
    { id: req.params.id },
    { $push: { entries: entry } },
  ).lean();

  if (!challenge) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }

  const { votedBy: _votedBy, ...entryResponse } = entry;
  res.status(201).json(entryResponse);
});

interface VoteEntryBody {
  voterId: string;
}

router.post("/challenges/:id/entries/:entryId/vote", async (req, res) => {
  const { voterId } = req.body as VoteEntryBody;
  if (!voterId) {
    res.status(400).json({ error: "voterId is required" });
    return;
  }

  const updated = await ChallengeModel.findOneAndUpdate(
    {
      id: req.params.id,
      "entries.id": req.params.entryId,
      "entries.votedBy": { $ne: voterId },
    },
    {
      $inc: { "entries.$.voteCount": 1 },
      $addToSet: { "entries.$.votedBy": voterId },
    },
    { new: true },
  ).lean();

  if (!updated) {
    // Either the challenge/entry doesn't exist, or this voter already voted —
    // a second lookup disambiguates which error to return.
    const existing = await ChallengeModel.findOne({ id: req.params.id, "entries.id": req.params.entryId }).lean();
    if (!existing) {
      res.status(404).json({ error: "Challenge or entry not found" });
      return;
    }
    res.status(409).json({ error: "Already voted" });
    return;
  }

  const updatedEntry = updated.entries.find((e) => e.id === req.params.entryId);
  res.json({ voteCount: updatedEntry?.voteCount ?? 0 });
});
```

The vote route's `findOneAndUpdate` filter includes `"entries.votedBy": { $ne: voterId }`, making the existence-check-and-increment a single atomic operation — two concurrent vote requests from the same voter can't both succeed and double-count.

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter api-server run typecheck
```

Expected: passes.

- [ ] **Step 3: Manual verification against the live server**

```bash
pnpm --filter api-server run dev &
sleep 3
curl -s -X POST http://localhost:8080/api/challenges/c1/entries \
  -H "Content-Type: application/json" \
  -d '{"productIds":["p1","p2"],"creatorName":"@test_user","creatorId":"test-user-1"}'
```

Expected: `201` with a JSON entry containing `voteCount: 0`, `totalPrice: 1498` (599+899), no `votedBy` key.

```bash
ENTRY_ID="<paste the id from the previous response>"
curl -s -X POST http://localhost:8080/api/challenges/c1/entries/$ENTRY_ID/vote \
  -H "Content-Type: application/json" -d '{"voterId":"test-user-1"}'
curl -s -X POST http://localhost:8080/api/challenges/c1/entries/$ENTRY_ID/vote \
  -H "Content-Type: application/json" -d '{"voterId":"test-user-1"}'
```

Expected: first call returns `{"voteCount":1}`, second call returns `409 {"error":"Already voted"}`. Stop the server afterward.

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/routes/challenges.ts
git commit -m "feat(api-server): add submit-entry and vote routes for challenges"
```

---

### Task 6: Frontend API layer for submit/vote mutations

**Files:**
- Create: `artifacts/styleverse/src/lib/challenges-api.ts`
- Create: `artifacts/styleverse/src/hooks/use-challenge-actions.ts`

**Interfaces:**
- Consumes: `getListChallengesQueryKey` from `@workspace/api-client-react`.
- Produces: `useSubmitChallengeEntry(challengeId)` and `useVoteChallengeEntry(challengeId)` mutation hooks — consumed by Tasks 9, 10, 11.

- [ ] **Step 1: Write the fetch wrappers**

Create `artifacts/styleverse/src/lib/challenges-api.ts`:

```ts
export async function submitChallengeEntry(
  challengeId: string,
  params: { productIds: string[]; creatorName: string; creatorId: string },
) {
  const res = await fetch(`/api/challenges/${challengeId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Failed to submit entry (${res.status})`);
  return res.json();
}

export async function voteChallengeEntry(challengeId: string, entryId: string, voterId: string): Promise<{ voteCount: number }> {
  const res = await fetch(`/api/challenges/${challengeId}/entries/${entryId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voterId }),
  });
  if (res.status === 409) throw new Error('ALREADY_VOTED');
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Failed to vote (${res.status})`);
  return res.json();
}
```

- [ ] **Step 2: Write the mutation hooks**

Create `artifacts/styleverse/src/hooks/use-challenge-actions.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getListChallengesQueryKey } from '@workspace/api-client-react';
import { submitChallengeEntry, voteChallengeEntry } from '../lib/challenges-api';

export function useSubmitChallengeEntry(challengeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { productIds: string[]; creatorName: string; creatorId: string }) =>
      submitChallengeEntry(challengeId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListChallengesQueryKey() });
    },
  });
}

export function useVoteChallengeEntry(challengeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, voterId }: { entryId: string; voterId: string }) =>
      voteChallengeEntry(challengeId, entryId, voterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListChallengesQueryKey() });
    },
  });
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter styleverse run typecheck
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add artifacts/styleverse/src/lib/challenges-api.ts artifacts/styleverse/src/hooks/use-challenge-actions.ts
git commit -m "feat(styleverse): add submit/vote mutation hooks for challenges"
```

---

### Task 7: Add `useChallenge` and `useVotedEntries` hooks

**Files:**
- Modify: `artifacts/styleverse/src/hooks/use-catalog.ts`
- Create: `artifacts/styleverse/src/hooks/use-voted-entries.ts`

**Interfaces:**
- Produces: `useChallenge(id: string | undefined): { challenge: Challenge | undefined, isLoading: boolean, error: unknown }` and `useVotedEntries(): { hasVoted: (entryId: string) => boolean, markVoted: (entryId: string) => void }` — consumed by Tasks 10 and 11.

- [ ] **Step 1: Add `useChallenge` to `use-catalog.ts`**

Append to `artifacts/styleverse/src/hooks/use-catalog.ts` (after the existing `useChallenges` function):

```ts
export function useChallenge(id: string | undefined) {
  const { challenges, isLoading, error } = useChallenges();
  const challenge = challenges.find((c) => c.id === id);
  return { challenge, isLoading, error };
}
```

- [ ] **Step 2: Write `useVotedEntries`**

`votedBy` is deliberately never sent to the client (server-enforced via the 409 in Task 5), so the UI needs its own lightweight, client-only record of "which entries did *I* click vote on in this browser" purely to drive button state (pink/voted vs gray/not-voted) — it's a UX hint, not the source of truth for the vote count or for enforcement.

Create `artifacts/styleverse/src/hooks/use-voted-entries.ts`:

```ts
import { useState, useCallback } from 'react';

const KEY = 'styleverse_voted_entries';

function loadVoted(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function useVotedEntries() {
  const [voted, setVoted] = useState<Set<string>>(loadVoted);

  const markVoted = useCallback((entryId: string) => {
    setVoted((prev) => {
      if (prev.has(entryId)) return prev;
      const next = new Set(prev).add(entryId);
      localStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const hasVoted = useCallback((entryId: string) => voted.has(entryId), [voted]);

  return { hasVoted, markVoted };
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter styleverse run typecheck
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add artifacts/styleverse/src/hooks/use-catalog.ts artifacts/styleverse/src/hooks/use-voted-entries.ts
git commit -m "feat(styleverse): add useChallenge and useVotedEntries hooks"
```

---

### Task 8: Rewrite the Challenges list page as a card grid

**Files:**
- Modify: `artifacts/styleverse/src/pages/challenges.tsx`
- Modify: `artifacts/styleverse/src/hooks/use-store.ts`

**Interfaces:**
- Consumes: `useChallenges`, `useProducts` (from `use-catalog.ts`); `SubmitLookModal` (Task 9 — this task references it, Task 9 creates it; if executed out of order, stub it temporarily or do Task 9 first).
- Produces: the rewritten `Challenges` page component (default export unchanged) linking to `/challenges/:id` (Task 10).

- [ ] **Step 1: Remove the dead local vote state from `use-store.ts`**

In `artifacts/styleverse/src/hooks/use-store.ts`:

Remove `challengeVotes: Record<string, boolean>; // entryId -> voted` from the `AppState` interface.

Remove `challengeVotes: {}` from `DEFAULT_STATE`.

Remove the entire `voteChallenge` callback:

```ts
  const voteChallenge = useCallback((entryId: string) => {
    const current = loadState();
    current.challengeVotes[entryId] = true;
    saveState({ ...current });
  }, []);

```

Remove `voteChallenge,` from the hook's returned object.

- [ ] **Step 2: Rewrite `challenges.tsx`**

Replace the full contents of `artifacts/styleverse/src/pages/challenges.tsx` with:

```tsx
import { useState } from 'react';
import { Link } from 'wouter';
import { useChallenges, useProducts } from '../hooks/use-catalog';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';
import { SubmitLookModal } from '../components/SubmitLookModal';
import type { Challenge } from '../data/mock-data';

export default function Challenges() {
  const { challenges, isLoading } = useChallenges();
  const { products } = useProducts();
  const [submitChallengeId, setSubmitChallengeId] = useState<string | null>(null);

  const productImage = (productId: string) => products.find((p) => p.id === productId)?.images[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="font-heading font-black text-3xl md:text-4xl uppercase tracking-tight text-[#282C3F] mb-3">
          Fashion Challenges
        </h1>
        <p className="text-gray-500">Compete with your saved looks, vote for your favorites, and win exclusive prizes and StyleVerse badges.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="size-8" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge: Challenge) => {
            const endDate = new Date(challenge.endsAt);
            const isEndingSoon = endDate.getTime() - Date.now() < 86400000;
            const topEntries = [...challenge.entries].sort((a, b) => b.voteCount - a.voteCount).slice(0, 3);
            const extraCount = challenge.entries.length - topEntries.length;

            return (
              <div
                key={challenge.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-transform hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex aspect-[3/4] bg-gray-100 relative">
                  {isEndingSoon && (
                    <span className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full">
                      Ending soon
                    </span>
                  )}
                  {topEntries.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No entries yet</div>
                  ) : (
                    topEntries.map((entry) => (
                      <img
                        key={entry.id}
                        src={productImage(entry.productIds[0])}
                        alt=""
                        className="flex-1 w-full h-full object-contain bg-gray-100 border-l first:border-l-0 border-gray-200"
                      />
                    ))
                  )}
                  {extraCount > 0 && (
                    <span className="absolute bottom-2 right-2 bg-black/55 text-white text-[11px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                      +{extraCount} more
                    </span>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-2.5 flex-1">
                  <h2 className="font-heading font-black text-lg text-[#282C3F] leading-tight">{challenge.title}</h2>
                  <p className="text-xs text-gray-500 min-h-[32px]">{challenge.description}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-orange-50 border border-orange-100 text-orange-700 px-2.5 py-1 rounded-md text-[11px] font-bold">
                      <Trophy className="h-3 w-3" /> {challenge.prizeText}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border font-mono',
                        isEndingSoon ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-100 text-gray-600 border-gray-200',
                      )}
                    >
                      <Clock className="h-3 w-3" /> {formatDistanceToNow(endDate)} left
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-md text-[11px] font-bold">
                      <Users className="h-3 w-3" /> {challenge.entries.length} entries
                    </span>
                  </div>

                  <div className="flex gap-2 mt-auto pt-2">
                    <Link href={`/challenges/${challenge.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full font-bold text-[#FF3F6C] border-[#FF3F6C] hover:bg-pink-50">
                        View Challenge
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="flex-1 font-bold bg-[#FF3F6C] hover:bg-[#d93059] text-white"
                      onClick={() => setSubmitChallengeId(challenge.id)}
                    >
                      Submit Look
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SubmitLookModal challengeId={submitChallengeId} onOpenChange={(open) => !open && setSubmitChallengeId(null)} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter styleverse run typecheck
```

Expected: fails at this point only on the missing `../components/SubmitLookModal` module — that's expected, Task 9 creates it. If any other error appears, fix it before continuing.

- [ ] **Step 4: Commit**

```bash
git add artifacts/styleverse/src/pages/challenges.tsx artifacts/styleverse/src/hooks/use-store.ts
git commit -m "feat(styleverse): rewrite Challenges list page as a card grid with real vote counts"
```

---

### Task 9: Build `SubmitLookModal`

**Files:**
- Create: `artifacts/styleverse/src/components/SubmitLookModal.tsx`

**Interfaces:**
- Consumes: `useIdentity` (`hooks/use-identity.ts`), `useLooks` (`hooks/use-looks.ts`), `useProducts` (`hooks/use-catalog.ts`), `useSubmitChallengeEntry` (`hooks/use-challenge-actions.ts`), `useToast` (`hooks/use-toast.ts`), `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` (`components/ui/dialog.tsx`).
- Produces: `SubmitLookModal({ challengeId: string | null, onOpenChange: (open: boolean) => void })` — consumed by Task 8 (already wired) and Task 10.

- [ ] **Step 1: Write the component**

Create `artifacts/styleverse/src/components/SubmitLookModal.tsx`:

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useIdentity } from '../hooks/use-identity';
import { useLooks } from '../hooks/use-looks';
import { useProducts } from '../hooks/use-catalog';
import { useSubmitChallengeEntry } from '../hooks/use-challenge-actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function SubmitLookModal({
  challengeId,
  onOpenChange,
}: {
  challengeId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const identity = useIdentity();
  const { looks, isLoading: looksLoading } = useLooks(identity?.userId);
  const { products } = useProducts();
  const submitEntry = useSubmitChallengeEntry(challengeId ?? '');
  const { toast } = useToast();
  const [selectedLookId, setSelectedLookId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!challengeId || !identity || !selectedLookId) return;
    const look = looks.find((l) => l.id === selectedLookId);
    if (!look) return;

    submitEntry.mutate(
      { productIds: look.productIds, creatorName: identity.username, creatorId: identity.userId },
      {
        onSuccess: () => {
          toast({ title: 'Look submitted!', description: `${look.name} is now in the running.` });
          setSelectedLookId(null);
          onOpenChange(false);
        },
        onError: (err) => {
          toast({ title: 'Could not submit look', description: (err as Error).message, variant: 'destructive' });
        },
      },
    );
  };

  return (
    <Dialog open={challengeId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit a Look</DialogTitle>
        </DialogHeader>

        {looksLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-6" />
          </div>
        ) : looks.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            You don't have any saved looks yet. Head to the Style Canvas to design one first.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto py-2">
            {looks.map((look) => (
              <button
                key={look.id}
                onClick={() => setSelectedLookId(look.id)}
                className={cn(
                  'border-2 rounded-lg p-2 text-left transition-colors',
                  selectedLookId === look.id ? 'border-[#FF3F6C] bg-pink-50' : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <div className="flex gap-1 mb-2">
                  {look.productIds.slice(0, 2).map((pid) => (
                    <img
                      key={pid}
                      src={products.find((p) => p.id === pid)?.images[0]}
                      alt=""
                      className="flex-1 aspect-square object-cover rounded bg-gray-100"
                    />
                  ))}
                </div>
                <p className="text-xs font-bold text-[#282C3F] truncate">{look.name}</p>
              </button>
            ))}
          </div>
        )}

        <Button
          className="w-full bg-[#FF3F6C] hover:bg-[#d93059] text-white font-bold"
          disabled={!selectedLookId || submitEntry.isPending}
          onClick={handleSubmit}
        >
          {submitEntry.isPending ? 'Submitting...' : 'Submit This Look'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter styleverse run typecheck
```

Expected: passes (this resolves the missing-module error from Task 8, Step 3).

- [ ] **Step 3: Commit**

```bash
git add artifacts/styleverse/src/components/SubmitLookModal.tsx
git commit -m "feat(styleverse): add SubmitLookModal for entering saved looks into challenges"
```

---

### Task 10: Build the Challenge Details page and wire up routing

**Files:**
- Create: `artifacts/styleverse/src/pages/challenge-detail.tsx`
- Modify: `artifacts/styleverse/src/App.tsx`

**Interfaces:**
- Consumes: `useChallenge`, `useProducts` (`use-catalog.ts`), `useIdentity`, `useVoteChallengeEntry`, `useVotedEntries`, `SubmitLookModal` (Task 9), `SubmissionDetailModal` (Task 11 — referenced here, created there; if executing strictly in order, do Task 11 before finishing this task's typecheck, or accept a transient missing-module error same as Task 8/9).
- Produces: the `ChallengeDetail` page mounted at `/challenges/:id`.

- [ ] **Step 1: Write the page**

Create `artifacts/styleverse/src/pages/challenge-detail.tsx`:

```tsx
import { useState } from 'react';
import { useRoute } from 'wouter';
import { useChallenge, useProducts } from '../hooks/use-catalog';
import { useIdentity } from '../hooks/use-identity';
import { useVoteChallengeEntry } from '../hooks/use-challenge-actions';
import { useVotedEntries } from '../hooks/use-voted-entries';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { SubmitLookModal } from '../components/SubmitLookModal';
import { SubmissionDetailModal } from '../components/SubmissionDetailModal';
import { Trophy, Clock, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { ChallengeEntry } from '../data/mock-data';

export default function ChallengeDetail() {
  const [, params] = useRoute('/challenges/:id');
  const { challenge, isLoading } = useChallenge(params?.id);
  const { products } = useProducts();
  const identity = useIdentity();
  const voteEntry = useVoteChallengeEntry(params?.id ?? '');
  const { hasVoted, markVoted } = useVotedEntries();
  const { toast } = useToast();

  const [submitOpen, setSubmitOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ChallengeEntry | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-heading text-2xl font-bold mb-4">Challenge Not Found</h1>
        <p className="text-gray-500">This challenge may have ended or the link is invalid.</p>
      </div>
    );
  }

  const endDate = new Date(challenge.endsAt);
  const isEndingSoon = endDate.getTime() - Date.now() < 86400000;
  const sortedEntries = [...challenge.entries].sort((a, b) => b.voteCount - a.voteCount);

  const handleVote = (entry: ChallengeEntry) => {
    if (!identity || hasVoted(entry.id)) return;
    voteEntry.mutate(
      { entryId: entry.id, voterId: identity.userId },
      {
        onSuccess: () => markVoted(entry.id),
        onError: (err) => {
          if ((err as Error).message === 'ALREADY_VOTED') {
            markVoted(entry.id);
            toast({ title: "You've already voted", description: 'One vote per person for this entry.' });
          } else {
            toast({ title: 'Could not vote', description: (err as Error).message, variant: 'destructive' });
          }
        },
      },
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative rounded-2xl overflow-hidden h-56 flex items-end text-white mb-6">
        <img src="/img/blokecore-hub.jpg" alt="" className="absolute inset-0 w-full h-full object-cover brightness-[0.55]" />
        <div className="relative p-6">
          <h1 className="font-heading font-black text-3xl uppercase tracking-tight mb-2">{challenge.title}</h1>
          <p className="text-sm opacity-90 max-w-xl">{challenge.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <span className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-700 px-3 py-2 rounded-md text-xs font-bold">
          <Trophy className="h-3.5 w-3.5" /> {challenge.prizeText}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold border font-mono',
            isEndingSoon ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-100 text-gray-600 border-gray-200',
          )}
        >
          <Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(endDate)} left
        </span>
        <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 border border-gray-200 px-3 py-2 rounded-md text-xs font-bold">
          <Users className="h-3.5 w-3.5" /> {challenge.entries.length} submissions
        </span>
        <button
          onClick={() => setRulesOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-2 rounded-md text-xs font-bold"
        >
          <FileText className="h-3.5 w-3.5" /> Rules
        </button>
      </div>

      {rulesOpen && <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-sm rounded-lg p-4 mb-6">{challenge.rules}</div>}

      <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 shadow-sm">
        <div>
          <p className="font-bold text-sm text-[#282C3F]">Think your look can win?</p>
          <p className="text-xs text-gray-500 mt-0.5">Submit one of your saved looks from My Looks to enter.</p>
        </div>
        <Button className="bg-[#FF3F6C] hover:bg-[#d93059] text-white font-bold shrink-0" onClick={() => setSubmitOpen(true)}>
          Submit Look
        </Button>
      </div>

      <h2 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-4">All submissions ({challenge.entries.length})</h2>

      {sortedEntries.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed text-gray-400">No submissions yet — be the first!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sortedEntries.map((entry, index) => {
            const voted = hasVoted(entry.id);
            const rankColor = index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : null;

            return (
              <div
                key={entry.id}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="flex aspect-[3/4] bg-gray-100 relative">
                  {rankColor && (
                    <span className={cn('absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center font-black text-xs text-white', rankColor)}>
                      #{index + 1}
                    </span>
                  )}
                  {entry.productIds.slice(0, 2).map((pid) => (
                    <img
                      key={pid}
                      src={products.find((p) => p.id === pid)?.images[0]}
                      alt=""
                      className="flex-1 w-full h-full object-contain border-l first:border-l-0 border-gray-200"
                    />
                  ))}
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm text-[#282C3F] truncate">{entry.creatorName}</p>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2.5">
                    <span className="font-bold text-green-600">₹{entry.totalPrice.toLocaleString('en-IN')}</span>
                    <span>{formatDistanceToNow(new Date(entry.submittedAt), { addSuffix: true })}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(entry);
                      }}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2 rounded-md',
                        voted ? 'bg-pink-100 text-[#FF3F6C]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                      )}
                    >
                      ♥ {entry.voteCount}
                    </button>
                    <button className="flex-1 text-xs font-bold py-2 rounded-md border border-gray-200 text-[#282C3F]">Details</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SubmitLookModal challengeId={submitOpen ? challenge.id : null} onOpenChange={(open) => setSubmitOpen(open)} />
      <SubmissionDetailModal entry={selectedEntry} challengeId={challenge.id} onOpenChange={(open) => !open && setSelectedEntry(null)} />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`**

Add the import (near the other page imports):

```ts
import ChallengeDetail from './pages/challenge-detail';
```

Add the route (right after the existing `/challenges` route):

```tsx
          <Route path="/challenges" component={Challenges} />
          <Route path="/challenges/:id" component={ChallengeDetail} />
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter styleverse run typecheck
```

Expected: fails only on the missing `../components/SubmissionDetailModal` module — expected until Task 11. Any other error must be fixed before continuing.

- [ ] **Step 4: Commit**

```bash
git add artifacts/styleverse/src/pages/challenge-detail.tsx artifacts/styleverse/src/App.tsx
git commit -m "feat(styleverse): add Challenge Details page at /challenges/:id"
```

---

### Task 11: Build `SubmissionDetailModal`

**Files:**
- Create: `artifacts/styleverse/src/components/SubmissionDetailModal.tsx`

**Interfaces:**
- Consumes: `useProducts` (`use-catalog.ts`), `useIdentity`, `useStore` (for `toggleWishlist`), `useVoteChallengeEntry`, `useVotedEntries`, `createVotingRoom` (`lib/voting-api.ts`), `useToast`, `useLocation` (wouter), `Dialog`/`DialogContent`.
- Produces: `SubmissionDetailModal({ entry: ChallengeEntry | null, challengeId: string, onOpenChange: (open: boolean) => void })` — consumed by Task 10 (already wired).

- [ ] **Step 1: Write the component**

Create `artifacts/styleverse/src/components/SubmissionDetailModal.tsx`:

```tsx
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useProducts } from '../hooks/use-catalog';
import { useIdentity } from '../hooks/use-identity';
import { useStore } from '../hooks/use-store';
import { useVoteChallengeEntry } from '../hooks/use-challenge-actions';
import { useVotedEntries } from '../hooks/use-voted-entries';
import { createVotingRoom } from '../lib/voting-api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ChallengeEntry } from '../data/mock-data';

export function SubmissionDetailModal({
  entry,
  challengeId,
  onOpenChange,
}: {
  entry: ChallengeEntry | null;
  challengeId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { products } = useProducts();
  const identity = useIdentity();
  const { toggleWishlist } = useStore();
  const voteEntry = useVoteChallengeEntry(challengeId);
  const { hasVoted, markVoted } = useVotedEntries();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (!entry) return null;

  const items = entry.productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const voted = hasVoted(entry.id);

  const handleVote = () => {
    if (!identity || voted) return;
    voteEntry.mutate(
      { entryId: entry.id, voterId: identity.userId },
      {
        onSuccess: () => markVoted(entry.id),
        onError: (err) => {
          if ((err as Error).message === 'ALREADY_VOTED') {
            markVoted(entry.id);
          } else {
            toast({ title: 'Could not vote', description: (err as Error).message, variant: 'destructive' });
          }
        },
      },
    );
  };

  const handleSave = () => {
    entry.productIds.forEach((id) => toggleWishlist(id));
    toast({ title: 'Saved to wishlist', description: `${entry.productIds.length} item(s) added.` });
  };

  const handleShare = async () => {
    if (!identity) return;
    try {
      const room = await createVotingRoom({
        productIds: entry.productIds,
        creatorLabel: `${entry.creatorName}'s entry`,
        creatorVoterId: identity.userId,
      });
      setLocation(`/vote/${room.id}`);
    } catch (err) {
      toast({ title: 'Could not share', description: (err as Error).message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-0 p-0 overflow-hidden">
        <div className="bg-gray-100 flex items-center justify-center p-5 gap-2 h-[420px] sm:h-auto">
          {items.slice(0, 2).map((item) => (
            <img key={item.id} src={item.images[0]} alt={item.name} className="flex-1 max-h-full object-contain rounded bg-white" />
          ))}
        </div>

        <div className="p-6 flex flex-col">
          <p className="font-black text-sm text-[#282C3F] mb-1">{entry.creatorName}</p>
          <p className="text-xs text-gray-400 mb-4">Submitted {format(new Date(entry.submittedAt), 'MMM d, yyyy')}</p>

          <div className="flex flex-col gap-3 mb-4 flex-1 overflow-y-auto max-h-56">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <img src={item.images[0]} alt="" className="w-11 h-11 rounded-lg object-cover bg-gray-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-extrabold uppercase text-gray-400">{item.brand}</p>
                  <p className="text-xs font-semibold text-[#282C3F] truncate">{item.name}</p>
                </div>
                <p className="text-xs font-extrabold text-[#282C3F]">₹{item.price.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-dashed pt-3 mb-4">
            <span className="text-xs font-bold text-gray-500">Total outfit cost</span>
            <span className="text-lg font-black text-green-600">₹{entry.totalPrice.toLocaleString('en-IN')}</span>
          </div>

          <p className="text-xs font-bold text-gray-500 mb-4">♥ {entry.voteCount} votes</p>

          <div className="flex gap-2 mt-auto">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleSave}>
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn('flex-1 border-[#FF3F6C] text-[#FF3F6C]', voted && 'bg-pink-50')}
              disabled={voted}
              onClick={handleVote}
            >
              {voted ? 'Voted' : 'Vote'}
            </Button>
            <Button size="sm" className="flex-1 bg-[#FF3F6C] hover:bg-[#d93059] text-white" onClick={handleShare}>
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter styleverse run typecheck
```

Expected: passes (resolves the missing-module error from Task 10, Step 3).

- [ ] **Step 3: Commit**

```bash
git add artifacts/styleverse/src/components/SubmissionDetailModal.tsx
git commit -m "feat(styleverse): add SubmissionDetailModal with itemized products, vote, save, and share"
```

---

### Task 12: Full workspace verification

**Files:** none

**Interfaces:** none.

- [ ] **Step 1: Full typecheck**

```bash
pnpm run typecheck
```

Expected: passes with zero errors across `lib/*`, `api-server`, `styleverse`, and `scripts`.

- [ ] **Step 2: Manual end-to-end pass**

Use the `run` skill (or `./run.sh`) to launch the app, then in the browser:
1. Go to `/challenges` — confirm the card grid renders with real product images in the preview strip (not cropped), prize/time/entries pills, and the "Ending soon" badge on the challenge ending within 24h.
2. Click "View Challenge" — confirm `/challenges/:id` loads the banner, rules toggle, submit bar, and the entries grid with rank badges on the top 3.
3. Click "Submit Look" (from either the card or the detail page) — pick a saved look (create one via Style Canvas first if none exist) — confirm a toast on success and the new entry appears in the grid after the modal closes.
4. Click an entry card to open the submission detail modal — confirm itemized products with brand/price, total cost, and working Vote/Save/Share buttons.
5. Vote on an entry, then refresh the page — confirm the vote count persisted (it came from the server, not local state).
6. Try voting on the same entry again — confirm the button shows "Voted"/pink state and a second real vote attempt is rejected (network tab shows `409` if you force it).

- [ ] **Step 3: Final commit (if any fixups were needed during manual verification)**

```bash
git add -A
git commit -m "fix(styleverse): address issues found in end-to-end verification"
```

(Skip this step entirely if no fixes were needed.)
