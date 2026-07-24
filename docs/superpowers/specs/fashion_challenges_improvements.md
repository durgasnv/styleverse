# Fashion Challenges rework — design

Date: 2026-07-24

## Problem

The current Challenges page (`pages/challenges.tsx`) has real challenge data (wired to Mongo via `useChallenges()`) but everything a user *does* on the page is fake or broken:

- `voteChallenge` (`use-store.ts`) only flips a boolean in `localStorage` — no server persistence, no cross-user aggregation, editable via devtools.
- Entry thumbnails are resolved via a hardcoded ternary (`entry.productIds[0] === 'p1' ? '...' : '...'`) instead of real product images.
- "Submit Your Look" has no `onClick` — dead button.
- The layout is a flat list of challenges each showing a small entry grid inline; no dedicated page per challenge, no detail view per submission.

## Scope

This is the first of two sequential builds (see companion spec for "Find better alternatives" in `companion.tsx`, done separately afterward). In scope:

1. Card-based Challenges list page.
2. Dedicated Challenge Details page per challenge.
3. Submission detail modal per entry.
4. Real, server-persisted voting (one vote per real user).
5. Real submission flow (pick a saved look from My Looks, submit as an entry).
6. A `rules` field on Challenge, shown in a rules popover.

Out of scope (explicitly deferred, not faked):
- Commenting on submissions — the mockup's comment count is decorative in current designs; **dropped entirely** rather than shipped as a fake number.
- Any new auth work — this build reuses the identity system that already exists (`use-identity.ts`, `/api/users/identify`), which turned out to already be built (superseding an earlier note that auth didn't exist yet).
- Automated tests — no test infra exists anywhere in this repo yet; verification is manual (via the `run` skill), consistent with how the rest of the codebase has shipped so far.

## Data model changes

`Challenge` (`api-server/src/models/challenge.ts`, `styleverse/src/data/mock-data.ts`, `lib/api-spec/openapi.yaml`):

```ts
interface Challenge {
  id: string;
  title: string;
  description: string;
  prizeText: string;
  rules: string;        // NEW
  endsAt: string;
  entries: ChallengeEntry[];
}

interface ChallengeEntry {
  id: string;
  outfitId?: string;
  productIds: string[];
  creatorName: string;
  creatorId: string;     // NEW — identity.userId of the submitter
  voteCount: number;     // NEW — replaces baseVoteCount, server-authoritative
  votedBy: string[];     // NEW — userIds who've voted; never sent to the client in list/detail responses
  totalPrice: number;    // NEW — computed server-side at submission time from live product prices
  submittedAt: string;   // NEW — ISO date, replaces the hardcoded "2d ago" mock text
}
```

`votedBy` is stripped from API responses (mirroring the existing `.select("-_id")` pattern in `challenges.ts`) — it's server-only state for vote enforcement, not something the client needs.

## API endpoints (`api-server/src/routes/challenges.ts`)

- `GET /challenges` — existing, unchanged.
- `GET /challenges/:id` — NEW. Single challenge with entries, `votedBy` stripped.
- `POST /challenges/:id/entries` — NEW. Body `{ productIds: string[], creatorName: string, creatorId: string }`. Looks up each product's current price from the `Product` collection to compute `totalPrice` server-side (never trusts a client-sent total). Appends the new entry, returns it.
- `POST /challenges/:id/entries/:entryId/vote` — NEW. Body `{ voterId: string }`. If `voterId` is already in that entry's `votedBy`, returns 409. Otherwise atomically `$inc`s `voteCount` and `$addToSet`s into `votedBy`, returns the updated `voteCount`.

All three follow the existing OpenAPI-first pattern: schemas added to `lib/api-spec/openapi.yaml`, codegen run, responses validated through the generated Zod schemas server-side (same as the current `GET /challenges` handler).

## Frontend

**Routing** (`App.tsx`): add `<Route path="/challenges/:id" component={ChallengeDetail} />`. Submission detail is a modal (component state), not a route — matches the approved mockup.

**API client split** (deliberate inconsistency, matching existing precedent):
- `GET /challenges` and `GET /challenges/:id` go through the generated OpenAPI client (`useListChallenges`, new `useGetChallenge`), same as today.
- The two mutations (`POST .../entries`, `POST .../vote`) are hand-written fetch wrappers in a new `lib/challenges-api.ts`, plus mutation hooks in a new `hooks/use-challenge-actions.ts` using `useMutation` + `queryClient.invalidateQueries`. This mirrors the existing `lib/looks-api.ts` / `hooks/use-looks.ts` pattern used for looks and voting-room mutations, rather than re-running the OpenAPI codegen pipeline (which needs the Node 24 / pinned-pnpm dance documented in the backend migration notes) for two endpoints.

**Components**:
- `pages/challenges.tsx` — rewritten to the approved card grid: preview strip (up to 3 real product images via `object-fit: contain` on a fixed-aspect box, so images aren't cropped), prize/time/entries pills, "View Challenge" + "Submit Look" CTAs. Links to `/challenges/:id`.
- `pages/challenge-detail.tsx` (NEW) — banner header (uses a hub image as a stand-in banner since challenges don't have their own banner art), prize/time/entries/rules pills (rules shown in a click-to-expand popover), submit bar, responsive entry grid (rank badge on top 3, price, vote button, "Details" button).
- `components/SubmitLookModal.tsx` (NEW) — lists the current user's saved looks (`useLooks(identity.userId)`, already exists from the Canvas/My Looks feature) to pick from; on confirm, calls the submit-entry mutation with the look's `productIds`.
- `components/SubmissionDetailModal.tsx` (NEW) — larger preview, itemized products (brand/name/price, resolved via `useProducts()`), total price, creator info, vote count, Save/Vote/Share actions.
  - "Save" adds all of the entry's `productIds` to the viewer's wishlist via the existing `toggleWishlist` (`use-store.ts`) — no new mechanism, just applied per-product to the whole entry.
  - "Share" reuses the existing `createVotingRoom` flow (`lib/voting-api.ts`, already used in `my-looks.tsx`'s `handleShareForVoting`) with the entry's `productIds` and `creatorName` as `creatorLabel`, navigating to `/vote/:roomId` — identical mechanism, different entry point.

**Error handling**: vote 409 → toast, count doesn't change locally; submit failure → inline error text in `SubmitLookModal`; list/detail queries use the existing `Spinner` loading pattern already used across the app (`Challenges`, `MyLooks`, etc.).

## Testing

No automated test infra exists in this repo. Verification is manual: launch the app via the `run` skill, submit a look to a challenge, vote on an entry, refresh to confirm the vote and submission persisted server-side (not just in local state), and confirm a second vote from the same identity is rejected.
