# StyleVerse — Implementation Plan (2026-07-14 → 2026-07-21)

Myntra Hackathon 2026 submission deadline: **2026-07-21**. This plan covers the remaining work after the Mongo/API migration and frontend wiring completed on 2026-07-14.

## Day 1-2 (Jul 15-16): Real-time voting differentiator

The chosen "one deep feature" — real-time group voting/reactions on a shared look — is the main differentiator vs. other teams' submissions.

- Add a `VotingRoom` Mongo model (room id, look/outfit reference, participant list, live vote tally) in `lib/db/src/models/`
- Add Socket.io to `artifacts/api-server` (join room, cast vote, broadcast live tally)
- "Share this look" flow from Canvas / My Looks that generates a room link
- Live voting page in the frontend showing the shared look and real-time vote counts
- Extend the OpenAPI spec / seed data only if a REST fallback is needed for room creation; votes themselves go over the socket, not REST

## Day 3 (Jul 17): Lightweight auth

- Add a `User` Mongo model (username + id, no OAuth/password complexity needed for a hackathon demo)
- Attribute votes, challenge submissions, and saved looks to a real user id instead of anonymous localStorage state
- Simple "who are you" prompt on first visit, persisted in localStorage as the session identity

## Day 4 (Jul 18): AI Companion + cleanup

- Add one real OpenRouter call for the AI Style Companion's "Mentor tip" text, keeping the existing deterministic score/radar chart as-is
- Fix the 2 pre-existing typecheck errors: `artifacts/styleverse/src/hooks/use-store.ts:69` (`AppState | null` not assignable) and `artifacts/styleverse/src/pages/search.tsx:225` (stray `className` prop on the `Search` icon)
- Fill in `replit.md` (still the literal unfilled template) with real project description
- Rotate the MongoDB Atlas database user password (it was pasted in plaintext during setup this session)

## Day 5 (Jul 19): Remaining photo ingestion + polish

- Run `ingest-photos` for `streetwear` and `minimalist` folders once your friend finishes sourcing those photos — no code changes needed, same script
- Review `scripts/out/style-ingest-review.csv` and correct any placeholder price/brand/color data before the demo
- Pass over the 5 non-differentiator pitch features (Style Hubs, Fashion Challenges, Style Canvas, Saved Collections) to confirm they read as polished, intentional prototypes even without full backend depth

## Day 6 (Jul 20): End-to-end QA + deploy

- Full click-through of every page against the live Mongo-backed API (not just typecheck) — bag, checkout, canvas, companion, challenges, voting
- Deploy: confirm the Replit application router correctly stitches `/api` (api-server) and `/` (frontend) in production, since this only works locally today via the dev-only Vite proxy added this session
- Give your friend write access to the same MongoDB Atlas cluster so photo/data updates land in place, no migration step

## Day 7 (Jul 21): Demo prep + submission

- Record/rehearse the demo script, leading with the real-time voting differentiator since it's the genuinely defensible feature vs. other teams
- Final submission per hackathon requirements

## Explicitly out of scope for this deadline

- Real payment gateway (checkout stays a fake order ID)
- Full OAuth (username+id auth is enough for demo purposes)
- Automated tests (none exist; not worth adding this close to the deadline)
