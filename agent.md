# AGENTS.md — Pilihan Raya Monopoly 3D

> **Lazy senior dev mode + caveman efficiency for a Malaysian political satire 3D Monopoly board game.**
>
> This file synthesizes the philosophy of [ponytail](https://github.com/DietrichGebert/ponytail) (lazy senior dev: minimum code, maximum reuse, platform-native first) and [caveman](https://github.com/JuliusBrussee/caveman) (terse output: same answers, 65% fewer tokens) into a single agent instruction set tailored for this project.

---

## 1. Project Context

**Pilihan Raya Monopoly** is a 3D Malaysian political satire Monopoly game built with:
- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4** + **shadcn/ui**
- **Three.js** via **@react-three/fiber** + **@react-three/drei** + **@react-three/postprocessing**
- **Zustand** for game state, **Framer Motion** for UI animations
- **Prisma** ORM (SQLite), **next-intl** for i18n (EN/MS)

The game features 40 trading-card-style tiles themed around Malaysian political parties (PH, PN, BN, GPS, GRS) and real political events (Sheraton Move, 1MDB, GE14/GE15). AI players use a chess-like expert system with coalition personalities. A 1000-entry political narration bank provides soap-opera pop-ups during AI turns.

---

## 2. Lazy Senior Dev Rules (from ponytail)

Before writing ANY code, climb this ladder. Stop at the first rung that holds:

1. **Does this need to be built at all?** (YAGNI — don't build features nobody asked for)
2. **Does it already exist in this codebase?** Reuse the helper, util, or pattern. Don't re-write.
3. **Does the standard library already do this?** Use it.
4. **Does a native platform feature cover it?** Use it (see platform-native table below).
5. **Does an already-installed dependency solve it?** Use it. No new packages.
6. **Can this be one line?** Make it one line.
7. **Only then:** write the minimum code that works.

### Core principles
- **No abstractions that weren't explicitly requested.**
- **No new dependency if it can be avoided.** The project already has Three.js, R3F, drei, postprocessing, Framer Motion, Zustand, GSAP, and all of shadcn/ui. Use what's installed.
- **No boilerplate nobody asked for.**
- **Deletion over addition. Boring over clever. Fewest files possible.**
- **Shortest working diff wins** — but only once you understand the problem.
- **Bug fix = root cause, not symptom.** Grep every caller of the function you touch.
- **Mark intentional simplifications** with a `ponytail:` comment naming the ceiling and upgrade path.

### Not lazy about
- Understanding the problem (read it fully, trace the flow before picking a rung)
- Input validation at trust boundaries
- Error handling that prevents data loss
- Security, accessibility
- The calibration real hardware needs
- Anything explicitly requested

---

## 3. Caveman Output Rules (from caveman)

**Same answers, fewer tokens. Brain big, mouth small.**

- **Drop the filler.** No "Sure!", "I'd be happy to help", "Let me take a look", "Great question!"
- **No recaps of what you're about to do** before doing it. Just do it.
- **No summaries of what you just did** unless asked. The diff is the summary.
- **Keep code, commands, and errors byte-for-byte exact.** Compress prose, not technical content.
- **Prefer one-liners over paragraphs.** "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:" — then the code.
- **Technical accuracy stays at 100%.** Only the wrapper text shrinks.

### Before/after example

| ❌ Normal (69 tokens) | ✅ Caveman (19 tokens) |
|---|---|
| The reason your React component is re-rendering is likely because you're creating a new object reference on each render cycle. When you pass an inline object as a prop, React's shallow comparison sees it as a different object every time, which triggers a re-render. I'd recommend using useMemo to memoize the object. | New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`. |

---

## 4. Platform-Native First (from ponytail docs)

Before reaching for a package, check if the platform already does it.

### HTML elements the browser already has
| You think you need | What the platform has |
|---|---|
| Modal/dialog library | `<dialog>` + `dialog.showModal()` |
| Color picker | `<input type="color">` (already used in Create Party form) |
| Accordion/FAQ | `<details><summary>` |
| Progress bar | `<progress>` |
| Tooltip | `title` attribute + CSS |

### CSS capabilities (no JS needed)
| You think you need JS for | What CSS has |
|---|---|
| Responsive font size | `font-size: clamp(1rem, 2.5vw, 2rem)` |
| Dark mode | `@media (prefers-color-scheme: dark)` |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` |
| Responsive grid | `grid-template-columns: repeat(auto-fill, minmax(250px, 1fr))` |
| Aspect ratio | `aspect-ratio: 16 / 9` |
| Text truncation | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` |
| Smooth scroll | `scroll-behavior: smooth` |

### JavaScript / Browser APIs already shipped
| You think you need | What the platform has |
|---|---|
| Query string parsing | `new URLSearchParams()` |
| UUID generation | `crypto.randomUUID()` |
| Base64 encoding | `btoa()` / `atob()` |
| File reading | `FileReader` API (already used for party logo upload) |
| Audio playback | `<audio>` element (already used for game music) |
| LocalStorage | `window.localStorage` (already used for preferences) |
| Intersection Observer | `IntersectionObserver` (for scroll-triggered animations) |

---

## 5. Project-Specific Rules

### Three.js / R3F
- **Use `meshBasicMaterial` for textures that must show at full brightness** (card faces, board image). `meshStandardMaterial` requires lighting and can appear dark.
- **Canvas textures need `texture.needsUpdate = true`** and `texture.source.data = canvas` to force GPU upload.
- **BoxGeometry material order:** `[+X, -X, +Y (top), -Y (bottom), +Z, -Z]` — face texture goes on index 2 (top).
- **Avoid `Environment preset`** — it fetches HDR files from CDN which fail offline. Use `hemisphereLight` instead.
- **Text rotation for flat tiles:** use `[-Math.PI/2, 0, 0]` for all tiles (unified direction for single-camera view).
- **Transparent materials:** set `transparent={true}`, `opacity={value}`, `depthWrite={false}` to avoid sorting issues.
- **No `castShadow` on transparent tiles** — it creates visible shadow outlines.

### Game state (Zustand)
- **Phase-polling waits** (`waitForPhase`) instead of fixed delays — prevents AI turn stalls.
- **AI decisions** go through the expert system in `ai-engine.ts` (`decideBuy`, `decideBuild`, `decideJail`, `decideAuctionBid`).
- **Narrations** trigger via `get().triggerNarration(category)` at key AI decision points.
- **No `setState` synchronously in effects** — use `queueMicrotask()` or lazy `useState` initializer.

### CSS / Tailwind
- **No indigo or blue** unless explicitly requested (project rule).
- **Sticky footer:** use `min-h-screen flex flex-col` + `mt-auto` on footer.
- **Custom scrollbar:** `.dark-scroll` class already defined in globals.css.
- **Card alignment:** use `p-4` or `p-6` for content, `gap-4` or `gap-6` for spacing.

### Git workflow
- **PAT is embedded in remote URL for push, then removed.** Never leave it in `.git/config`.
- **Commit messages:** `type: description` format (feat, fix, docs, refactor).
- **Always run `bun run lint` before committing.**

---

## 6. File Structure Reference

```
src/
  app/
    page.tsx              # Main page: lobby → game, 2D/3D toggle, narration, music
    layout.tsx            # Root layout
    globals.css           # Tailwind + custom animations
  components/
    game/
      Board3D.tsx         # 3D board: tiles, cards, buildings, center decks
      GameScene.tsx       # R3F Canvas: camera, lights, post-processing, auto-rotate
      Token3D.tsx         # Player tokens with hop animation
      Dice3D.tsx          # 3D tumbling dice
      GameBoard.tsx       # 2D CSS-grid board
      GameDashboard.tsx   # HUD: dice, players, actions, log, portfolio
      LobbyScreen.tsx     # Hero page: video bg, coalition select, custom party
      NarrationPopup.tsx  # Political soap opera dialog pop-ups
      MusicPlayer.tsx     # Game music (loop + toggle)
      CoalitionLogo.tsx   # Reusable coalition logo with fallback
      CardTexture.ts      # Canvas-generated trading card textures
      Parliament3D.tsx    # Center Parliament building (25% scale)
      Particle3D.tsx      # Landing effects (confetti, shockwave, beam)
      Shader3D.tsx        # Shader materials + 3D miniatures
    ui/                   # shadcn/ui components (pre-installed)
  lib/
    game-data.ts          # 40 tiles, coalitions, cards, market data
    game-store.ts         # Zustand store: game loop, AI turns, narrations
    ai-engine.ts          # Expert system: buy/build/jail/auction decisions
    narrations.ts         # 1000 political satire narration entries
    narration-system.ts   # Narration hook + random selection
    sound-effects.ts      # Web Audio API sound effects
    db.ts                 # Prisma client
    utils.ts              # cn() utility
public/
  logos/                  # Coalition logos (PH, PN, BN, GPS, GRS, flag)
  hero-bg.mp4            # Lobby video background
  hero-music.mp3         # Hero page music
  game-music.mp3         # In-game music
  board-surface.jpg      # Uploaded board surface image
```

---

## 7. Enhancement Ideas (from research)

### From ponytail philosophy
- **Audit for over-engineering:** scan the codebase for abstractions that weren't requested, unused imports, redundant wrappers. Delete them.
- **Platform-native audit:** replace any JS library call that the browser already does natively (see table above).
- **Shortcut ledger:** harvest `ponytail:` comments into a tracked debt list for future cleanup.

### From caveman philosophy
- **Token efficiency in AI turns:** the narration system already uses short 1-3 sentence pop-ups. Keep narrations punchy — caveman style.
- **Log entries:** Hansard log messages should be terse. "PH buys DAP for RM120!" not "Pakatan Harapan has successfully purchased the Democratic Action Party property for RM120."

### Additional enhancements to explore
- **Physics dice** with `cannon-es` (referenced in the original spec but not yet implemented — would replace the current CSS animation)
- **Title deed card flip** animation when buying (GSAP `rotation.y` interpolation)
- **Kad Nasib / Kad SPR card draw** animation (top card lifts, flips, reveals text)
- **Board surface texture** with procedural felt bump map (noise-based canvas texture)
- **SSAO post-processing** (requires NormalPass — currently removed for performance)
- **Trail renderers** behind moving tokens (using particle system)
- **3D Keris/rocket/scale/hornbill/shield** player piece models per coalition (currently all use the same bishop silhouette)

---

## 8. Quality Checklist

Before marking any task complete:
- [ ] `bun run lint` passes with zero errors
- [ ] No console errors in the browser (check `dev.log`)
- [ ] Agent Browser verification (if visual change)
- [ ] VLM verification for visual changes (screenshot + vision check)
- [ ] No new dependencies installed unless absolutely necessary
- [ ] Code follows the lazy senior dev ladder (reused existing patterns)
- [ ] Commit message follows `type: description` format
- [ ] PAT removed from git remote after push
