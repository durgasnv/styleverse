# Lightweight User Identity & Saved Looks

## What it does

Every visitor is prompted once, on first visit, for a display name — no password, no email, no OAuth. That name becomes their identity across the app: it's what shows up as the creator of a shared voting room, what "My Looks" saves are attributed to, and what appears on the Profile page.

This replaces two things that were previously fake:
- **Anonymous voting**: reactions in the [real-time voting feature](1000_realtime-voting.md) used to be tied to a random `localStorage` UUID with no name behind it. They're now tied to the same real user record used everywhere else.
- **`localStorage`-only "My Looks"**: saved looks used to live entirely in the browser and vanish if you cleared site data or switched devices. They're now a real Mongo collection, attributed to a real user id, fetched from the server.

### User flow

1. First visit to the app: a modal ("Welcome to StyleVerse") asks for a display name. It can't be dismissed without entering one — the whole point of the app is designing/voting/sharing looks, so there's no meaningful "skip" state.
2. That name is sent to the backend, which returns a stable user id (creating the user record if the name is new, or returning the existing one if you type the same name again).
3. The id + name pair is cached in `localStorage` so you're not re-prompted on future visits.
4. From then on, saving a look in Canvas, sharing a look for voting, and the Profile page all use this real identity.

## How it's built

### Backend

`lib/db/src/models/user.ts` — a minimal `User` collection: `{ id, username, createdAt }`, with `username` unique.

`artifacts/api-server/src/routes/users.ts` — `POST /api/users/identify`:
- Looks up the user by `username`. If found, returns it as-is (so re-entering the same name is idempotent and always resolves to the same id).
- If not found, creates a new user with `crypto.randomUUID()` as the id.
- Handles the race where two first-time requests for the same brand-new username both pass the "not found" check and both try to `create()` — Mongo's unique index throws a duplicate-key error (code `11000`) on the loser, which is caught and turned into a normal lookup instead of a 500.

`lib/db/src/models/look.ts` — a `Look` collection: `{ id, userId, name, productIds, companionScore?, createdAt }`.

`artifacts/api-server/src/routes/looks.ts` — ownership-scoped REST:
- `POST /api/looks` — create, requires `userId`.
- `GET /api/looks?userId=` — list only that user's looks.
- `DELETE /api/looks/:id?userId=` — deletes only if the `userId` in the query matches the look's owner; otherwise 404 (verified directly: deleting with the wrong `userId` leaves the look untouched and returns 404, rather than either silently succeeding or leaking whether the look exists).

Both routes are hand-rolled, not OpenAPI-generated — consistent with the voting and companion routes, for the same reason: fast-moving feature, no need for the full codegen pipeline.

### Frontend

`artifacts/styleverse/src/hooks/use-identity.ts` — the identity store. Structurally identical to `use-store.ts`'s pattern (module-level cache + a subscriber list + `emit()` on change), so every component using `useIdentity()` re-renders the moment `identify()` resolves, without prop drilling or a context provider.

One subtlety worth calling out because it caused a real bug during development: the backend's `/api/users/identify` response is `{ id, username }` (matching every other model's field-naming convention in this codebase — `id`, not `userId`). `identify()` explicitly maps `data.id → userId` when building the `Identity` object it caches. Relying on a blind `as Identity` cast here previously produced an object shaped `{id, username}` that silently had `identity.userId === undefined` everywhere it was read — the modal still closed successfully (the object itself was truthy), but every downstream `userId` was `undefined`, and saving a look failed with a "userId is required" 400 from the backend. The fix is the explicit field mapping now in the code; the lesson is that a type cast on a `fetch().json()` result doesn't validate anything at runtme, so any field-name mismatch between client and server fails silently until something downstream needs that specific field.

`artifacts/styleverse/src/components/IdentityGate.tsx` — the onboarding modal itself: a plain fixed-position overlay (not a Radix `Dialog`, deliberately — a `Dialog` always renders a close button, and this modal is meant to be non-dismissable until a name is entered). It renders `null` once `useIdentity()` is non-null, and is mounted as a sibling to the router in `App.tsx` so it overlays on top of whatever page happened to load first, rather than blocking the route tree from rendering underneath it.

`artifacts/styleverse/src/hooks/use-looks.ts` — `useLooks(userId)`, `useSaveLook(userId)`, `useDeleteLook(userId)`, built directly on `@tanstack/react-query`'s `useQuery`/`useMutation` (used directly here, not through the generated `@workspace/api-client-react` hooks, since Looks isn't part of the OpenAPI-driven catalog surface). Queries are `enabled: !!userId`, so a component renders correctly even before the identity modal resolves — it just doesn't fetch anything yet.

`artifacts/styleverse/src/lib/looks-api.ts` — plain `fetch` wrappers (`createLook`, `fetchLooks`, `deleteLook`), same style as `voting-api.ts`.

### What changed in existing pages

- **`canvas.tsx`**: `handleSaveLook` went from a synchronous local-state write to an async `saveLook.mutateAsync(...)` call against the backend; the "Share for Voting" flow now sends the real `identity.userId` as the room's `creatorVoterId` instead of an anonymous id.
- **`my-looks.tsx`**: fully rewritten to fetch from `useLooks(identity?.userId)` instead of reading `state.myLooks` from local storage; delete now calls the backend instead of mutating local state.
- **`companion.tsx`**: the `?lookId=` deep link (used when scoring a previously-saved look) now resolves against the fetched `looks` array instead of local state.
- **`vote-room.tsx`**: casts and creator-attribution now use `identity.userId` instead of the retired anonymous voter id.
- **`use-store.ts`**: `myLooks`, `saveLook`, and `removeLook` were removed entirely — nothing reads them anymore, so they were deleted rather than left as dead code.
- **`profile.tsx`**: shows the real `identity.username` instead of the hardcoded "StyleVerse User" placeholder.

### What's deliberately not built

- No password, no session expiry, no way to "log out" and re-identify as someone else on the same browser (the only way to change identity is to clear the `styleverse_identity` localStorage key).
- No verification that a username actually belongs to the person typing it — anyone can type any existing username and immediately act as that user, since there's no password gate. Acceptable for a hackathon demo; would need real auth to close this gap.
- [Fashion Challenges](1400_fashion-challenges.md) (submissions, challenge-entry voting) now uses this same identity system for real, server-enforced voting — that gap has since been closed.
