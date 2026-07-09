# 🏛️ Dewan Rakyat: Pilihan Raya Edition

> A 3D political satire Monopoly game set in the Malaysian political landscape. Buy influence, collect rent, outmaneuver rival coalitions, and control Dewan Rakyat!

**Live demo:** [https://pru.mcwood.workers.dev](https://pru.mcwood.workers.dev)

---

## 🎮 About

**Dewan Rakyat: Pilihan Raya Edition** re-themes the classic Monopoly board with Malaysian coalitions (PH, PN, BN, GPS, GRS), political parties, real infrastructure projects, and 1,000+ political satire narration entries referencing actual events from GE14–GE15 (2018–2025).

You play as one of 5 coalitions (or create your own party!) against 5 AI opponents. Roll dice, buy properties, build houses, collect rent, draw cards, go to jail (Tahanan SPRM), trade with AI, and be the last coalition standing — or win by supermajority (20+ of 28 seats).

---

## 🎯 Features

### Core Gameplay
- **40-tile board** with Malaysian political theming — 22 properties (political parties), 4 highways (mega-projects), 2 media stations, 4 corner tiles, 3 Community Chest, 3 Chance, 2 Tax
- **2D + 3D dual-view** — toggle between classic CSS grid board and Three.js/R3F 3D board with transparent trading-card tiles, party HQ buildings, bloom, particles, and dice
- **Expert-system AI** — 5 AI opponents with distinct coalition personalities (PH reformist, PN green wave, BN federal machinery, GPS Sarawak autonomous, GRS Sabah kingmaker)
- **1,000+ narration entries** — political soap opera pop-ups during AI turns referencing real Malaysian political events
- **Trading** — both human-initiated and AI-initiated trades (AI proposes when one property away from a monopoly)
- **Auctions, mortgages, house building** — full Monopoly mechanics with even-build enforcement and 32-house/12-hotel supply limits
- **Save/Load** — auto-saves after every turn via localStorage

### Win Conditions
- **Last coalition standing** — bankrupt all opponents
- **Supermajority** — own 20+ of 28 buyable properties (mirrors Malaysian Parliament 112-seat majority)

### Special Tiles
| Tile | Name | Effect |
|------|------|--------|
| 0 | Pilihan Raya (GO) | Collect RM200 campaign funds when passing |
| 4 | Cukai SST/GST | Income Tax — choose 10% of net worth OR flat RM200 |
| 10 | Tahanan SPRM | Jail — just visiting, or serving time for corruption |
| 20 | Istana Negara | Free Parking — collect the Rakyat Fund jackpot (accumulated taxes & fines) |
| 30 | Disyorkan ke SPRM | Go directly to Jail! |
| 38 | Luxury Tax | Pay RM100 |

### Card Decks
- **Jawatan Menteri** (Community Chest) — 15 cards (KWSP Bonus, MACC Investigation, Petronas Dividend, BR1M Handout, 1MDB Scandal, etc.)
- **Krisis Nasional** (Chance) — 15 cards (Flood Season, Cabinet Reshuffle, Haze Crisis, Sharemarket Rally, No-Confidence Motion, etc.)

### UI/UX
- **Video background hero page** with hero music + game music (independent toggles)
- **Market ticker** — live KLCI, CPO, Ringgit, Inflation, Rakyat Fund, house/hotel supply
- **Wealth chart** — SVG line chart showing net worth over time
- **Game settings panel** — sound toggle, volume slider, AI speed (1×/2×/3×)
- **Achievements** — 9 achievements (First Seat Won, Full Color Set, Hotel Mogul, Money Bags, Jailbird, Auction King, Survivor, Monopolist, High Roller)
- **Shareable victory card** — share your election results via `navigator.share()`
- **Keyboard shortcuts** — Space (roll), B (buy), P (pass), S (sound), 1/2 (tax choice), Esc (close)

---

## 🗺️ The Board

### Color Groups (Properties)

| Color | Coalition | Tiles | Price Range |
|-------|-----------|-------|-------------|
| 🟫 Brown | Independent | MUDA, PSM | RM60 |
| 🔵 Light Blue | PH | Amanah, PKR, DAP | RM100–120 |
| 🩷 Pink | PN | Gerakan, Bersatu, PAS | RM140–160 |
| 🟠 Orange | BN | MIC, MCA, UMNO | RM180–200 |
| 🔴 Red | GPS | PRS, PDP, SUPP | RM220–240 |
| 🟡 Yellow | GRS | SAPP, STAR, PBS | RM260–280 |
| 🟢 Green | PN | PN Pahang, PAS Terengganu, PAS Kelantan | RM300–320 |
| 🔷 Dark Blue | PH | Putrajaya, Kuala Lumpur | RM350–400 |

### Highways (Mega-Projects)
| Tile | Name | Price | Description |
|------|------|-------|-------------|
| 5 | ECRL | RM200 | East Coast Rail Link — RM50 billion mega-project |
| 15 | MRT3 | RM200 | MRT Circle Line — Another mega-project |
| 25 | Pan Borneo | RM200 | Pan-Borneo Highway — Connecting Sarawak & Sabah |
| 35 | RTS Johor | RM200 | Rapid Transit System Singapore-Johor |

### Media Stations
| Tile | Name | Price | Description |
|------|------|-------|-------------|
| 12 | RTM | RM150 | Radio Televisyen Malaysia — State media monopoly |
| 27 | Astro/Media Prima | RM150 | Private media empire — Control the narrative! |

---

## 🤖 AI Personalities

Each AI coalition has a distinct personality that affects its buy/build/jail/auction decisions:

| Coalition | Personality | Slogan |
|-----------|-------------|--------|
| **PH** | Reformist — values urban properties, cautious spending | "Hari ini untuk esok!" |
| **PN** | Green Wave — aggressive expansion, religious grassroots | "Islam dan Bangsa!" |
| **BN** | Federal Machinery — experienced, stable, infrastructure-focused | "Bersatu, Teguh!" |
| **GPS** | Sarawak First — autonomous, kingmaker strategy | "Sarawak First!" |
| **GRS** | Sabah Maju — regional focus, coalition flexibility | "Sabah Maju Jaya!" |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript 5 |
| 3D Rendering | Three.js 0.185 via @react-three/fiber + @react-three/drei + @react-three/postprocessing |
| State | Zustand 5 (game store) |
| UI/Styling | Tailwind CSS 4 + shadcn/ui (New York) + Framer Motion |
| Sound | Web Audio API (programmatic, zero audio files) |
| Deployment | Cloudflare Workers via @opennextjs/cloudflare |
| CI/CD | GitHub Actions (secret-gated Cloudflare deploy) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22+ or Bun 1.2+
- A modern browser with WebGL/WebGPU support

### Installation

```bash
# Clone the repo
git clone https://github.com/DENGKIL-UX/polinopoly.git
cd polinopoly

# Install dependencies
bun install

# Start dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
# Lint
bun run lint

# Deploy to Cloudflare Workers (requires wrangler config)
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

---

## 🎹 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `Enter` | Roll dice |
| `B` | Buy property |
| `P` | Pass / Skip |
| `S` | Toggle sound |
| `1` | Tax: choose 10% net worth |
| `2` | Tax: choose flat RM200 |
| `Esc` | Close panel / cancel trade |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main entry — lobby/game switcher
│   ├── layout.tsx            # Root layout
│   └── api/                  # API routes (market-data, ai-decision)
├── components/game/
│   ├── LobbyScreen.tsx       # Hero page + coalition selection + custom party
│   ├── GameScene.tsx         # R3F Canvas (3D board, camera, lighting, bloom)
│   ├── Board3D.tsx           # 3D board with 40 transparent trading-card tiles
│   ├── GameBoard.tsx         # 2D CSS grid board (fallback)
│   ├── GameDashboard.tsx     # HUD: dice, player cards, action panels, log
│   ├── Token3D.tsx           # 3D player tokens with hop animation
│   ├── Dice3D.tsx            # 3D dice in scene
│   ├── NarrationPopup.tsx    # Political soap opera pop-ups
│   ├── MusicPlayer.tsx       # Game music loop + toggle
│   ├── CoalitionLogo.tsx     # Official coalition logo renderer
│   └── CardTexture.ts        # Canvas-generated trading-card textures
├── lib/
│   ├── game-store.ts         # Zustand store: game loop, AI turns, all actions
│   ├── game-data.ts          # 40 tiles, 6 coalitions, 30 cards, market data
│   ├── ai-engine.ts          # Expert-system AI (buy/build/jail/auction decisions)
│   ├── narrations.ts         # 1,000+ political satire narration entries
│   ├── sound-effects.ts      # Web Audio API sound manager
│   └── utils.ts              # Shared utilities
└── public/
    ├── logos/                # Official coalition logos (SVG/PNG)
    ├── hero-bg.mp4           # Hero page video background
    └── board-image.png       # Board surface texture
```

---

## 🏆 Game Rules

### Starting Setup
- Each player starts with **RM1,500**
- 6 players total (1 human + 5 AI)
- Turn order: PH → PN → BN → GPS → GRS → (Custom)

### Rolling & Movement
- Roll 2 dice, move clockwise
- **Doubles** = roll again; 3 consecutive doubles = go to Jail
- Pass GO = collect RM200

### Buying & Rent
- Land on unowned property → buy at listed price OR pass (triggers auction)
- Land on owned property → pay rent (doubled if owner has full color group)
- Houses/hotels dramatically increase rent

### Building Houses
- Must own **full color group** to build
- **Even-build rule** enforced — can't build on a property that has more houses than the least-developed in its group
- **32 houses / 12 hotels** supply limit (classic Monopoly)
- 4 houses → 1 hotel (5th "house")

### Jail (Tahanan SPRM)
- Land on tile 30 → go directly to Jail
- Roll 3 doubles → go to Jail
- In jail: pay RM50 bail, roll doubles to escape, or use Get Out of Jail Free card
- Max 3 turns in jail, then must pay RM50

### Income Tax (Tile 4)
- Choose: **10% of net worth** OR **flat RM200**
- Net worth = cash + property values + house values

### Free Parking (Tile 20 — Istana Negara)
- Collect the **Rakyat Fund** jackpot
- All taxes and fines accumulate in the pot until someone lands here

### Bankruptcy
- If you can't pay rent: all assets transfer to the creditor
- If you can't pay the Bank (tax/card): properties return to Bank
- Bankrupt players are eliminated

### Winning
1. **Last coalition standing** — bankrupt all opponents
2. **Supermajority** — own 20+ of 28 buyable properties

---

## 🎨 Custom Party

Don't like the existing coalitions? Create your own!
- **Party Name** (short, e.g. "PRIBUMI")
- **Full Name** (e.g. "Parti Pribumi Bersatu")
- **Slogan / Battle Cry**
- **Party Color** (10 presets + custom color picker)
- **Logo Upload** (PNG/JPEG/SVG, max 2MB)

Your custom party appears in-game with your chosen color, logo, and slogan.

---

## 📊 Market Simulation

The game features a live market ticker that affects gameplay:
- **KLCI** (Kuala Lumpur Composite Index)
- **CPO** (Crude Palm Oil price)
- **MYR** (Ringgit vs USD)
- **Inflation Multiplier** — affects rent calculations

Market values fluctuate each turn, adding an economic layer to the political satire.

---

## 🔒 Security

- Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, etc.)
- localStorage save validation (prevents prototype pollution)
- SSRF protection on API routes
- No error exposure in production

---

## 📜 License

This is a political satire game for educational and entertainment purposes. All coalition logos and names belong to their respective owners.

---

## 🙏 Credits

- **Concept & Development:** DENGKIL-UX
- **3D Board:** Three.js + React Three Fiber
- **UI Components:** shadcn/ui (New York)
- **Political Satire:** 1,000+ narration entries referencing real Malaysian political events (2018–2025)
- **Inspired by:** Classic Monopoly (Hasbro) + Malaysian GE14/GE15 politics

---

> **⚠️ Disclaimer:** This is a satirical game. All political references are for humor and commentary. No actual politicians were harmed in the making of this game. 🇲🇾
