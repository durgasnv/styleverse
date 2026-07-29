# Real-Time Group Voting on a Shared Look

## What it does

Any look — saved in "My Looks" or still a draft on the Style Canvas — can be shared as a **voting room**: a link that opens a live page where anyone can react to the outfit with 🔥 Fire, 👍 Yes, or 👎 Nah, and leave a short comment explaining why. Every reaction and comment updates instantly for everyone watching the room, with no page refresh, plus a live "N watching" count. First-time visitors confirm they're 18+ before the room's content is shown — see [Age gate](#age-gate) below.

This exists to replace the way outfit feedback actually happens today — scattered across WhatsApp/Instagram DMs — with something native to StyleVerse. It's a deliberate choice to build **one feature that's genuinely real and live**, rather than adding more surface-level, client-only mockups.

### User flow

1. From **My Looks**, click **Vote** on a saved look — or from the **Style Canvas**, click **Share for Voting** on an in-progress draft (it doesn't need to be saved first).
2. The app creates a room and redirects to `/vote/:roomId`.
3. Share that URL. Anyone who opens it sees the outfit and can tap a reaction.
4. The creator's own page is view-only — see [Self-voting prevention](#self-voting-prevention) below.
5. Reloading the page restores your last reaction and the current tally from the server (not just from memory).

## How it's built

### Data model

`lib/db/src/models/voting-room.ts` — a Mongoose collection, `VotingRoom`:

| field | purpose |
|---|---|
| `id` | public room id (`crypto.randomUUID()`), used in the URL |
| `productIds` | the items in the shared look |
| `outfitId` | optional link back to a saved "My Looks" entry |
| `creatorLabel` | display name shown on the voting page |
| `creatorVoterId` | the id of whoever created the room — used to block self-votes |
| `voters` | array of `{ voterId, voterName?, reaction, comment?, updatedAt }`, one entry per person who has voted |

Tallies are **computed on read from the `voters` array**, not stored as separate counters. This avoids increment/decrement drift — the array is the single source of truth, and `computeTally()` (`artifacts/api-server/src/lib/voting-tally.ts`) just counts it. Comments are derived the same way — see [Feedback comments](#feedback-comments) below.

### Identity

Voter identity is the same real, server-backed user record used everywhere else in the app (`identity.userId` / `identity.username` from [Lightweight User Identity](1200_lightweight-auth.md)), not a throwaway anonymous id. This id is what ties a browser to one vote in the `voters` array — voting again with the same id updates your existing entry instead of adding a duplicate.

### REST endpoints (`artifacts/api-server/src/routes/voting.ts`)

- `POST /api/voting/rooms` — creates a room. Requires `productIds` and `creatorVoterId`.
- `GET /api/voting/rooms/:id?voterId=` — returns the room, the computed tally, total voter count, the extracted `comments` list, the caller's own current reaction (`myReaction`) and comment (`myComment`), and whether the caller is the room's creator (`isCreator`).

These are hand-rolled Express routes, not generated from the OpenAPI spec — consistent with the existing AI Companion route, since this is a fast-moving feature outside the main product catalog's codegen pipeline.

### Real-time layer (Socket.io)

`artifacts/api-server/src/lib/socket.ts` attaches a Socket.io server to the same HTTP server as the Express app (`api-server/src/index.ts` was refactored from `app.listen()` to `http.createServer(app)` + `attachSocketServer(httpServer)` so both share one port). It's mounted at `/api/socket.io` — a non-default path — specifically so its traffic passes through the existing `/api`-prefixed proxy (dev) and router (production), rather than needing its own separate route.

Events:
- `voting:join { roomId }` — client joins a Socket.io room named after the voting room id; server broadcasts the new presence count to everyone in it.
- `voting:cast { roomId, voterId, voterName?, reaction, comment? }`, with an ack callback — server looks up or inserts the voter's entry in Mongo (running the comment through the [profanity filter](#profanity-filtering) first), then broadcasts the fresh tally and comment list to the whole room, and acks the caller with `{ ok, commentRejected? }`.
- `disconnecting` — server rebroadcasts the decremented presence count.

The frontend (`artifacts/styleverse/src/pages/vote-room.tsx`) does one REST fetch on load for the initial state (so the page works even before the socket connects), then opens a socket connection for live updates, and disconnects it on unmount.

### Self-voting prevention

Early testing surfaced that a room's creator could vote on their own look — undermining the point of collecting outside opinions. The fix has two layers:

- **Enforced server-side** (the layer that actually matters): the `voting:cast` socket handler looks up the room's `creatorVoterId` before recording any vote and silently drops the cast if it matches the caller's own `voterId`. This can't be bypassed by editing the frontend or emitting the socket event directly.
- **Reflected client-side** for UX: `GET /api/voting/rooms/:id` returns `isCreator`, and `vote-room.tsx` disables the three reaction buttons and shows "This is your look — share the link so others can react" when true.

### Feedback comments

Panel feedback on the voting room was that a bare reaction doesn't tell the look's creator *why* someone voted that way. Each voter can now attach a short comment (280 chars) to their reaction:

- Picking a reaction enables a comment box; hitting **Post** sends `{ reaction, comment }` together over the same `voting:cast` event, so a comment is always attached to a reaction rather than existing on its own.
- `extractComments()` (`artifacts/api-server/src/lib/voting-tally.ts`) filters the `voters` array down to entries with a non-empty comment, sorted newest-first, defaulting a missing `voterName` to "Anonymous".
- `vote-room.tsx` renders a live "Feedback" panel below the reaction tally — voter name, reaction emoji, comment text, and a relative timestamp — that updates for every watcher as new comments come in over the socket.
- Reloading the page restores your own draft comment (`myComment` from the REST fetch), the same way it already restored your last reaction.

### Profanity filtering

Comments are free text from anonymous-to-each-other strangers, so they're checked before being stored or shown to anyone:

- `artifacts/api-server/src/lib/profanity-filter.ts` — a blocklist match, checked both word-by-word and against a separator-stripped version of the text (so spaced-out evasions like "f u c k" or "f.u.c.k" are still caught).
- **Enforced server-side only** (same trust model as self-voting prevention): a flagged comment is dropped from the Mongo write entirely — the voter's reaction still registers, and any previously-posted clean comment from that voter is left untouched rather than being overwritten with nothing.
- The client learns about the rejection via the `voting:cast` ack (`commentRejected: true`) and shows "That comment wasn't posted — please keep feedback respectful." under the textarea. There's no new socket event for this; the existing ack callback carries it.

### Age gate

The voting room is the one page in StyleVerse that's fully public and link-shareable without going through the app's normal identity flow first, and it can show an AI-generated photo of a person plus comments from strangers — the panel flagged this as needing 18+ handling.

- `artifacts/styleverse/src/components/AgeGate.tsx` — a non-dismissable overlay on `/vote/:roomId`, visually matching `IdentityGate`'s pattern, asking the visitor to confirm they're 18 or older before the room's content is revealed.
- Confirmation is cached in `localStorage` (`styleverse_age_ack`) so a given browser is only asked once, ever, across all voting rooms.
- Declining routes back to the home page instead of revealing the look.
- This is a client-side confirmation only, same trust boundary as the rest of the app's self-reported identity (see [Lightweight User Identity](1200_lightweight-auth.md)) — there's no way to verify the answer is true. Acceptable for a hackathon demo; real age verification would need a third-party ID check.

### What's deliberately not built (yet)

- No room list/lobby, no expiry/cleanup of old rooms, no rate-limiting on casting reactions or comments (the profanity filter above covers content moderation, but nothing stops rapid repeated casts).
- No real age verification — the age gate is a self-reported confirmation, not an ID check (see [Age gate](#age-gate) above).
- Whether Replit's production router forwards WebSocket upgrades for `/api/socket.io` is unverified. If it doesn't, Socket.io automatically falls back to HTTP long-polling — the feature still works, just with slightly higher latency instead of true push updates.
