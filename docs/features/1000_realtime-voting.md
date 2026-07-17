# Real-Time Group Voting on a Shared Look

## What it does

Any look — saved in "My Looks" or still a draft on the Style Canvas — can be shared as a **voting room**: a link that opens a live page where anyone can react to the outfit with 🔥 Fire, 👍 Yes, or 👎 Nah. Every reaction updates instantly for everyone watching the room, with no page refresh, plus a live "N watching" count.

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
| `creatorVoterId` | the anonymous id of whoever created the room — used to block self-votes |
| `voters` | array of `{ voterId, reaction, updatedAt }`, one entry per person who has voted |

Tallies are **computed on read from the `voters` array**, not stored as separate counters. This avoids increment/decrement drift — the array is the single source of truth, and `computeTally()` (`artifacts/api-server/src/lib/voting-tally.ts`) just counts it.

### Anonymous identity

There's no login system yet (that's a separate milestone). Each browser gets a random id via `crypto.randomUUID()` on first visit, persisted in `localStorage` (`artifacts/styleverse/src/hooks/use-voter-id.ts`). This id is what ties a browser to one vote in the `voters` array — voting again with the same id updates your existing entry instead of adding a duplicate.

### REST endpoints (`artifacts/api-server/src/routes/voting.ts`)

- `POST /api/voting/rooms` — creates a room. Requires `productIds` and `creatorVoterId`.
- `GET /api/voting/rooms/:id?voterId=` — returns the room, the computed tally, total voter count, the caller's own current reaction (`myReaction`), and whether the caller is the room's creator (`isCreator`).

These are hand-rolled Express routes, not generated from the OpenAPI spec — consistent with the existing AI Companion route, since this is a fast-moving feature outside the main product catalog's codegen pipeline.

### Real-time layer (Socket.io)

`artifacts/api-server/src/lib/socket.ts` attaches a Socket.io server to the same HTTP server as the Express app (`api-server/src/index.ts` was refactored from `app.listen()` to `http.createServer(app)` + `attachSocketServer(httpServer)` so both share one port). It's mounted at `/api/socket.io` — a non-default path — specifically so its traffic passes through the existing `/api`-prefixed proxy (dev) and router (production), rather than needing its own separate route.

Events:
- `voting:join { roomId }` — client joins a Socket.io room named after the voting room id; server broadcasts the new presence count to everyone in it.
- `voting:cast { roomId, voterId, reaction }` — server looks up or inserts the voter's entry in Mongo, then broadcasts the fresh tally to the whole room.
- `disconnecting` — server rebroadcasts the decremented presence count.

The frontend (`artifacts/styleverse/src/pages/vote-room.tsx`) does one REST fetch on load for the initial state (so the page works even before the socket connects), then opens a socket connection for live updates, and disconnects it on unmount.

### Self-voting prevention

Early testing surfaced that a room's creator could vote on their own look — undermining the point of collecting outside opinions. The fix has two layers:

- **Enforced server-side** (the layer that actually matters): the `voting:cast` socket handler looks up the room's `creatorVoterId` before recording any vote and silently drops the cast if it matches the caller's own `voterId`. This can't be bypassed by editing the frontend or emitting the socket event directly.
- **Reflected client-side** for UX: `GET /api/voting/rooms/:id` returns `isCreator`, and `vote-room.tsx` disables the three reaction buttons and shows "This is your look — share the link so others can react" when true.

### What's deliberately not built (yet)

- No room list/lobby, no expiry/cleanup of old rooms, no moderation or rate-limiting.
- No real auth — voter identity is a `localStorage` id, so it doesn't survive clearing browser data or switching devices, and a determined user could reset it to vote again. Acceptable for a hackathon demo; would need real accounts to close this gap properly.
- Whether Replit's production router forwards WebSocket upgrades for `/api/socket.io` is unverified. If it doesn't, Socket.io automatically falls back to HTTP long-polling — the feature still works, just with slightly higher latency instead of true push updates.
