# Polinopoly 3D Conversion — Work Log

This file tracks all agent work for converting the polinopoly 2D Monopoly clone into a full 3D game.

---
Task ID: 0
Agent: Main Agent
Task: Clone polinopoly, research 3D elements, bring game into project, enhance to full 3D

Work Log:
- Cloned https://github.com/DENGKIL-UX/polinopoly to /tmp/polinopoly
- Analyzed repo: already has 3D components (Board3D, Token3D, GameScene) but page.tsx uses the 2D GameBoard
- Researched 3D Monopoly elements from: Unity-Monopoly (3D dice + browser play), itaylayzer/Monopoly (board rotation/scaling, property nav), Three.js integration patterns
- Copied game files into /home/z/my-project: src/lib/{game-data,game-store,sound-effects,strict-mode-fix}.ts, src/components/game/{LobbyScreen,GameBoard,GameDashboard,Board3D,Token3D,GameScene}.tsx
- Installed deps: three@0.185, @react-three/fiber@9.6, @react-three/drei@10.7, @types/three, gsap
- Appended custom CSS animations (shimmer, pulse-glow, sparkle-float, lobby-gradient, corner-glow, dice-shake, etc.) to globals.css

Stage Summary:
- Repo cloned and analyzed. Game logic (Zustand store, 40 Malaysian political-satire tiles, 6 coalitions) is complete.
- 3D scaffolding exists but needs enhancement: 3D dice, token movement animation, camera focus controls, tile click interactions, environment polish.
- Next: wire 3D scene as primary board + build the researched 3D enhancements.

---
Task ID: 0 (continuation)
Agent: Main Agent
Task: Build & verify the 3D enhancements

Work Log:
- Wrote src/app/page.tsx: 3D GameScene as primary board + floating 2D/3D toggle (persisted to localStorage). LobbyScreen shown when phase==='lobby'.
- Created src/components/game/Dice3D.tsx: Two 3D dice (RoundedBox + sphere pips on all 6 faces) with tumbling physics — spins on a random axis while rolling, then slerps to the target face rotation showing the rolled value. Glowing disc beneath. (Unity-Monopoly inspired)
- Rewrote src/components/game/Token3D.tsx: Added tile-to-tile hopping movement. Tracks previous position; on change builds a forward path (wrapping 0-39) and animates through each intermediate tile with a sin-arc hop (HOP_HEIGHT=0.9, 0.22s/tile). Token faces travel direction; shadow shrinks at apex. (itaylayzer/Monopoly inspired)
- Enhanced src/components/game/Board3D.tsx: Tiles now clickable (selectTile) with hover lift + emissive glow + pointer cursor. CornerTile and EdgeTile both lift ~0.2 on hover/select.
- Rewrote src/components/game/GameScene.tsx: Added CameraRig (lerps OrbitControls target to active player / selected tile), ContactShadows, Environment(night), Stars, dark reflective Ground, coalition-coloured rim spotlights, onPointerMissed deselect.
- Fixed CSS duplication in globals.css (stray @apply from append).
- Fixed lint error (setState-in-effect) via lazy useState initializer for view preference.

Verification (Agent Browser):
- Lobby renders: "DEWAN RAKYAT" title + 6 coalition cards (PH/PN/BN/GPS/GRS/IND) + start button. ✓
- Selected PH → started game → 3D scene renders (188KB screenshot). ✓
- Clicked "Baling Dadu" → 3D dice tumbled, token hopped along path, turn advanced to "Akhir Giliran". ✓
- 2D toggle works (69KB CSS-grid board), toggled back to 3D cleanly. ✓
- No console errors (only harmless THREE.Clock / PCFSoftShadowMap deprecation warnings). ✓
- Lint clean. Dev log shows only 200 responses after CSS fix.

Stage Summary:
- Polinopoly 2D clone successfully converted to a full 3D game.
- 3D enhancements delivered: tumbling 3D dice, hopping token movement, camera focus rig, clickable/hoverable 3D tiles, contact shadows, environment lighting, ground plane, starfield.
- Game is fully playable end-to-end in 3D with a 2D fallback toggle.

---
Task ID: 1
Agent: Main Agent
Task: Replace emoji emblems with official coalition logos + Jalur Gemilang flag

Work Log:
- Researched & downloaded official logos from Wikimedia Commons via the Commons API:
  - PN: Logo_Perikatan_Nasional.svg
  - BN: Barisan_Nasional.png (resized 500x336 -> 400x269)
  - PH: Pakatan_Harapan_Logo.svg
  - GPS: Logo_GPS.png (resized 5120x2880 -> 400x225, 4.7MB -> 39KB)
  - GRS: Gabungan_Rakyat_Sabah_logo.svg
  - Jalur Gemilang: Flag_of_Malaysia.svg
  All saved to /public/logos/ and verified accessible (HTTP 200).
- Added `logo: string` field to the Coalition interface in game-data.ts (with emoji kept as fallback).
- Created reusable CoalitionLogo component (src/components/game/CoalitionLogo.tsx) that renders the official logo <img> with graceful emoji fallback on error.
- Updated LobbyScreen: coalition cards now show official logos in circular white-backed badges; added two animated Jalur Gemilang flags flanking the title.
- Updated GameDashboard: all 7 player-avatar spots (player cards, AI thinking bubble, tile owner, auction bidders, trade list, game-over standings) now use CoalitionLogo instead of avatarEmoji.
- Updated 2D GameBoard: center coalition emblem row + on-tile player tokens + owner indicators now render real logos.
- Updated 3D Board3D: added FlagMesh component (textured waving Jalur Gemilang on a gold pole) at two inner corners; wrapped in Suspense.
- Updated 3D Token3D: tokens now display a billboarded coalition logo disc above each piece (TokenLogo component using useTexture + Billboard) instead of emoji text.

Verification (Agent Browser):
- Lobby: all 6 coalition logos + 2 Jalur Gemilang flags render (410KB screenshot). ✓
- 3D game: tokens show billboarded logos, flags wave on board. ✓
- 2D game: 20 logo images rendered across tiles/center/owner indicators. ✓
- Dice roll + token movement with logos works. ✓
- No console/runtime errors. Lint clean. All /logos/* return 200.

Stage Summary:
- Emoji placeholders replaced with real, researched official coalition logos and the national flag (Jalur Gemilang).
- Logos appear consistently across lobby, 2D board, 3D board, 3D tokens, and all dashboard panels.

---
Task ID: 2
Agent: Main Agent
Task: Fix tokens moving outside the 3D board, enlarge board, disable rotation, make tile text readable

Work Log:
- Analyzed user screenshot with VLM: confirmed (1) text labels unreadable, (2) board ~40-50% of viewport, (3) tiles/tokens hanging off the felt edge.
- Root-caused the "token outside board" bug: SingleToken's inner groupRef was being set to ABSOLUTE tile coords (pos.x, pos.z) while nested inside a parent group already translated to [tilePos + offset]. Result: world position = 2*tilePos + offset → tokens rendered ~2× off the board.
- Research applied (itaylayzer/Monopoly board-scaling + elena-pan/Unity-Monopoly crisp-text/camera practices): enlarge playing surface, top-down camera, bigger outlined text.

Fixes:
1. Token3D.tsx — Fixed double-translation bug:
   - Removed the parent group's [tilePos+offset] translation (now origin).
   - SingleToken now owns its full world position: idle lerps to (tilePos + offset), hop path interpolates (fromPos→toPos + offset). Offset passed as a prop.
   - Tokens now sit exactly on their tiles and hop along the board edge, never off-board.
2. Board3D.tsx — Enlarged board so tiles & tokens stay ON the felt:
   - Added FELT_MARGIN = 3.2; felt now BOARD_SIZE + 6.4 = 26.4 wide (was 20.4), giving a 3.2-unit margin around the 20-wide tile loop.
   - Tiles enlarged: EDGE_W 1.7→1.9, EDGE_D 0.85→1.1, CORNER 2.0→2.3, TILE_H 0.15→0.18.
   - Frame enlarged: FRAME_W 1.0→1.2, FRAME_H 0.45→0.5; shadow bounds ±18→±24.
3. Board3D.tsx — Made tile text readable:
   - Tile name fontSize 0.14→0.26 with white outline (0.018).
   - Sub-label 0.09→0.16 with outline.
   - Price 0.17→0.32 with amber outline.
   - Corner name 0.22→0.30, icon 0.5→0.6, sub 0.13→0.17, all with outlines.
4. GameScene.tsx — Camera & rotation:
   - autoRotate: true → false (user: "no need to rotate").
   - Camera position [20,24,20]→[13,33,13]: nearly top-down (polar ~21°) so flat tile text isn't foreshortened.
   - fov 46→42, zoom limits tightened (16–48).
   - CameraRig: now keeps target centered on (0,0,0) by default so all 40 tiles stay visible; only pulls focus when a tile is explicitly selected.

Verification (Agent Browser + VLM):
- Lobby → start game → 3D board renders. ✓
- VLM: "player tokens are on the green board (no floating off edges)". ✓
- VLM: "text labels on board tiles are readable" (RM prices legible), readability 7/10 (was "not readable"). ✓
- VLM: "board is large in the viewport". ✓
- VLM: "view is more top-down (looking down at the board)". ✓
- Dice roll: tokens stay ON the board throughout the hop animation. ✓
- No console/runtime errors. Lint clean.

Stage Summary:
- Token-outside-board bug fixed (double-translation root cause).
- Board enlarged with felt margin so all tiles/tokens sit on the playing surface.
- Auto-rotate disabled; static top-down readable camera.
- Tile text (names, prices, sub-labels) now readable via bigger fonts + outlines + top-down angle.

---
Task ID: 3
Agent: Main Agent
Task: Fix AI turns stalling; add chess-like expert-system AI decision engine with surprising elements

Work Log:
- Analyzed stuck-game screenshot with VLM: PH was active but no "AI thinking" indicator — AI turns weren't firing after the human's turn.
- Root-caused the stall: aiTurn used FIXED `await delay(1500)` after rollDice, but the rollDice→movePlayer→handleLanding pipeline takes 800+1500=2300ms. The AI checked `phase==='buying'` at 1500ms while phase was still 'moving' (handleLanding hadn't fired), so it skipped the buy branch, and the final `if (phase==='landed'||'playing')` was false → endTurn() never called → game frozen.
- SECOND bug: handleLanding had DUPLICATE AI-buy logic (lines 447-506) that called /api/ai-decision (which 404s) and fell back to random, racing with aiTurn's own buy logic. The AI branch never set phase='buying' (only the human branch did), so aiTurn's buying check never matched for AI players.
- Researched GitHub Monopoly AI (intrepidcoder, itaylayzer, AniketSanghi): cash-multiple buy heuristic, greedy-ROI house building, expert-system rules, simple positional eval function.

Fixes implemented:

1. NEW MODULE: src/lib/ai-engine.ts — chess-like expert-system AI:
   - evaluatePosition(): positional score = cash (diminishing) + property equity + monopoly bonus + jail penalty − opponent-threat. Lets the AI compare decision branches.
   - decideBuy(): 8-rule expert system — cash buffer, cash-multiple affordability, color-group completion (+80), block-opponent-monopoly (+35), ROI ratio, highway/media count-scaling, dark-blue federal-power bonus, inflation hedge, coalition-personality aggression + random variance. Returns shouldBuy + human-readable reason.
   - decideBuild(): greedy ROI on completed monopolies, even-build rule enforced, dark-blue/green prioritised, aggressive coalitions build more.
   - decideJail(): use Get-Out-Of-Jail card if held; early game with few props = wait; late game with monopolies = pay bail; affordability check.
   - decideAuctionBid(): max-bid = price × (0.8 + personality), 50% premium to complete a monopoly, surprise over-bid 20% of the time.
   - getCoalitionPersonality(): 6 coalition profiles (PH cautious, PN aggressive, BN steady, GPS opportunistic, GRS unpredictable, IND chaotic) with aggressionBonus, buildAggression, variance — creates surprising, non-deterministic, flavourful plays.

2. game-store.ts — rewrote aiTurn with PHASE-POLLING waits:
   - Replaced fragile fixed delays with waitForPhase(targets, timeout, interval=150ms) that polls until the phase matches. No more desync with the 2.3s move pipeline or the token-hop animation.
   - Structured 8-step flow: jail decision → roll → wait-for-landing → buy (expert) → pay rent → draw card (with recursive buy/rent handling) → auction wait → build houses (expert) → end turn.
   - Safety net: if final phase isn't terminal, endTurn() is called anyway so the game can never stall.
   - Removed duplicate AI-buy logic from handleLanding — AI players now land in 'buying' phase just like humans, and aiTurn's expert system decides buy-vs-skip. This eliminated the /api/ai-decision 404 path entirely.
   - aiAuctionTurn upgraded to use decideAuctionBid() expert function.
   - buildAIContext() helper assembles the AIContext (player + tiles + opponents + market + turn) for the engine.

Verification (Agent Browser + VLM):
- Started game as GRS (user's scenario). Rolled dice, bought property, ended turn. ✓
- Turn advanced to PH → "AI sedang berfikir..." indicator showed. ✓
- Waited 40s: turn progressed PH → PN → BN → GPS → IND (all 5 AI players completed turns). ✓
- Waited 20s more: turn cycled back to GRS (human), "Baling Dadu!" button reappeared. ✓
- VLM read Hansard log: "T1 IND: Buy (affordable, high-roi, first-in-type, score 56)" — the expert system's reasoning is logged with rule factors + score. ✓
- IND: RM1500→RM1300, 1 property (bought); GRS: bought Amanah RM100. ✓
- No console/runtime errors. Lint clean.

Stage Summary:
- AI turn-stall bug fixed (root cause: fixed delays desynced from move pipeline + duplicate AI-buy logic in handleLanding).
- Chess-like expert-system AI engine added: 8-rule buy decisions, greedy-ROI house building, positional evaluation, jail strategy, auction bidding — all with coalition personalities for surprising plays.
- AI decisions are explainable: each move logs the rule factors and a score (e.g. "Buy (completes-monopoly, high-roi, score 92)").
- Game now plays continuously: human rolls → all 5 AI players auto-take turns → returns to human. No stalls.
