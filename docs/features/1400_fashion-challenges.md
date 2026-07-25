# Fashion Challenges: Real Submissions and Real Voting

## What it does

Fashion Challenges went from a page that *looked* interactive but wasn't, to one backed entirely by the server. Concretely, three things that used to be fake are now real:

- **Voting used to be a `localStorage` boolean** (`challengeVotes` in `use-store.ts`) — editable via devtools, never aggregated across users, and reset the moment you cleared site data. Votes are now stored on the `Challenge` document in Mongo and enforced server-side, one vote per real user (via the [identity system](1200_lightweight-auth.md)) per entry.
- **"Submit Your Look" was a dead button** — no `onClick` at all. It now opens a modal to pick one of your saved looks and actually submits it as a challenge entry, priced from live product data.
- **Entry thumbnails were a hardcoded ternary** (`entry.productIds[0] === 'p1' ? '...' : '...'`) instead of real product images. Every image shown now resolves through the real product catalog.

The page structure changed too: what was a flat list of challenges with a small inline entry grid is now a card-based list (`/challenges`) linking to a dedicated details page per challenge (`/challenges/:id`), with a full-size modal per submission.

### User flow

1. `/challenges` shows a card per challenge: prize, time left, entry count, and a preview strip of the top 3 entries' product images.
2. **View Challenge** opens `/challenges/:id` — banner, a click-to-expand rules popover, and the full entry grid ranked by vote count (top 3 get a colored rank badge).
3. **Submit Look** (from either the card or the details page) opens a modal listing your saved looks from My Looks; picking one and confirming submits it as a new entry, priced server-side from the products' current prices.
4. Clicking an entry opens its detail modal: itemized products with brand/name/price, total cost, vote count, and Save (adds every item to your wishlist) / Vote / Share (opens a real-time voting room for that entry, reusing the existing [voting feature](1000_realtime-voting.md)) actions.
5. Voting is one-per-person-per-entry, enforced by the server regardless of what the UI shows — see [Vote enforcement](#vote-enforcement) below.

## How it's built

### Data model

`lib/db/src/models/challenge.ts` — `Challenge` gained a required `rules: string`. Each `ChallengeEntry` gained:

| field | purpose |
|---|---|
| `creatorId` | the submitter's real user id (from identity), not just a display name |
| `voteCount` | server-authoritative vote total, replacing the old hardcoded `baseVoteCount` |
| `votedBy` | user ids who've voted on this entry; stripped from every API response (`.select("-entries.votedBy")`) — it's enforcement state, not client data |
| `totalPrice` | computed server-side at submission time from live `Product` prices, never trusted from the client |
| `submittedAt` | real ISO timestamp, replacing hardcoded relative-time mock text |

### API (`artifacts/api-server/src/routes/challenges.ts`)

- `GET /challenges` — existing endpoint, extended schema. Hardened to `safeParse` each challenge document individually and skip/log any that fail validation, so one legacy or malformed document can't 500 the whole list.
- `POST /challenges/:id/entries` — new. Looks up every submitted product id in the real catalog; rejects with 400 if any don't exist (rather than silently letting a bad id contribute ₹0 to the total), sums the rest into `totalPrice`, and appends the entry.
- `POST /challenges/:id/entries/:entryId/vote` — new. Atomically increments `voteCount` and adds the voter to `votedBy`, scoped to the *specific entry* via `$elemMatch` + `arrayFilters` (see below). Returns 409 if that user already voted on that entry.

`GET /challenges/:id` was deliberately **not** built — at this challenge count, the list endpoint already returns full entries for every challenge, so the details page reuses that same query and filters client-side (`useChallenge(id)` in `use-catalog.ts`). A second endpoint would have bought nothing.

### Frontend

- `pages/challenges.tsx` — rewritten as a card grid.
- `pages/challenge-detail.tsx` — new, routed at `/challenges/:id` (added in `App.tsx`).
- `components/SubmitLookModal.tsx` — new; lists `useLooks(identity.userId)`, submits via `useSubmitChallengeEntry`.
- `components/SubmissionDetailModal.tsx` — new; itemized breakdown, Save/Vote/Share.
- `hooks/use-challenge-actions.ts` — `useSubmitChallengeEntry`/`useVoteChallengeEntry`, hand-rolled `useMutation` hooks (not OpenAPI-generated — same precedent as the voting and looks mutations) that invalidate the challenges list query on success.
- `hooks/use-voted-entries.ts` — a client-side "have I voted on this" hint backed by `localStorage`, used only to gray out a vote button before a round-trip. It is explicitly not the enforcement mechanism — the server's `votedBy` check is — so if this hint is ever wrong (e.g. same person on a different browser), the worst case is a harmless 409 that gets caught and treated as "already voted" anyway.

### Vote enforcement

The first version of the vote filter checked `{ "entries.id": entryId, "entries.votedBy": { $ne: voterId } }` as two separate dot-path conditions. In a multi-entry array, Mongo can satisfy each condition against a *different* array element — so a user who'd already voted on entry A could still trigger a false negative (or positive) when voting on entry B in the same challenge, depending on array contents. The fix scopes both conditions to the same array element with `$elemMatch` in the query filter and `arrayFilters` in the update, so a vote is checked and applied atomically against one specific entry, not "some entry in this challenge." This was caught in review and re-verified with a live regression check: the same voter can vote on a different entry in the same challenge (200), but not the same entry twice (409).

### What changed in existing pages

- **`use-store.ts`**: `challengeVotes` (state) and `voteChallenge` (action) were deleted outright — nothing reads them anymore, so they weren't left behind as dead code.
- **`pages/challenges.tsx`**: fully rewritten; no longer renders entries inline, links to the new details page instead.

## What's deliberately not built

- **Comments on submissions** — the old mockup's comment count was decorative. Dropped entirely rather than shipped as another fake number.
- **Automated tests** — no test infra exists anywhere in this repo yet. Verified manually: seeded live Mongo, then exercised submit → persists → vote → duplicate vote rejected (409) → cross-entry vote scoping → invalid product id rejected (400) against a running `api-server`, via curl.
- Vote enforcement assumes the [identity system](1200_lightweight-auth.md)'s known limitation still applies: a determined user can reset their `localStorage` identity and vote again as a "new" user. Acceptable for a hackathon demo; would need real auth to close.
