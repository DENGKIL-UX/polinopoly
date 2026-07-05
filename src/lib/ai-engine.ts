// ============================================================
// AI Decision Engine — chess-like evaluation + expert-system rules
// Research sources: intrepidcoder/monopoly, itaylayzer/Monopoly,
// AniketSanghi/Monopoly-game. Implements:
//   1. Buy-vs-skip heuristic (cash-multiple + color-group completion + ROI)
//   2. House-building strategy (greedy ROI on completed monopolies)
//   3. Positional evaluation function (cash + equity + liquidity)
//   4. Coalition "personality" for surprising, non-deterministic plays
// ============================================================

import {
  BOARD_TILES,
  COALITIONS,
  COLOR_GROUP_HEX,
  type Tile,
  type ColorGroup,
} from './game-data';

export interface AIContext {
  player: {
    id: string;
    coalitionId: string;
    name: string;
    money: number;
    properties: number[];
    isInJail: boolean;
    jailTurns: number;
    hasGetOutOfJailFree: boolean;
    isBankrupt: boolean;
  };
  tiles: Tile[];                 // current tile states (owner, houses)
  mortgagedTiles: number[];
  opponents: Array<{
    id: string;
    coalitionId: string;
    money: number;
    properties: number[];
    position: number;
  }>;
  marketInflation: number;       // marketState.inflationMultiplier
  turnCount: number;
}

// ───────────────────────────────────────────────────────────────────
// POSITIONAL EVALUATION — a chess-like score for "how well am I doing?"
// Used to compare decision branches. Higher = better.
// ───────────────────────────────────────────────────────────────────

export function evaluatePosition(ctx: AIContext, playerId: string): number {
  const player = ctx.opponents.find((o) => o.id === playerId) ? null : null;
  const me =
    ctx.player.id === playerId
      ? ctx.player
      : ctx.opponents.find((o) => o.id === playerId);
  if (!me) return -Infinity;

  let score = 0;

  // 1. Cash (liquidity) — weighted but with diminishing returns
  score += Math.min(me.money, 2000) * 0.5;
  score += Math.max(0, me.money - 2000) * 0.2;

  // 2. Property equity (purchase price paid)
  for (const tileId of me.properties) {
    const tile = BOARD_TILES[tileId];
    if (!tile) continue;
    score += (tile.price ?? 0) * 0.8;
    // Bonus for houses built
    const liveTile = ctx.tiles[tileId];
    const houses = liveTile?.houses ?? 0;
    score += houses * (tile.housePrice ?? 0) * 1.2;
  }

  // 3. Monopoly bonus — owning a full color group is huge
  const colorGroups = new Set<ColorGroup>();
  for (const tileId of me.properties) {
    const t = BOARD_TILES[tileId];
    if (t?.colorGroup) colorGroups.add(t.colorGroup);
  }
  for (const cg of colorGroups) {
    const groupTiles = BOARD_TILES.filter((t) => t.colorGroup === cg);
    const ownsAll = groupTiles.every((t) => me.properties.includes(t.id));
    if (ownsAll) {
      // Monopoly! Big bonus, scaled by group value
      const groupValue = groupTiles.reduce((s, t) => s + (t.price ?? 0), 0);
      score += groupValue * 1.5;
    }
  }

  // 4. Jail penalty
  if ('isInJail' in me && (me as any).isInJail) score -= 150;

  // 5. Opponent threat — if opponents are much richer, dock score
  const opponentTotal = ctx.opponents.reduce((s, o) => s + o.money, 0);
  const opponentProps = ctx.opponents.reduce((s, o) => s + o.properties.length, 0);
  if (opponentTotal > me.money * 2) score -= 200;
  if (opponentProps > me.properties.length * 2) score -= 150;

  return score;
}

// ───────────────────────────────────────────────────────────────────
// BUY DECISION — expert-system rules + ROI + personality
// Returns true if the AI should buy the property.
// ───────────────────────────────────────────────────────────────────

interface BuyDecision {
  shouldBuy: boolean;
  reason: string;
}

export function decideBuy(ctx: AIContext, tile: Tile): BuyDecision {
  if (!tile.price) return { shouldBuy: false, reason: 'Not for sale' };

  const me = ctx.player;
  const cashAfter = me.money - tile.price;

  // Rule 1: Never buy if it would leave us without a cash buffer
  // Buffer scales with game stage (early game = more risk allowed)
  const minBuffer = ctx.turnCount < 5 ? 100 : ctx.turnCount < 15 ? 200 : 300;
  if (cashAfter < minBuffer) {
    return { shouldBuy: false, reason: `Keep RM${minBuffer} buffer` };
  }

  let score = 0;
  const reasons: string[] = [];

  // Rule 2: Cash-multiple heuristic (intrepidcoder-style)
  // Buy if cash > 3× price (comfortable affordability)
  if (me.money > tile.price * 3) {
    score += 30;
    reasons.push('affordable');
  } else if (me.money > tile.price * 2) {
    score += 15;
    reasons.push('ok-budget');
  } else {
    score -= 20;
    reasons.push('tight-budget');
  }

  // Rule 3: Color-group completion bonus (completing a monopoly is top priority)
  if (tile.colorGroup) {
    const groupTiles = BOARD_TILES.filter((t) => t.colorGroup === tile.colorGroup);
    const ownedInGroup = groupTiles.filter((t) => me.properties.includes(t.id)).length;
    const othersOwned = groupTiles.filter(
      (t) => t.id !== tile.id && me.properties.includes(t.id),
    ).length;
    if (ownedInGroup === groupTiles.length - 1 && othersOwned === groupTiles.length - 1) {
      // Buying this completes the monopoly!
      score += 80;
      reasons.push('completes-monopoly');
    } else if (othersOwned > 0) {
      // Already have some in this group
      score += 25;
      reasons.push('extends-group');
    } else {
      // First in group — neutral
      score += 5;
    }

    // Block opponents from completing a monopoly
    for (const opp of ctx.opponents) {
      const oppOwnedInGroup = groupTiles.filter(
        (t) => t.id !== tile.id && opp.properties.includes(t.id),
      ).length;
      if (oppOwnedInGroup === groupTiles.length - 1) {
        score += 35;
        reasons.push(`blocks-${opp.coalitionId}`);
        break;
      }
    }
  }

  // Rule 4: ROI — rent-to-price ratio (AniketSanghi-style greedy)
  if (tile.rent && tile.rent[0] && tile.price) {
    const roi = tile.rent[0] / tile.price;
    if (roi > 0.08) {
      score += 20;
      reasons.push('high-roi');
    } else if (roi > 0.05) {
      score += 10;
      reasons.push('decent-roi');
    } else {
      score -= 5;
      reasons.push('low-roi');
    }
  }

  // Rule 5: Highway/Media (railroad/utility equivalent) — good if cheap, scale with count
  if (tile.type === 'highway' || tile.type === 'media') {
    const ownedCount = me.properties.filter((pid) => BOARD_TILES[pid]?.type === tile.type).length;
    if (ownedCount >= 1) {
      score += 20 + ownedCount * 10; // 2nd/3rd highway is very valuable
      reasons.push(`owns-${ownedCount}-in-type`);
    } else {
      score += 8;
      reasons.push('first-in-type');
    }
  }

  // Rule 6: Dark blue (Federal Power — Putrajaya/KL) is the endgame powerhouse
  if (tile.colorGroup === 'darkblue') {
    score += 15;
    reasons.push('federal-power');
  }

  // Rule 7: Market inflation makes property a better hedge
  if (ctx.marketInflation > 1.1) {
    score += 8;
    reasons.push('inflation-hedge');
  }

  // Rule 8: Coalition personality — surprising, non-deterministic plays
  const personality = getCoalitionPersonality(me.coalitionId);
  score += personality.aggressionBonus;
  // Small random variance so the AI isn't 100% predictable
  score += (Math.random() - 0.5) * personality.variance;

  const shouldBuy = score >= 25;
  return {
    shouldBuy,
    reason: shouldBuy
      ? `Buy (${reasons.join(', ')}, score ${score.toFixed(0)})`
      : `Pass (${reasons.join(', ')}, score ${score.toFixed(0)})`,
  };
}

// ───────────────────────────────────────────────────────────────────
// HOUSE-BUILDING DECISION — greedy ROI on completed monopolies
// Returns the tile IDs where the AI should build a house, in priority order.
// ───────────────────────────────────────────────────────────────────

export function decideBuild(ctx: AIContext): number[] {
  const me = ctx.player;
  const builds: number[] = [];
  const personality = getCoalitionPersonality(me.coalitionId);
  const minBuffer = ctx.turnCount < 10 ? 200 : 300;

  // Find all completed color groups
  const colorGroups = new Set<ColorGroup>();
  for (const tileId of me.properties) {
    const t = BOARD_TILES[tileId];
    if (t?.colorGroup) colorGroups.add(t.colorGroup);
  }

  const buildableTiles: Array<{ tile: Tile; liveTile: Tile; priority: number }> = [];

  for (const cg of colorGroups) {
    const groupTiles = BOARD_TILES.filter((t) => t.colorGroup === cg);
    const ownsAll = groupTiles.every((t) => me.properties.includes(t.id));
    if (!ownsAll) continue;

    for (const t of groupTiles) {
      const liveTile = ctx.tiles[t.id];
      const houses = liveTile?.houses ?? 0;
      if (houses >= 5) continue; // already hotel
      if (ctx.mortgagedTiles.includes(t.id)) continue;
      if (!t.housePrice) continue;
      if (me.money - t.housePrice < minBuffer) continue;

      // Priority: even-build across the group (Monopoly rule), but prefer
      // cheaper tiles first for faster ROI. Boost high-rent groups.
      let priority = 0;
      if (t.rent && t.rent[0] && t.housePrice) {
        priority = (t.rent[houses] ?? 0) / t.housePrice; // ROI of next house
      }
      // Dark blue & green get extra priority (high late-game rent)
      if (cg === 'darkblue') priority *= 1.5;
      if (cg === 'green') priority *= 1.2;
      // Aggressive coalitions build more
      priority *= 1 + personality.buildAggression * 0.3;

      buildableTiles.push({ tile: t, liveTile: liveTile ?? t, priority });
    }
  }

  // Sort by priority descending
  buildableTiles.sort((a, b) => b.priority - a.priority);

  // Even-build rule: don't let any tile get more than 1 ahead of others in its group
  for (const { tile } of buildableTiles) {
    if (me.money - (tile.housePrice ?? 0) < minBuffer) break;
    const liveTile = ctx.tiles[tile.id];
    const myHouses = liveTile?.houses ?? 0;
    // Check other tiles in same group aren't more than 1 house behind
    const groupTiles = BOARD_TILES.filter((t) => t.colorGroup === tile.colorGroup);
    const minInGroup = Math.min(
      ...groupTiles.map((t) => ctx.tiles[t.id]?.houses ?? 0),
    );
    if (myHouses > minInGroup) continue; // would violate even-build

    builds.push(tile.id);
    // Deduct virtually for the next iteration's buffer check
    me.money -= tile.housePrice ?? 0;
  }

  return builds;
}

// ───────────────────────────────────────────────────────────────────
// JAIL DECISION — pay bail or try for doubles?
// ───────────────────────────────────────────────────────────────────

export function decideJail(ctx: AIContext): { payBail: boolean; reason: string } {
  const me = ctx.player;

  // Always use Get Out of Jail Free card if we have one
  if (me.hasGetOutOfJailFree) {
    return { payBail: false, reason: 'Use Get Out of Jail Free card' };
  }

  // Early game with cheap properties — stay in jail (safe income collection)
  if (ctx.turnCount < 10 && me.properties.length < 3) {
    return { payBail: false, reason: 'Wait it out (early game)' };
  }

  // Late game or if we have monopolies to develop — pay bail to keep moving
  if (me.money > 100 && (ctx.turnCount > 15 || me.properties.length > 5)) {
    return { payBail: true, reason: 'Pay RM50 bail to keep building' };
  }

  // If we can't afford bail comfortably, wait
  if (me.money < 150) {
    return { payBail: false, reason: "Can't afford bail" };
  }

  // Default: 60% pay, 40% wait (slight aggression)
  return Math.random() < 0.6
    ? { payBail: true, reason: 'Pay bail' }
    : { payBail: false, reason: 'Try for doubles' };
}

// ───────────────────────────────────────────────────────────────────
// COALITION PERSONALITY — surprising, flavourful behaviour
// Each coalition has an aggression/strategy profile so they don't all
// play identically.
// ───────────────────────────────────────────────────────────────────

interface CoalitionPersonality {
  aggressionBonus: number;     // added to buy score
  buildAggression: number;     // 0..1 multiplier for house-building
  variance: number;            // randomness in decisions
  description: string;
}

const PERSONALITIES: Record<string, CoalitionPersonality> = {
  // PH — reformist, cautious but strategic
  PH: { aggressionBonus: 3, buildAggression: 0.5, variance: 12, description: 'Reformist strategist' },
  // PN — green wave, aggressive expansion
  PN: { aggressionBonus: 10, buildAggression: 0.8, variance: 18, description: 'Aggressive expansionist' },
  // BN — old guard, experienced, steady
  BN: { aggressionBonus: 5, buildAggression: 0.6, variance: 8, description: 'Steady old guard' },
  // GPS — Sarawak kingmaker, opportunistic
  GPS: { aggressionBonus: 7, buildAggression: 0.7, variance: 15, description: 'Opportunistic kingmaker' },
  // GRS — Sabah, flexible and unpredictable
  GRS: { aggressionBonus: 8, buildAggression: 0.65, variance: 22, description: 'Unpredictable sabahan' },
  // IND — independent, chaotic
  IND: { aggressionBonus: 0, buildAggression: 0.4, variance: 30, description: 'Chaotic independent' },
};

export function getCoalitionPersonality(coalitionId: string): CoalitionPersonality {
  return (
    PERSONALITIES[coalitionId] ?? {
      aggressionBonus: 0,
      buildAggression: 0.5,
      variance: 15,
      description: 'Balanced',
    }
  );
}

// ───────────────────────────────────────────────────────────────────
// AUCTION BID DECISION — how much to bid on a property at auction
// ───────────────────────────────────────────────────────────────────

export function decideAuctionBid(
  ctx: AIContext,
  tile: Tile,
  currentBid: number,
  minIncrement: number,
): { bid: number; reason: string } {
  const me = ctx.player;
  const personality = getCoalitionPersonality(me.coalitionId);
  const minBuffer = ctx.turnCount < 10 ? 150 : 250;

  // Base value: the property price, adjusted by buy-score factors
  const buyDecision = decideBuy(ctx, tile);
  if (!buyDecision.shouldBuy && currentBid > 0) {
    return { bid: 0, reason: "Don't want this property" };
  }

  // Max we're willing to pay: price * factor, capped by affordability
  let maxBid = (tile.price ?? 0) * (0.8 + personality.buildAggression * 0.4);
  if (tile.colorGroup) {
    // Completing a monopoly at auction is worth a premium
    const groupTiles = BOARD_TILES.filter((t) => t.colorGroup === tile.colorGroup);
    const ownedInGroup = groupTiles.filter((t) => me.properties.includes(t.id)).length;
    if (ownedInGroup === groupTiles.length - 1) {
      maxBid = (tile.price ?? 0) * 1.5; // pay 50% premium to complete
    }
  }
  maxBid = Math.min(maxBid, me.money - minBuffer);

  const nextBid = currentBid + minIncrement;
  if (nextBid > maxBid) {
    return { bid: 0, reason: `Max bid RM${maxBid.toFixed(0)} exceeded` };
  }

  // Add a small surprise factor — sometimes bid slightly above min to psyche out opponents
  const surprise = Math.random() < 0.2 ? minIncrement : 0;
  const finalBid = nextBid + surprise;

  return {
    bid: finalBid,
    reason: `Bid RM${finalBid} (max RM${maxBid.toFixed(0)})`,
  };
}
