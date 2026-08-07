# StyleVerse

Theme 3: **Fashion is Identity**.

> **Become the Fashion Destination for the Next Generation**

The challenge focuses on reimagining Myntra as more than an e-commerce platform — creating experiences where fashion is **discovered, expressed, shared, and personalized**, especially for **Gen Z** and **Gen Alpha** users, across three focus areas: Fashion as Self-Expression, the Creator Economy, and Building for Gen Alpha.

---

## Our Approach

StyleVerse transforms Myntra into a **social fashion ecosystem** where users don't just shop — they **discover trends, build outfits, see themselves in them with AI try-on, get group feedback in real time, and follow a personal AI style companion.**

Rather than replacing the existing Myntra experience, StyleVerse extends it with community-driven fashion discovery, real-time collaboration, and AI-assisted styling — backed by a real Node/MongoDB API, not mocked local state.

| Theme Requirement | Our Features |
|-------------------|--------------|
| **Fashion as Self-Expression** | Style Canvas, AI Virtual Try-On, AI Style Companion |
| **Creator Economy** | Style Hubs, Fashion Challenges, Real-Time Group Voting |
| **Building for Gen Alpha** | AI Style Companion, Real-Time Group Voting, Saved Collections |

---

## Features

| Feature | What it does | Problem it solves |
|---|---|---|
| **AI Virtual Try-On** | Upload a photo, pick up to 6 garments, get a real AI-generated image of you wearing the look (Gemini 2.5 Flash Image via OpenRouter) | Removes "will this look good on me?" uncertainty before purchase |
| **Real-Time Group Voting** (Vote Room) | Share a look to a live room; friends vote/react and leave moderated feedback comments instantly over WebSockets, behind a one-time 18+ confirmation | Brings the WhatsApp-style outfit debate into the app instead of losing that traffic off-platform |
| **Style Canvas** | Drag-and-drop outfit builder from catalog items, with category → subcategory browsing (e.g. Women → Tops) and item names shown on every card | Lets users compose and preview a full look before deciding |
| **Style Hubs** | Curated style communities (Y2K, Cottagecore, Streetwear, etc.) | Community-driven fashion discovery |
| **Fashion Challenges** | Themed styling challenges users can enter and get voted on | Creator-economy engagement, keeps users returning between purchases |
| **AI Style Companion** | Instant outfit scoring plus an AI-generated mentor tip | Quick, personalized styling feedback |
| **Saved Collections** | Save looks/products for later | Standard retention feature, Gen Alpha-friendly |

---

Demo Video => https://drive.google.com/drive/folders/1-2bF7BWoxl1n1H0g_z8cVHZXXVswdweZ?usp=sharing

---

## Tech Stack

- **Frontend**: React + Vite (`artifacts/styleverse`)
- **API server**: Express + Socket.IO (`artifacts/api-server`)
- **Database**: MongoDB via Mongoose (`lib/db`)
- **AI**: OpenRouter — Gemini 2.5 Flash Image for virtual try-on, plus the Style Companion's mentor tip
- **Real-time**: Socket.IO/WebSockets for live group voting and reactions
- **Monorepo**: pnpm workspaces + Turborepo-style package layout

See `artifacts/styleverse/architecture-diagram.svg` for the high-level architecture.

---

## How to Run It / See the Output

Prerequisites: Node 22+ (Node 24 recommended), pnpm, and a MongoDB connection string (a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster works).

```bash
cp .env.example .env
# open .env and set MONGODB_URI (required)
# optionally set OPENROUTER_API_KEY to enable AI try-on + mentor tips

./run.sh
```

This installs dependencies on first run, starts the API server, waits for it to be healthy, and starts the frontend — then opens `http://localhost:20978` in your browser automatically.

Without `OPENROUTER_API_KEY` set, the app still runs; only AI try-on generation and the Style Companion's mentor tip are skipped.

---

## Why We Chose This Theme

Today's shopping journey usually ends after a purchase. Users discover fashion inspiration on platforms like Instagram and Pinterest, discuss outfits in WhatsApp groups, and finally purchase products on Myntra — fragmented across multiple platforms, with no way to see how a look actually suits them first.

Our goal is to bring **fashion discovery, real AI-powered try-on, live group collaboration, and community engagement** directly into the Myntra ecosystem, making it a destination users return to even when they aren't actively shopping.
