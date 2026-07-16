# Features

## Overview

Our solution transforms Myntra from a shopping platform into a **social fashion ecosystem** where users don't just buy clothes—they discover, create, get personalized AI guidance, and express their fashion identity.

---

# 1. Style Hubs ✨

### Problem
Users interested in a particular aesthetic (Y2K, Streetwear, Old Money, etc.) currently discover inspiration across multiple platforms like Instagram and Pinterest.

### Solution
Introduce community-driven **Style Hubs** centered around different fashion aesthetics.

Examples:
- Y2K
- Old Money
- Streetwear
- Minimalist
- K-Fashion
- Indo-Western
- Cottagecore

Each hub contains:
- 🔥 Trending outfits
- 🏆 Weekly challenge
- ⭐ Top creators
- 💬 Community discussions
- 🛍️ Shop Complete Look

Unlike Myntra's existing curated collections, these hubs are **community-driven and constantly evolving**.

### Benefits
- Keeps users engaged even when they aren't shopping
- Encourages discovery through communities
- Creates user-generated fashion content

### Tech Stack
- React
- Express.js
- MongoDB

---

# 2. Fashion Challenges 🏆

### Problem
Users rarely engage with the app after completing a purchase.

### Solution
Weekly and monthly fashion competitions.

Examples:
- College Outfit Challenge
- Monsoon Challenge
- Outfit Under ₹1500
- Y2K Challenge
- Old Money Challenge

Users:
- Submit outfits
- Receive community votes
- Win Myntra coupons
- Earn badges
- Get featured in Style Hubs

### Benefits
- Gamifies shopping
- Improves retention
- Creates fresh community content

### Tech Stack
- React
- Express.js
- MongoDB

---

# 3. Style Canvas 🎨

### Problem
Users have to imagine how products look together.

### Solution
A drag-and-drop workspace where users can build complete outfits.

Users can:
- Drag products
- Create outfits
- Save
- Share
- Submit to Challenges
- Send straight to the AI Style Companion for a compatibility check

### Benefits
- Interactive shopping
- Complete outfit purchases
- Better product discovery

### Tech Stack
- React
- React DnD
- Tailwind CSS
- MongoDB

---

# 4. AI Style Companion 🤖

### Problem
Users don't know whether their outfit combinations work well, why they work, or how to improve them — and they get no continuous, personalized guidance, only one-off tips.

### Solution
One persistent AI companion that follows the user across the app, instead of three disconnected AI tools. It:

- **Scores compatibility** — Color Harmony, Style Consistency, Occasion Match, Budget Compatibility
- **Suggests improvements** — better combinations, same-budget alternatives, premium alternatives, matching accessories
- **Teaches styling** — explains *why* something works (color theory, layering, occasion suitability)
- **Learns the user's taste** over time so advice gets more personal with every outfit reviewed

Example:

```
Overall Score : 92/100

✔ Color Harmony
✔ Occasion Match
✔ Style Consistency
✔ Budget Friendly

💡 Mentor tip: The teal top and beige trousers work because they're
   analogous on the color wheel — try a gold accessory to warm it up.
```

### Benefits
- One relationship, not three separate tools — feels like a personal stylist
- Personalized, evolving styling guidance
- Better purchase confidence
- Cross-selling through grounded suggestions

### Tech Stack
- OpenRouter
- Express.js
- MongoDB (stores companion memory/preferences per user)

---

# 5. Saved Collections 📌

### Problem
Users can currently only like an outfit — there's no way to organize things they've saved for later, the way Instagram lets you sort saves into named collections.

### Solution
Instagram-style **Saved Collections**. Users save any outfit or product with one tap and organize saves into custom collections.

Examples:
- Wedding Looks
- Casual Fits
- Wishlist
- Date Night

Features:
- Save/unsave with one tap from anywhere (Hub, Canvas, Challenge, PDP)
- Create and name custom collections
- Move a saved item between collections
- Private by default
- Quick access from Profile

### Benefits
- Turns passive browsing into organized inspiration boards
- Increases return visits (users come back to their collections)
- Familiar, zero-learning-curve UX (mirrors Instagram)

### Tech Stack
- React
- Express.js
- MongoDB

---

# User Journey

```
Browse Style Hub
        │
        ▼
Discover Trending Outfit
        │
        ▼
Save to Collection
        │
        ▼
Style Canvas
        │
        ▼
AI Style Companion (score + suggestions + styling tips)
        │
        ▼
Submit to Fashion Challenge
        │
        ▼
Community Voting
        │
        ▼
Shop Complete Look
```

---

# Feature Mapping

| Theme Requirement | Features |
|-------------------|----------|
| **Fashion as Self-Expression** | Style Hubs, Style Canvas, AI Style Companion |
| **Creator Economy** | Style Hubs, Fashion Challenges |
| **Building for Gen Alpha** | AI Style Companion, Saved Collections |

---
