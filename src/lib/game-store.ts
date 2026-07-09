import { create } from 'zustand';
import {
  BOARD_TILES,
  COALITIONS,
  JAWATAN_MENTERI_CARDS,
  KRISIS_NASIONAL_CARDS,
  DEFAULT_MARKET_STATE,
  getRandomQuote,
  type Tile,
  type Coalition,
  type GameCard,
  type MarketState,
  type ColorGroup,
} from './game-data';
import {
  decideBuy,
  decideBuild,
  decideJail,
  decideAuctionBid,
  getCoalitionPersonality,
  type AIContext,
} from './ai-engine';
import { NARRATIONS } from './narrations';
import { gameFeel, flashScreen } from './game-feel';

// --- Types ---
export interface Player {
  id: string;
  coalitionId: string;
  name: string;
  position: number;
  money: number;
  isAI: boolean;
  isInJail: boolean;
  jailTurns: number;
  hasGetOutOfJailFree: boolean;
  properties: number[]; // tile IDs owned
  isBankrupt: boolean;
  quote?: string;
  avatarEmoji: string;
}

export type GamePhase = 'lobby' | 'playing' | 'rolling' | 'moving' | 'landed' | 'buying' | 'paying_rent' | 'card' | 'jail_decision' | 'auction' | 'managing' | 'game_over';

export interface AuctionState {
  tileId: number;
  highestBid: number;
  highestBidder: string | null;
  currentBidderIndex: number;
  bidderOrder: string[];
  isActive: boolean;
}

export interface GameLogEntry {
  id: string;
  turn: number;
  playerId: string;
  playerName: string;
  message: string;
  type: 'move' | 'buy' | 'rent' | 'card' | 'jail' | 'bankrupt' | 'ai_quote' | 'system' | 'tax' | 'pass_go' | 'auction';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlockedAt: number | null;
}

export interface GameStats {
  timesJailed: number;
  auctionsWon: number;
  highestRentPaid: number;
}

export interface GameState {
  // Game setup
  phase: GamePhase;
  players: Player[];
  tiles: Tile[];
  turnOrder: string[];
  currentTurnIndex: number;
  turnCount: number;
  diceValues: [number, number] | null;
  isDoubles: boolean;
  consecutiveDoubles: number;

  // Cards
  jawatanMenteriDeck: GameCard[];
  krisisNasionalDeck: GameCard[];

  // Market
  marketState: MarketState;

  // UI State
  selectedTileId: number | null;
  currentCard: GameCard | null;
  currentRentPayment: { from: string; to: string; amount: number } | null;
  gameLog: GameLogEntry[];
  winner: string | null;
  aiThinking: boolean;
  showPortfolio: boolean;

  // Narration (political soap opera pop-ups)
  currentNarration: { id: number; text: string; category: string } | null;

  // Auction
  auctionState: AuctionState | null;

  // Mortgage
  mortgagedTiles: number[];

  // AI Speed (1=normal, 2=fast, 3=fastest)
  aiSpeed: number;

  // Achievements
  achievements: Achievement[];
  stats: GameStats;

  // Trade
  tradeState: {
    initiator: string | null;
    responder: string | null;
    offeredProperties: number[];
    offeredCash: number;
    requestedProperties: number[];
    requestedCash: number;
    isActive: boolean;
  } | null;

  // Net worth history — array of {turn, netWorths: Record<playerId, number>}
  // Recorded at the end of each turn for the in-game wealth chart.
  netWorthHistory: { turn: number; netWorths: Record<string, number> }[];

  // Show in-game wealth chart (toggle)
  showWealthChart: boolean;

  // House/hotel supply limits (classic Monopoly: 32 houses, 12 hotels)
  housesAvailable: number;
  hotelsAvailable: number;

  // Free Parking "Rakyat Fund" jackpot — accumulates taxes & fines, won on landing tile 20
  centerPot: number;

  // Income tax choice pending — when player lands on tile 4, they choose 10% or RM200
  pendingTaxChoice: { tileId: number; playerId: string } | null;

  // Game start timestamp (for duration tracking on victory screen)
  gameStartTime: number | null;

  // Pending AI-initiated trade offer (shown to human player)
  pendingAITrade: {
    fromPlayerId: string;
    toPlayerId: string;
    offeredProperties: number[];
    offeredCash: number;
    requestedProperties: number[];
    requestedCash: number;
    reason: string;
  } | null;

  // Actions
  startGame: (coalitionId: string, customParty?: { name: string; fullName: string; slogan: string; color: string; logo: string }) => void;
  rollDice: () => void;
  movePlayer: () => void;
  handleLanding: () => void;
  buyProperty: () => void;
  skipBuy: () => void;
  payRent: () => void;
  drawCard: (type: 'chest' | 'chance') => GameCard;
  applyCard: (card: GameCard) => void;
  endTurn: () => void;
  handleJailDecision: (pay: boolean) => void;
  selectTile: (tileId: number | null) => void;
  addLog: (entry: Omit<GameLogEntry, 'id' | 'turn'>) => void;
  setAIThinking: (thinking: boolean) => void;
  triggerNarration: (category: string) => void;
  clearNarration: () => void;
  aiTurn: () => Promise<void>;
  getMarketState: () => MarketState;
  buildHouse: (tileId: number) => void;
  sellProperty: (tileId: number) => void;
  togglePortfolio: () => void;
  startAuction: (tileId: number) => void;
  placeBid: (playerId: string, amount: number) => void;
  passBid: (playerId: string) => void;
  resolveAuction: () => void;
  aiAuctionTurn: () => void;
  mortgageProperty: (tileId: number) => void;
  unmortgageProperty: (tileId: number) => void;
  setAISpeed: (speed: number) => void;
  unlockAchievement: (id: string) => void;
  saveGame: () => void;
  loadGame: () => boolean;
  hasSavedGame: () => boolean;
  enterManaging: () => void;
  exitManaging: () => void;
  simulateMarket: () => void;
  initiateTrade: (targetPlayerId: string) => void;
  updateTradeOffer: (offeredProperties: number[], offeredCash: number, requestedProperties: number[], requestedCash: number) => void;
  acceptTrade: () => void;
  rejectTrade: () => void;
  aiTradeResponse: () => void;
  toggleWealthChart: () => void;
  recordNetWorth: () => void;
  handleBankruptcy: (bankruptPlayerId: string, creditorId?: string) => void;
  resolveTaxChoice: (useFlat: boolean) => void;
  checkAutoWin: () => boolean;
  aiInitiateTrade: () => void;
  acceptAITrade: () => void;
  rejectAITrade: () => void;
}

function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function calculateRent(tile: Tile, owner: Player, marketState: MarketState, mortgagedTiles: number[]): number {
  if (!tile.rent || tile.rent.length === 0) return 0;

  // Mortgaged properties produce no rent
  if (mortgagedTiles.includes(tile.id)) return 0;

  // Highway: count owned highways
  if (tile.type === 'highway') {
    const highwayTiles = BOARD_TILES.filter(t => t.type === 'highway');
    const ownedCount = highwayTiles.filter(t => owner.properties.includes(t.id)).length;
    const baseRent = tile.rent[Math.min(ownedCount - 1, tile.rent.length - 1)] || tile.rent[0];
    return Math.round(baseRent * marketState.inflationMultiplier);
  }

  // Media: count owned media
  if (tile.type === 'media') {
    const mediaTiles = BOARD_TILES.filter(t => t.type === 'media');
    const ownedCount = mediaTiles.filter(t => owner.properties.includes(t.id)).length;
    const baseRent = tile.rent[Math.min(ownedCount - 1, tile.rent.length - 1)] || tile.rent[0];
    return Math.round(baseRent * marketState.inflationMultiplier);
  }

  // Regular property
  const houses = tile.houses || 0;
  const baseRent = tile.rent[Math.min(houses, tile.rent.length - 1)] || tile.rent[0];
  
  // Check if owner has full color group — monopoly doubles rent (classic Monopoly)
  if (tile.colorGroup) {
    const colorGroupTiles = BOARD_TILES.filter(t => t.colorGroup === tile.colorGroup);
    const ownsAll = colorGroupTiles.every(t => owner.properties.includes(t.id));
    if (ownsAll) {
      // Monopoly bonus: 2x base rent when no houses, 1.5x when houses (houses already multiply)
      if (houses === 0) {
        return Math.round(baseRent * 2 * marketState.inflationMultiplier);
      } else {
        return Math.round(baseRent * 1.5 * marketState.inflationMultiplier);
      }
    }
  }

  // Federal power bonus
  if (tile.colorGroup === 'darkblue') {
    return Math.round(baseRent * marketState.federalRentBonus * marketState.inflationMultiplier);
  }

  return Math.round(baseRent * marketState.inflationMultiplier);
}

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_property', name: 'First Seat Won', description: 'Buy your first property', emoji: '🏛️', unlockedAt: null },
  { id: 'landlord', name: 'Full Color Set', description: 'Own all properties in a color group', emoji: '🌈', unlockedAt: null },
  { id: 'hotel_mogul', name: 'Hotel Mogul', description: 'Build a hotel on any property', emoji: '🏨', unlockedAt: null },
  { id: 'banker', name: 'Money Bags', description: 'Accumulate RM3000+', emoji: '💰', unlockedAt: null },
  { id: 'jailbird', name: 'Jailbird', description: 'Go to jail 3 times', emoji: '⛓️', unlockedAt: null },
  { id: 'auction_king', name: 'Auction King', description: 'Win 3 auctions', emoji: '🔨', unlockedAt: null },
  { id: 'survivor', name: 'Survivor', description: 'Still in game after 10 rounds', emoji: '🏆', unlockedAt: null },
  { id: 'monopolist', name: 'Monopolist', description: 'Own 10+ properties', emoji: '👑', unlockedAt: null },
  { id: 'high_roller', name: 'High Roller', description: 'Pay over RM500 in a single rent payment', emoji: '🎰', unlockedAt: null },
];

const AI_COALITION_EMOJIS: Record<string, string> = {
  PH: '🏛️', PN: '🕌', BN: '⭐', GPS: '🦅', GRS: '🏝️', IND: '👤',
};

/**
 * Build the AIContext object from current game state, for the AI engine
 * to make buy/build/jail/auction decisions.
 */
function buildAIContext(state: GameState, playerId: string): AIContext {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    return {
      player: {
        id: playerId, coalitionId: 'IND', name: '', money: 0, properties: [],
        isInJail: false, jailTurns: 0, hasGetOutOfJailFree: false, isBankrupt: true,
      },
      tiles: state.tiles,
      mortgagedTiles: state.mortgagedTiles,
      opponents: [],
      marketInflation: state.marketState.inflationMultiplier,
      turnCount: state.turnCount,
    };
  }
  return {
    player: {
      id: player.id,
      coalitionId: player.coalitionId,
      name: player.name,
      money: player.money,
      properties: player.properties,
      isInJail: player.isInJail,
      jailTurns: player.jailTurns,
      hasGetOutOfJailFree: player.hasGetOutOfJailFree,
      isBankrupt: player.isBankrupt,
    },
    tiles: state.tiles,
    mortgagedTiles: state.mortgagedTiles,
    opponents: state.players
      .filter((p) => p.id !== playerId && !p.isBankrupt)
      .map((p) => ({
        id: p.id,
        coalitionId: p.coalitionId,
        money: p.money,
        properties: p.properties,
        position: p.position,
      })),
    marketInflation: state.marketState.inflationMultiplier,
    turnCount: state.turnCount,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'lobby',
  players: [],
  tiles: BOARD_TILES.map(t => ({ ...t })),
  turnOrder: [],
  currentTurnIndex: 0,
  turnCount: 0,
  diceValues: null,
  isDoubles: false,
  consecutiveDoubles: 0,
  jawatanMenteriDeck: shuffleDeck(JAWATAN_MENTERI_CARDS),
  krisisNasionalDeck: shuffleDeck(KRISIS_NASIONAL_CARDS),
  marketState: DEFAULT_MARKET_STATE,
  selectedTileId: null,
  currentCard: null,
  currentRentPayment: null,
  gameLog: [],
  winner: null,
  aiThinking: false,
  showPortfolio: false,
  currentNarration: null,
  auctionState: null,
  mortgagedTiles: [],
  aiSpeed: 1,
  achievements: INITIAL_ACHIEVEMENTS.map(a => ({ ...a })),
  stats: { timesJailed: 0, auctionsWon: 0, highestRentPaid: 0 },
  tradeState: null,
  netWorthHistory: [],
  showWealthChart: false,
  housesAvailable: 32,
  hotelsAvailable: 12,
  centerPot: 0,
  pendingTaxChoice: null,
  gameStartTime: null,
  pendingAITrade: null,

  startGame: (playerCoalitionId: string, customParty?: { name: string; fullName: string; slogan: string; color: string; logo: string }) => {
    // If custom party, register it in COALITIONS at runtime
    if (playerCoalitionId === 'CUSTOM' && customParty) {
      COALITIONS['CUSTOM'] = {
        id: 'CUSTOM',
        name: customParty.name,
        fullName: customParty.fullName,
        color: customParty.color,
        textColor: '#ffffff',
        emblem: '🏛️',
        logo: customParty.logo,
        slogan: customParty.slogan,
      };
    }

    const allCoalitionIds = Object.keys(COALITIONS);
    // AI gets the 5 preset coalitions (PH, PN, BN, GPS, GRS) — no CUSTOM for AI
    const aiCoalitions = allCoalitionIds.filter(c => c !== playerCoalitionId && c !== 'IND' && c !== 'CUSTOM');

    const player: Player = {
      id: 'player',
      coalitionId: playerCoalitionId,
      name: COALITIONS[playerCoalitionId].name,
      position: 0,
      money: 1500,
      isAI: false,
      isInJail: false,
      jailTurns: 0,
      hasGetOutOfJailFree: false,
      properties: [],
      isBankrupt: false,
      avatarEmoji: '🎮',
    };

    const aiPlayers: Player[] = aiCoalitions.map((cId, i) => ({
      id: `ai_${cId}`,
      coalitionId: cId,
      name: COALITIONS[cId].name,
      position: 0,
      money: 1500,
      isAI: true,
      isInJail: false,
      jailTurns: 0,
      hasGetOutOfJailFree: false,
      properties: [],
      isBankrupt: false,
      avatarEmoji: AI_COALITION_EMOJIS[cId] || '🤖',
    }));

    const allPlayers = [player, ...aiPlayers];
    const turnOrder = allPlayers.map(p => p.id);

    set({
      phase: 'playing',
      players: allPlayers,
      turnOrder,
      currentTurnIndex: 0,
      turnCount: 1,
      gameLog: [{
        id: crypto.randomUUID(),
        turn: 1,
        playerId: 'system',
        playerName: 'System',
        message: '🗳️ Pilihan Raya dimulakan! The game has begun!',
        type: 'system',
      }],
      netWorthHistory: [{
        turn: 1,
        netWorths: Object.fromEntries(allPlayers.map(p => [p.id, p.money])),
      }],
      housesAvailable: 32,
      hotelsAvailable: 12,
      centerPot: 0,
      pendingTaxChoice: null,
      gameStartTime: Date.now(),
      pendingAITrade: null,
    });
  },

  rollDice: () => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const doubles = d1 === d2;
    const state = get();
    const newConsecutive = doubles ? state.consecutiveDoubles + 1 : 0;

    set({
      diceValues: [d1, d2],
      isDoubles: doubles,
      consecutiveDoubles: newConsecutive,
      phase: 'rolling',
    });

    // Game feel: dice roll shake + FOV punch
    gameFeel.onDiceRoll();

    // Check for 3 consecutive doubles = go to jail
    if (newConsecutive >= 3) {
      const cp = state.players.find(p => p.id === state.turnOrder[state.currentTurnIndex]);
      if (cp) {
        set(state => ({
          players: state.players.map(p =>
            p.id === cp.id ? { ...p, position: 10, isInJail: true, jailTurns: 0 } : p
          ),
          phase: 'jail_decision',
        }));
        get().addLog({
          playerId: cp.id,
          playerName: cp.name,
          message: `🎲 Tiga kali doubles! ${cp.name} dihantar ke Tahanan SPRM! (3 consecutive doubles = jail)`,
          type: 'jail',
        });
      }
      return;
    }

    // Auto-move after short delay is handled by the UI
    setTimeout(() => get().movePlayer(), 800);
  },

  movePlayer: () => {
    const state = get();
    const currentPlayerId = state.turnOrder[state.currentTurnIndex];
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player || !state.diceValues) return;

    const total = state.diceValues[0] + state.diceValues[1];
    let newPosition = player.position + total;

    // Pass GO
    if (newPosition >= 40) {
      newPosition = newPosition % 40;
      set(state => ({
        players: state.players.map(p =>
          p.id === currentPlayerId ? { ...p, money: p.money + 200 } : p
        ),
      }));
      get().addLog({
        playerId: currentPlayerId,
        playerName: player.name,
        message: `💰 Lalu Pilihan Raya! Collected RM200 campaign funds from KWSP Bank!`,
        type: 'pass_go',
      });
    }

    set(state => ({
      players: state.players.map(p =>
        p.id === currentPlayerId ? { ...p, position: newPosition } : p
      ),
      phase: 'moving',
    }));

    // After movement animation, handle landing
    setTimeout(() => get().handleLanding(), 1500);
  },

  handleLanding: () => {
    const state = get();
    const currentPlayerId = state.turnOrder[state.currentTurnIndex];
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player) return;

    const tile = state.tiles[player.position];

    // Go to Jail tile
    if (tile.id === 30) {
      set(state => ({
        players: state.players.map(p =>
          p.id === currentPlayerId ? { ...p, position: 10, isInJail: true, jailTurns: 0 } : p
        ),
        phase: 'jail_decision',
      }));
      get().addLog({
        playerId: currentPlayerId,
        playerName: player.name,
        message: `⛓️ ${player.name} disyorkan ke SPR! Off to Tahanan!`,
        type: 'jail',
      });
      // Game feel: sent to jail — medium shake + FOV punch
      gameFeel.onJail();
      flashScreen('#f97316', 0.4, 150); // orange flash
      return;
    }

    // Tax tiles
    if (tile.type === 'tax') {
      // Tile 4 (Cukai SST/GST): offer choice of 10% net worth OR flat RM200
      // Tile 38 (Luxury Tax): fixed RM100
      if (tile.id === 4 && !player.isAI) {
        // Human player — show choice UI
        set({ pendingTaxChoice: { tileId: tile.id, playerId: currentPlayerId } });
        return;
      }
      // AI or Luxury Tax — auto-pay flat amount
      const amount = tile.id === 4 ? 200 : 100;
      const newMoney = player.money - amount;
      set(state => ({
        players: state.players.map(p =>
          p.id === currentPlayerId ? { ...p, money: newMoney } : p
        ),
        centerPot: state.centerPot + amount,
      }));
      get().addLog({
        playerId: currentPlayerId,
        playerName: player.name,
        message: `💸 ${player.name} pays RM${amount} in ${tile.name}! (Added to Rakyat Fund)`,
        type: 'tax',
      });
      if (player.isAI) get().triggerNarration('penalty');

      // Check bankruptcy
      if (newMoney < 0) {
        get().handleBankruptcy(currentPlayerId);
        const activePlayers = get().players.filter(p => !p.isBankrupt);
        if (activePlayers.length <= 1) {
          set({ phase: 'game_over', winner: activePlayers[0]?.id || null });
          return;
        }
      }
      // Check auto-win
      if (get().checkAutoWin()) return;
      set({ phase: 'landed' });
      return;
    }

    // Card tiles
    if (tile.type === 'chest' || tile.type === 'chance') {
      const card = get().drawCard(tile.type === 'chest' ? 'chest' : 'chance');
      set({ currentCard: card, phase: 'card' });
      get().addLog({
        playerId: currentPlayerId,
        playerName: player.name,
        message: `🃏 ${player.name} draws: "${card.title}"`,
        type: 'card',
      });
      // Game feel: card drawn — light shake
      gameFeel.onCardDrawn();
      return;
    }

    // Property / Highway / Media
    if (tile.type === 'property' || tile.type === 'highway' || tile.type === 'media') {
      // Unowned
      if (!tile.owner) {
        if (player.money >= (tile.price || 0)) {
          // Both human and AI land in 'buying' phase.
          // aiTurn (for AI players) uses the expert-system engine in ai-engine.ts
          // to decide buy-vs-skip. The human player clicks Buy/Pass in the UI.
          // NOTE: Do NOT set selectedTileId here — the buying panel already shows
          // full property details. Setting selectedTileId would cause a duplicate
          // "TileDetail" pop-up to overlap the buying panel (visual clutter).
          set({ phase: 'buying' });
        } else {
          get().addLog({
            playerId: currentPlayerId,
            playerName: player.name,
            message: `😅 ${player.name} cannot afford ${tile.name} (RM${tile.price})!`,
            type: 'move',
          });
          set({ phase: 'landed' });
        }
        return;
      }

      // Owned by someone else
      if (tile.owner && tile.owner !== currentPlayerId) {
        const owner = state.players.find(p => p.id === tile.owner);
        if (owner && !owner.isBankrupt) {
          const rent = calculateRent(tile, owner, state.marketState, state.mortgagedTiles);
          set({
            currentRentPayment: { from: currentPlayerId, to: tile.owner, amount: rent },
            phase: 'paying_rent',
          });
          get().addLog({
            playerId: currentPlayerId,
            playerName: player.name,
            message: `🏠 ${player.name} pays RM${rent} rent to ${owner.name} for ${tile.name}!`,
            type: 'rent',
          });
        } else {
          set({ phase: 'landed' });
        }
        return;
      }

      // Owned by self
      set({ phase: 'landed' });
      return;
    }

    // Corner tiles: Free Parking (id 20) = collect Rakyat Fund jackpot
    if (tile.id === 20) {
      const pot = state.centerPot;
      if (pot > 0) {
        set(state => ({
          players: state.players.map(p =>
            p.id === currentPlayerId ? { ...p, money: p.money + pot } : p
          ),
          centerPot: 0,
        }));
        get().addLog({
          playerId: currentPlayerId,
          playerName: player.name,
          message: `👑 ${player.name} landed on Istana Negara and collected RM${pot} from the Rakyat Fund!`,
          type: 'system',
        });
      } else {
        get().addLog({
          playerId: currentPlayerId,
          playerName: player.name,
          message: `👑 ${player.name} visited Istana Negara. The Rakyat Fund is empty.`,
          type: 'move',
        });
      }
      // Check auto-win after collecting pot
      if (get().checkAutoWin()) return;
      set({ phase: 'landed' });
      return;
    }

    // Other corner tiles (GO landing, Jail visiting, Go-to-Jail already handled)
    set({ phase: 'landed' });
  },

  buyProperty: () => {
    const state = get();
    const currentPlayerId = state.turnOrder[state.currentTurnIndex];
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player) return;

    const tile = state.tiles[player.position];
    if (!tile.price || player.money < tile.price) return;

    const newProperties = [...player.properties, tile.id];

    set(state => ({
      players: state.players.map(p =>
        p.id === currentPlayerId
          ? { ...p, money: p.money - tile.price, properties: newProperties }
          : p
      ),
      tiles: state.tiles.map(t =>
        t.id === tile.id ? { ...t, owner: currentPlayerId } : t
      ),
      phase: 'landed',
      selectedTileId: null,
    }));

    get().addLog({
      playerId: currentPlayerId,
      playerName: player.name,
      message: `🏗️ ${player.name} buys ${tile.name} for RM${tile.price}!`,
      type: 'buy',
    });

    // Game feel: property purchased — shake + FOV punch
    gameFeel.onPropertyBought();

    // Achievement: first_property (only for human player)
    if (currentPlayerId === 'player') {
      get().unlockAchievement('first_property');
    }

    // Achievement: landlord — check if player now owns full color group
    if (tile.colorGroup && currentPlayerId === 'player') {
      const colorGroupTiles = BOARD_TILES.filter(t => t.colorGroup === tile.colorGroup);
      const ownsAll = colorGroupTiles.every(t => newProperties.includes(t.id));
      if (ownsAll) {
        get().unlockAchievement('landlord');
        // Game feel: monopoly completed — celebration shake
        gameFeel.onMonopoly();
        flashScreen('#fbbf24', 0.3, 150); // gold flash
      }
    }

    // Achievement: monopolist — 10+ properties
    if (newProperties.length >= 10 && currentPlayerId === 'player') {
      get().unlockAchievement('monopolist');
    }

    // Achievement: banker — money check happens in endTurn

    // Check auto-win (supermajority: 20+ properties)
    get().checkAutoWin();
  },

  skipBuy: () => {
    const state = get();
    const currentPlayerId = state.turnOrder[state.currentTurnIndex];
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player) return;

    const tile = state.tiles[player.position];
    get().addLog({
      playerId: currentPlayerId,
      playerName: player.name,
      message: `🚶 ${player.name} passes on ${tile.name}. Lelangan bermula!`,
      type: 'move',
    });

    set({ selectedTileId: null });
    get().startAuction(tile.id);
  },

  payRent: () => {
    const state = get();
    if (!state.currentRentPayment) return;

    const { from, to, amount } = state.currentRentPayment;
    const payer = state.players.find(p => p.id === from);
    const payee = state.players.find(p => p.id === to);
    if (!payer || !payee) return;

    const payerNew = payer.money - amount;

    if (payerNew < 0) {
      // Payer cannot afford rent → bankruptcy to creditor (payee)
      // Per Monopoly rules: creditor receives ALL of payer's assets (properties + cash + GOOJF card)
      // Payee gets the full rent amount (capped at what payer could pay via asset liquidation)
      set(s => ({
        players: s.players.map(p => {
          if (p.id === from) return { ...p, money: payerNew }; // temporarily negative; handleBankruptcy will zero it
          if (p.id === to) return { ...p, money: p.money + payer.money }; // payee gets whatever cash payer had
          return p;
        }),
        currentRentPayment: null,
      }));
      get().handleBankruptcy(from, to);
      // handleBankruptcy sets game_over if only 1 player left
      if (get().phase !== 'game_over') {
        // Check auto-win (creditor may have inherited enough properties)
        if (get().checkAutoWin()) return;
        set({ phase: 'landed' });
      }
    } else {
      // Normal rent payment
      set(state => ({
        players: state.players.map(p => {
          if (p.id === from) return { ...p, money: payerNew };
          if (p.id === to) return { ...p, money: p.money + amount };
          return p;
        }),
        currentRentPayment: null,
        phase: 'landed',
      }));
      // Game feel: rent paid — shake + hitstop for big payments
      gameFeel.onRentPaid(amount);
    }

    // Achievement: high_roller — player pays > RM500 rent in a single payment
    if (from === 'player' && amount > 500) {
      const currentHighest = get().stats.highestRentPaid;
      if (amount > currentHighest) {
        set(state => ({
          stats: { ...state.stats, highestRentPaid: amount },
        }));
      }
      get().unlockAchievement('high_roller');
    }
  },

  drawCard: (type: 'chest' | 'chance') => {
    const state = get();
    if (type === 'chest') {
      const card = state.jawatanMenteriDeck[0];
      const remaining = state.jawatanMenteriDeck.slice(1);
      if (remaining.length === 0) {
        set({ jawatanMenteriDeck: shuffleDeck(JAWATAN_MENTERI_CARDS), currentCard: card });
      } else {
        set({ jawatanMenteriDeck: remaining, currentCard: card });
      }
      return card;
    } else {
      const card = state.krisisNasionalDeck[0];
      const remaining = state.krisisNasionalDeck.slice(1);
      if (remaining.length === 0) {
        set({ krisisNasionalDeck: shuffleDeck(KRISIS_NASIONAL_CARDS), currentCard: card });
      } else {
        set({ krisisNasionalDeck: remaining, currentCard: card });
      }
      return card;
    }
  },

  applyCard: (card: GameCard) => {
    const state = get();
    const currentPlayerId = state.turnOrder[state.currentTurnIndex];
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player) return;

    const { effect } = card;

    switch (effect.type) {
      case 'money': {
        const newMoney = player.money + effect.value;
        set(state => ({
          players: state.players.map(p =>
            p.id === currentPlayerId ? { ...p, money: newMoney } : p
          ),
          currentCard: null,
          phase: 'landed',
        }));
        // Check bankruptcy (to Bank — no creditor for card-driven money loss)
        if (newMoney < 0) {
          get().handleBankruptcy(currentPlayerId);
          const activePlayers = get().players.filter(p => !p.isBankrupt);
          if (activePlayers.length <= 1) {
            set({ phase: 'game_over', winner: activePlayers[0]?.id || null });
            return;
          }
        }
        // Check auto-win
        if (get().checkAutoWin()) return;
        break;
      }
      case 'move': {
        let newPos = player.position + effect.value;
        if (newPos < 0) newPos += 40;
        if (newPos >= 40) {
          newPos = newPos % 40;
          // Pass GO
          set(state => ({
            players: state.players.map(p =>
              p.id === currentPlayerId ? { ...p, money: p.money + 200, position: newPos } : p
            ),
            currentCard: null,
            phase: 'landed',
          }));
          get().addLog({
            playerId: currentPlayerId,
            playerName: player.name,
            message: `💰 Passed GO during card! +RM200!`,
            type: 'pass_go',
          });
        } else {
          set(state => ({
            players: state.players.map(p =>
              p.id === currentPlayerId ? { ...p, position: newPos } : p
            ),
            currentCard: null,
            phase: 'landed',
          }));
        }
        break;
      }
      case 'go_to': {
        const targetPos = effect.value ?? effect.tileId ?? 0;
        // FIX: Only grant pass-Go bonus if the card explicitly sends player to GO (tile 0)
        // or if moving backwards past tile 0 to a low tile number.
        // The old heuristic `player.position > targetPos` was a false positive —
        // e.g., moving from tile 25 to tile 5 (forward, not crossing GO) incorrectly granted RM200.
        // Correct check: did the path cross tile 0? That only happens if targetPos === 0
        // (card says "go to GO") OR if targetPos is ahead and we wrapped (impossible with go_to).
        const passedGo = targetPos === 0 && player.position !== 0;
        set(state => ({
          players: state.players.map(p =>
            p.id === currentPlayerId
              ? { ...p, position: targetPos, money: passedGo ? p.money + 200 : p.money }
              : p
          ),
          currentCard: null,
        }));
        if (passedGo) {
          get().addLog({
            playerId: currentPlayerId,
            playerName: player.name,
            message: `💰 Passed GO during card! +RM200!`,
            type: 'pass_go',
          });
        }
        // CRITICAL FIX: Trigger handleLanding after position update
        setTimeout(() => get().handleLanding(), 500);
        break;
      }
      case 'jail': {
        set(state => ({
          players: state.players.map(p =>
            p.id === currentPlayerId ? { ...p, position: 10, isInJail: true, jailTurns: 0 } : p
          ),
          currentCard: null,
          phase: 'jail_decision',
        }));
        break;
      }
      case 'collect_all': {
        const amount = effect.value;
        const totalCollected = (state.players.length - 1) * amount;
        set(state => ({
          players: state.players.map(p => {
            if (p.id === currentPlayerId) return { ...p, money: p.money + totalCollected };
            return { ...p, money: p.money - amount };
          }),
          currentCard: null,
          phase: 'landed',
        }));
        break;
      }
      case 'pay_all': {
        const amount = effect.value;
        const totalPaid = (state.players.length - 1) * amount;
        set(state => ({
          players: state.players.map(p => {
            if (p.id === currentPlayerId) return { ...p, money: p.money - totalPaid };
            return { ...p, money: p.money + amount };
          }),
          currentCard: null,
          phase: 'landed',
        }));
        break;
      }
      case 'repair': {
        const cost = effect.value;
        set(state => ({
          players: state.players.map(p =>
            p.id === currentPlayerId ? { ...p, money: p.money - cost } : p
          ),
          currentCard: null,
          phase: 'landed',
        }));
        break;
      }
    }

    // Check all players for bankruptcy after pay_all / collect_all
    if (effect.type === 'collect_all' || effect.type === 'pay_all') {
      const postState = get();
      const bankruptPlayers = postState.players.filter(p => p.money < 0 && !p.isBankrupt);
      // For pay_all: the current player pays everyone else. If any other player goes negative,
      //   they bankrupt to the current player (creditor).
      // For collect_all: the current player collects from everyone else. If current player goes negative
      //   (shouldn't happen — they're gaining). If any other player goes negative, they bankrupt to current player.
      for (const bp of bankruptPlayers) {
        const creditorId = bp.id === currentPlayerId ? undefined : currentPlayerId;
        get().handleBankruptcy(bp.id, creditorId);
      }
      const activePlayers = get().players.filter(p => !p.isBankrupt);
      if (activePlayers.length <= 1) {
        set({ phase: 'game_over', winner: activePlayers[0]?.id || null });
        return;
      }
      // Check auto-win
      if (get().checkAutoWin()) return;
    }

    // Note: money-effect bankruptcy on the current player is already handled
    // in the 'money' case above with handleBankruptcy + winner check.
  },

  endTurn: () => {
    const state = get();
    
    // Check game over
    const activePlayers = state.players.filter(p => !p.isBankrupt);
    if (activePlayers.length <= 1) {
      const winner = activePlayers[0]?.id || null;
      set({ phase: 'game_over', winner });
      return;
    }

    // Next player
    let nextIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
    let nextPlayerId = state.turnOrder[nextIndex];
    let nextPlayer = state.players.find(p => p.id === nextPlayerId);

    // Skip bankrupt players
    let safety = 0;
    while (nextPlayer?.isBankrupt && safety < 10) {
      nextIndex = (nextIndex + 1) % state.turnOrder.length;
      nextPlayerId = state.turnOrder[nextIndex];
      nextPlayer = state.players.find(p => p.id === nextPlayerId);
      safety++;
    }

    const isNextTurn = nextIndex <= state.currentTurnIndex;
    const newTurnCount = isNextTurn ? state.turnCount + 1 : state.turnCount;

    set({
      currentTurnIndex: nextIndex,
      turnCount: newTurnCount,
      diceValues: null,
      isDoubles: false,
      consecutiveDoubles: 0,
      phase: 'playing',
      selectedTileId: null,
    });

    // Achievement: survivor — player still in game after 10 rounds
    const humanPlayer = get().players.find(p => p.id === 'player');
    if (humanPlayer && !humanPlayer.isBankrupt && newTurnCount >= 10) {
      get().unlockAchievement('survivor');
    }

    // Achievement: banker — check if player has RM3000+
    if (humanPlayer && humanPlayer.money >= 3000) {
      get().unlockAchievement('banker');
    }

    // Check auto-win (supermajority: 20+ properties)
    if (get().checkAutoWin()) return;

    // Record net worth snapshot for the wealth chart
    get().recordNetWorth();

    // Auto-save after each turn
    get().saveGame();

    // Simulate market fluctuations at start of each turn
    get().simulateMarket();

    // If next player is AI, auto-play
    if (nextPlayer?.isAI) {
      get().setAIThinking(true);
      const aiDelay = Math.round(500 / state.aiSpeed);
      setTimeout(() => {
        get().aiTurn();
      }, aiDelay);
    }
  },

  handleJailDecision: (pay: boolean) => {
    const state = get();
    const currentPlayerId = state.turnOrder[state.currentTurnIndex];
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player) return;

    // Track jail entry for player (jailTurns === 0 means just entered)
    if (currentPlayerId === 'player' && player.jailTurns === 0) {
      const newTimesJailed = state.stats.timesJailed + 1;
      set(s => ({ stats: { ...s.stats, timesJailed: newTimesJailed } }));
      if (newTimesJailed >= 3) {
        get().unlockAchievement('jailbird');
      }
    }

    if (pay || player.hasGetOutOfJailFree) {
      const cost = pay ? 50 : 0;
      set(state => ({
        players: state.players.map(p =>
          p.id === currentPlayerId
            ? { ...p, money: p.money - cost, isInJail: false, jailTurns: 0, hasGetOutOfJailFree: pay ? p.hasGetOutOfJailFree : false }
            : p
        ),
        phase: 'playing',
      }));
      get().addLog({
        playerId: currentPlayerId,
        playerName: player.name,
        message: `🔓 ${player.name} ${pay ? `pays RM50 bail` : 'uses Get Out of Jail Free card'}!`,
        type: 'jail',
      });
    } else {
      // Try to roll doubles
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      if (d1 === d2) {
        set(state => ({
          players: state.players.map(p =>
            p.id === currentPlayerId ? { ...p, isInJail: false, jailTurns: 0 } : p
          ),
          diceValues: [d1, d2],
          isDoubles: true,
          phase: 'rolling',
        }));
        get().addLog({
          playerId: currentPlayerId,
          playerName: player.name,
          message: `🎲 ${player.name} rolls doubles (${d1},${d2}) and escapes jail!`,
          type: 'jail',
        });
        setTimeout(() => get().movePlayer(), 1500);
      } else {
        const newJailTurns = player.jailTurns + 1;
        const forcedOut = newJailTurns >= 3;
        set(state => ({
          players: state.players.map(p =>
            p.id === currentPlayerId
              ? {
                  ...p,
                  jailTurns: newJailTurns,
                  isInJail: !forcedOut,
                  money: forcedOut ? p.money - 50 : p.money,
                }
              : p
          ),
          diceValues: [d1, d2],
          isDoubles: false,
          phase: forcedOut ? 'landed' : 'jail_decision',
        }));
        get().addLog({
          playerId: currentPlayerId,
          playerName: player.name,
          message: forcedOut
            ? `⏰ ${player.name} serves full sentence! Pays RM50 and is released.`
            : `Dice: ${d1},${d2} — No doubles. ${player.name} remains in Tahanan SPRM. (Turn ${newJailTurns}/3)`,
          type: 'jail',
        });
      }
    }
  },

  selectTile: (tileId: number | null) => {
    set({ selectedTileId: tileId });
  },

  addLog: (entry) => {
    const state = get();
    set({
      gameLog: [
        ...state.gameLog,
        { ...entry, id: crypto.randomUUID(), turn: state.turnCount },
      ],
    });
  },

  setAIThinking: (thinking) => {
    set({ aiThinking: thinking });
  },

  triggerNarration: (category) => {
    // Pick a random narration from the bank for the given category
    const pool = NARRATIONS.filter((n) => n.category === category);
    const fallback = NARRATIONS.filter((n) => n.category === 'general');
    const arr = pool.length > 0 ? pool : fallback;
    if (arr.length === 0) return;
    const narration = arr[Math.floor(Math.random() * arr.length)];
    set({ currentNarration: { id: narration.id, text: narration.text, category: narration.category } });
    // Auto-clear after 4.5s
    setTimeout(() => {
      const current = get().currentNarration;
      if (current && current.id === narration.id) {
        set({ currentNarration: null });
      }
    }, 4500);
  },

  clearNarration: () => {
    set({ currentNarration: null });
  },

  aiTurn: async () => {
    const state = get();
    const speed = state.aiSpeed;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, Math.round(ms / (speed * 2))));

    /**
     * Phase-polling wait: blocks until the game phase matches one of the
     * target phases, polling every `intervalMs`. Returns the matched phase
     * or null if `timeoutMs` elapses. This replaces fragile fixed delays
     * that desync from the token-hop animation duration.
     */
    const waitForPhase = async (
      targetPhases: string[],
      timeoutMs = 5000,
      intervalMs = 150,
    ): Promise<string | null> => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const ph = get().phase;
        if (targetPhases.includes(ph)) return ph;
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      return null;
    };

    const currentPlayerId = state.turnOrder[state.currentTurnIndex];
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player || !player.isAI || player.isBankrupt) {
      get().setAIThinking(false);
      get().endTurn();
      return;
    }

    get().setAIThinking(true);
    const personality = getCoalitionPersonality(player.coalitionId);

    // ── Narration: AI thinking ──
    get().triggerNarration('ai_thinking');

    // ── 1. JAIL DECISION (expert system) ──
    if (player.isInJail) {
      const ctx = buildAIContext(get(), currentPlayerId);
      const { payBail, reason } = decideJail(ctx);
      get().triggerNarration('jail');
      get().addLog({
        playerId: currentPlayerId,
        playerName: player.name,
        message: `⛓️ ${player.name}: ${reason}`,
        type: 'jail',
      });
      get().handleJailDecision(payBail);
      await delay(800);

      // If still in jail_decision, end turn
      if (get().phase === 'jail_decision') {
        get().setAIThinking(false);
        get().endTurn();
        return;
      }
      // If we got out via bail, still need to roll & move this turn
    }

    // ── 2. ROLL DICE ──
    get().rollDice();

    // Wait for the move pipeline to reach a decision phase or terminal.
    // rollDice → (800ms) → movePlayer → (1500ms) → handleLanding → buying/rent/card/landed
    await waitForPhase(
      ['buying', 'paying_rent', 'card', 'landed', 'jail_decision', 'game_over', 'auction'],
      6000,
    );
    await delay(200); // small breathe for UI

    let phase = get().phase;

    // ── 3. BUY DECISION (expert system) ──
    if (phase === 'buying') {
      const ctx = buildAIContext(get(), currentPlayerId);
      const tile = get().tiles[get().players.find(p => p.id === currentPlayerId)?.position ?? 0];
      const decision = decideBuy(ctx, tile);
      const quote = getRandomQuote(player.coalitionId);

      get().addLog({
        playerId: currentPlayerId,
        playerName: player.name,
        message: `🤖 ${player.name}: ${decision.reason} — "${quote}"`,
        type: 'ai_quote',
      });

      if (decision.shouldBuy) {
        get().triggerNarration('buy');
        get().buyProperty();
      } else {
        get().triggerNarration('skip');
        get().skipBuy();
      }
      await delay(400);

      // After buy/skip, wait for resulting phase (skipBuy → auction)
      await waitForPhase(
        ['auction', 'landed', 'playing', 'paying_rent', 'game_over'],
        5000,
      );
      phase = get().phase;
    }

    // ── 4. PAY RENT ──
    if (phase === 'paying_rent') {
      get().triggerNarration('rent');
      get().payRent();
      await delay(400);
      await waitForPhase(['landed', 'playing', 'game_over', 'auction'], 4000);
      phase = get().phase;
    }

    // ── 5. DRAW CARD ──
    if (phase === 'card') {
      get().triggerNarration('card');
      const card = get().currentCard;
      if (card) {
        get().applyCard(card);
        await delay(400);
        await waitForPhase(['landed', 'playing', 'game_over', 'jail_decision', 'buying', 'paying_rent'], 4000);
        phase = get().phase;
        // Card may send us to a buy/rent situation — handle recursively-lite
        if (phase === 'buying') {
          const ctx = buildAIContext(get(), currentPlayerId);
          const tile = get().tiles[get().players.find(p => p.id === currentPlayerId)?.position ?? 0];
          const decision = decideBuy(ctx, tile);
          if (decision.shouldBuy) get().buyProperty();
          else get().skipBuy();
          await delay(400);
          await waitForPhase(['landed', 'playing', 'game_over', 'auction'], 4000);
          phase = get().phase;
        }
        if (phase === 'paying_rent') {
          get().payRent();
          await delay(400);
          await waitForPhase(['landed', 'playing', 'game_over'], 4000);
          phase = get().phase;
        }
      }
    }

    // ── 6. AUCTION — let aiAuctionTurn handle it; wait for completion ──
    if (phase === 'auction') {
      // aiAuctionTurn is auto-triggered by skipBuy/startAuction. Poll until done.
      let auctionWait = 0;
      while (get().phase === 'auction' && auctionWait < 40) {
        await delay(800);
        auctionWait++;
      }
      phase = get().phase;
    }

    // ── 7. BUILD HOUSES (expert system: greedy ROI on monopolies) ──
    if (phase === 'landed' || phase === 'playing') {
      const ctx = buildAIContext(get(), currentPlayerId);
      const buildTiles = decideBuild(ctx);
      for (const tileId of buildTiles) {
        const tile = BOARD_TILES[tileId];
        const currentAI = get().players.find(p => p.id === currentPlayerId);
        if (!currentAI || !tile.housePrice) break;
        // Use late-game buffer (150) after turn 10, else 80 — matches decideBuild
        const minBuffer = ctx.turnCount < 10 ? 80 : 150;
        if (currentAI.money - tile.housePrice < minBuffer) break;
        // Delegate to buildHouse which now enforces even-build, supply limits, and ownership.
        // buildHouse uses tile.owner (not hardcoded 'player'), so AI can build.
        const beforeHouses = get().tiles[tileId]?.houses ?? 0;
        get().buildHouse(tileId);
        const afterHouses = get().tiles[tileId]?.houses ?? 0;
        // Only log + delay if a house was actually built
        if (afterHouses > beforeHouses) {
          get().addLog({
            playerId: currentPlayerId,
            playerName: currentAI.name,
            message: afterHouses === 5
              ? `🏨 ${currentAI.name} builds HOTEL on ${tile.name}! (${personality.description})`
              : `🏠 ${currentAI.name} builds house on ${tile.name} (${afterHouses}/4)`,
            type: 'buy',
          });
          await delay(250);
        }
      }
    }

    // ── 7.5 AI-INITIATED TRADE (break stalemates, pursue monopolies) ──
    if (phase === 'landed' || phase === 'playing') {
      const ctx = buildAIContext(get(), currentPlayerId);
      const aiPlayer = get().players.find(p => p.id === currentPlayerId);
      if (aiPlayer && ctx.turnCount > 5) {
        // Find a color group where AI owns all but one property
        const colorGroups: Record<string, number[]> = {};
        for (const tid of aiPlayer.properties) {
          const tile = BOARD_TILES[tid];
          if (tile.colorGroup) {
            if (!colorGroups[tile.colorGroup]) colorGroups[tile.colorGroup] = [];
            colorGroups[tile.colorGroup].push(tid);
          }
        }
        for (const [group, ownedTileIds] of Object.entries(colorGroups)) {
          const groupTiles = BOARD_TILES.filter(t => t.colorGroup === group);
          if (ownedTileIds.length === groupTiles.length - 1) {
            // AI is one property away from monopoly — find the missing one
            const missingTile = groupTiles.find(t => !aiPlayer.properties.includes(t.id));
            if (missingTile && missingTile.owner && missingTile.owner !== currentPlayerId) {
              const target = get().players.find(p => p.id === missingTile!.owner);
              if (target && !target.isBankrupt) {
                // Only trade with human player (AI-AI trades are too complex for now)
                if (target.id === 'player') {
                  // Calculate offer: property value + 20% premium
                  const offerCash = Math.round((missingTile.price || 0) * 1.2);
                  // Request: a property the AI can use, or cash if AI can't offer enough
                  const aiOfferableProps = aiPlayer.properties
                    .filter(tid => {
                      const t = BOARD_TILES[tid];
                      // Don't offer properties that would give human a monopoly
                      if (!t.colorGroup) return false;
                      const humanGroupCount = target.properties
                        .filter(pid => BOARD_TILES[pid].colorGroup === t.colorGroup).length;
                      const groupTotal = BOARD_TILES.filter(gt => gt.colorGroup === t.colorGroup).length;
                      return humanGroupCount + 1 < groupTotal; // human won't get monopoly
                    })
                    .sort((a, b) => (BOARD_TILES[b].price || 0) - (BOARD_TILES[a].price || 0));

                  // Offer the AI's cheapest property from a different group + some cash
                  const offeredProp = aiOfferableProps[aiOfferableProps.length - 1]; // cheapest
                  const totalOffer = offerCash + (offeredProp ? Math.round((BOARD_TILES[offeredProp].price || 0) * 0.8) : 0);

                  // Only propose if AI can afford it
                  if (aiPlayer.money >= offerCash && totalOffer >= (missingTile.price || 0) * 1.1) {
                    set({
                      pendingAITrade: {
                        fromPlayerId: currentPlayerId,
                        toPlayerId: 'player',
                        offeredProperties: offeredProp ? [offeredProp] : [],
                        offeredCash: offerCash,
                        requestedProperties: [missingTile.id],
                        requestedCash: 0,
                        reason: `${aiPlayer.name} wants ${missingTile.name} to complete the ${group} color group!`,
                      },
                    });
                    get().addLog({
                      playerId: currentPlayerId,
                      playerName: aiPlayer.name,
                      message: `🤝 ${aiPlayer.name} proposes a trade: wants ${missingTile.name} for ${offeredProp ? BOARD_TILES[offeredProp].name + ' + ' : ''}RM${offerCash}!`,
                      type: 'system',
                    });
                    await delay(1000);
                  }
                }
                break; // Only one trade proposal per turn
              }
            }
          }
        }
      }
    }

    // ── 8. END TURN ──
    get().setAIThinking(false);
    const finalPhase = get().phase;
    if (finalPhase === 'landed' || finalPhase === 'playing' || finalPhase === 'jail_decision') {
      get().endTurn();
    } else if (finalPhase !== 'game_over') {
      // Safety net: if we somehow ended in a non-terminal phase, end the turn
      // rather than stalling the whole game.
      get().endTurn();
    }
  },

  getMarketState: () => get().marketState,

  buildHouse: (tileId: number) => {
    const state = get();
    const tile = state.tiles.find(t => t.id === tileId);
    if (!tile || tile.type !== 'property' || !tile.housePrice) return;
    // Use the tile's owner (supports both human and AI) instead of hardcoding 'player'
    const ownerId = tile.owner;
    if (!ownerId) return;
    const player = state.players.find(p => p.id === ownerId);
    if (!player) return;

    if ((tile.houses || 0) >= 5) return;

    // Cannot build on mortgaged properties
    if (state.mortgagedTiles.includes(tileId)) return;

    const cost = tile.housePrice;
    if (player.money < cost) return;

    // Must own full color group to build
    if (tile.colorGroup) {
      const groupTiles = BOARD_TILES.filter(t => t.colorGroup === tile.colorGroup);
      const ownsAll = groupTiles.every(t => t.owner === ownerId);
      if (!ownsAll) return;

      // ENFORCE EVEN-BUILD: houses in a color group must differ by at most 1.
      // Per official Monopoly rules, you cannot build on a property that already has
      // more houses than the least-developed property in its group.
      const groupStateTiles = groupTiles.map(gt => state.tiles.find(st => st.id === gt.id));
      const minHousesInGroup = Math.min(...groupStateTiles.map(t => t?.houses ?? 0));
      if ((tile.houses ?? 0) > minHousesInGroup) {
        get().addLog({
          playerId: ownerId,
          playerName: player.name,
          message: `⚠️ Cannot build on ${tile.name} — must build evenly. Build on the least-developed property in ${tile.colorGroup} first.`,
          type: 'system',
        });
        return;
      }
    }

    // ENFORCE HOUSE/HOTEL SUPPLY LIMIT (classic Monopoly: 32 houses, 12 hotels)
    const isUpgradingToHotel = (tile.houses ?? 0) === 4; // 4 houses → 5 (hotel)
    if (isUpgradingToHotel) {
      if (state.hotelsAvailable <= 0) {
        get().addLog({
          playerId: ownerId,
          playerName: player.name,
          message: `⚠️ No hotels available! The Bank has run out of hotels (limit: 12).`,
          type: 'system',
        });
        return;
      }
    } else {
      if (state.housesAvailable <= 0) {
        get().addLog({
          playerId: ownerId,
          playerName: player.name,
          message: `⚠️ No houses available! The Bank has run out of houses (limit: 32).`,
          type: 'system',
        });
        return;
      }
    }

    const newHouses = (tile.houses || 0) + 1;
    // Update supply: building a hotel (5th house) consumes 1 hotel and returns 4 houses to supply
    const supplyDelta = isUpgradingToHotel
      ? { houses: state.housesAvailable + 4, hotels: state.hotelsAvailable - 1 }
      : { houses: state.housesAvailable - 1, hotels: state.hotelsAvailable };

    set(state => ({
      players: state.players.map(p =>
        p.id === ownerId ? { ...p, money: p.money - cost } : p
      ),
      tiles: state.tiles.map(t =>
        t.id === tileId ? { ...t, houses: newHouses } : t
      ),
      housesAvailable: supplyDelta.houses,
      hotelsAvailable: supplyDelta.hotels,
    }));
    get().addLog({
      playerId: ownerId,
      playerName: player.name,
      message: newHouses === 5
        ? `🏨 Built a HOTEL on ${tile.name}! (RM${cost})`
        : `🏠 Built house ${newHouses}/4 on ${tile.name} (RM${cost})`,
      type: 'buy',
    });

    // Achievement: hotel_mogul — built a hotel (5 houses)
    if (newHouses === 5) {
      get().unlockAchievement('hotel_mogul');
    }
  },

  sellProperty: (tileId: number) => {
    const state = get();
    const tile = state.tiles.find(t => t.id === tileId);
    if (!tile) return;
    const ownerId = tile.owner;
    if (!ownerId) return;
    const player = state.players.find(p => p.id === ownerId);
    if (!player) return;

    // If mortgaged, sell price is reduced (only get mortgage value, not 80% of price)
    const isMortgaged = state.mortgagedTiles.includes(tileId);
    const sellPrice = isMortgaged
      ? Math.round((tile.mortgageValue || tile.price || 0) * 0.5)
      : Math.round((tile.mortgageValue || tile.price || 0) * 0.8);
    const houseRefund = (tile.houses || 0) * Math.round((tile.housePrice || 0) * 0.5);

    // Restore house/hotel supply from liquidated buildings
    let housesRestored = 0;
    let hotelsRestored = 0;
    if ((tile.houses ?? 0) === 5) hotelsRestored += 1;
    else if ((tile.houses ?? 0) > 0) housesRestored += tile.houses ?? 0;

    set(state => ({
      players: state.players.map(p =>
        p.id === ownerId
          ? { ...p, money: p.money + sellPrice + houseRefund, properties: p.properties.filter(pid => pid !== tileId) }
          : p
      ),
      tiles: state.tiles.map(t =>
        t.id === tileId ? { ...t, owner: undefined, houses: 0 } : t
      ),
      mortgagedTiles: state.mortgagedTiles.filter(id => id !== tileId),
      housesAvailable: state.housesAvailable + housesRestored,
      hotelsAvailable: state.hotelsAvailable + hotelsRestored,
    }));
    get().addLog({
      playerId: ownerId,
      playerName: player.name,
      message: `📉 Sold ${tile.name} for RM${sellPrice + houseRefund}`,
      type: 'buy',
    });
  },

  togglePortfolio: () => {
    set(state => ({ showPortfolio: !state.showPortfolio }));
  },

  startAuction: (tileId: number) => {
    const state = get();
    const tile = state.tiles.find(t => t.id === tileId);
    if (!tile || tile.owner) return;

    const price = tile.price || 0;
    const activePlayers = state.players.filter(
      p => !p.isBankrupt && p.money >= Math.floor(price * 0.5)
    );

    if (activePlayers.length === 0) {
      set({ phase: 'landed' });
      get().addLog({
        playerId: 'system',
        playerName: 'System',
        message: `🔨 Lelangan ${tile.name} dibatalkan — tiada pembida layak!`,
        type: 'auction',
      });
      return;
    }

    const floorPrice = Math.floor(price * 0.5);
    const passingPlayerId = state.turnOrder[state.currentTurnIndex];
    const bidderOrder: string[] = [];
    const startIdx = state.currentTurnIndex;
    for (let i = 1; i <= state.turnOrder.length; i++) {
      const idx = (startIdx + i) % state.turnOrder.length;
      const pid = state.turnOrder[idx];
      const p = state.players.find(pl => pl.id === pid);
      if (p && !p.isBankrupt && pid !== passingPlayerId) {
        bidderOrder.push(pid);
      }
    }

    if (bidderOrder.length === 0) {
      set({ phase: 'landed' });
      return;
    }

    const auctionState: AuctionState = {
      tileId,
      highestBid: floorPrice,
      highestBidder: null,
      currentBidderIndex: 0,
      bidderOrder,
      isActive: true,
    };

    set({ auctionState, phase: 'auction' });
    get().addLog({
      playerId: 'system',
      playerName: 'System',
      message: `🔨 Lelangan ${tile.name} bermula! Harga mula: RM${floorPrice}`,
      type: 'auction',
    });

    const firstBidder = state.players.find(p => p.id === bidderOrder[0]);
    if (firstBidder?.isAI) {
      get().setAIThinking(true);
      setTimeout(() => get().aiAuctionTurn(), 2000);
    }
  },

  placeBid: (playerId: string, amount: number) => {
    const state = get();
    const auction = state.auctionState;
    if (!auction || !auction.isActive) return;

    const player = state.players.find(p => p.id === playerId);
    if (!player || player.money < amount) return;
    if (amount <= auction.highestBid) return;

    const newAuction: AuctionState = {
      ...auction,
      highestBid: amount,
      highestBidder: playerId,
    };

    const nextBidderIndex = auction.currentBidderIndex + 1;
    if (nextBidderIndex >= auction.bidderOrder.length) {
      const hasOtherBidders = auction.bidderOrder.some(id => id !== playerId);
      if (!hasOtherBidders || auction.bidderOrder.length === 1) {
        set({ auctionState: { ...newAuction, currentBidderIndex: nextBidderIndex, isActive: false } });
        get().resolveAuction();
        return;
      }
      newAuction.currentBidderIndex = 0;
    } else {
      newAuction.currentBidderIndex = nextBidderIndex;
    }

    set({ auctionState: newAuction });
    get().addLog({
      playerId,
      playerName: player.name,
      message: `📢 ${player.name} bida RM${amount}!`,
      type: 'auction',
    });

    const nextBidderId = newAuction.bidderOrder[newAuction.currentBidderIndex];
    const nextBidder = state.players.find(p => p.id === nextBidderId);
    if (nextBidder?.isAI) {
      get().setAIThinking(true);
      setTimeout(() => get().aiAuctionTurn(), 2000);
    }
  },

  passBid: (playerId: string) => {
    const state = get();
    const auction = state.auctionState;
    if (!auction || !auction.isActive) return;

    const player = state.players.find(p => p.id === playerId);

    const newBidderOrder = auction.bidderOrder.filter(id => id !== playerId);
    const remainingBidders = newBidderOrder.filter(id => id !== auction.highestBidder);

    if (remainingBidders.length === 0 && auction.highestBidder) {
      set({ auctionState: { ...auction, bidderOrder: newBidderOrder, isActive: false } });
      get().addLog({
        playerId,
        playerName: player?.name || playerId,
        message: `🚫 ${player?.name || playerId} lalu (pass).`,
        type: 'auction',
      });
      get().resolveAuction();
      return;
    }

    if (!auction.highestBidder && newBidderOrder.length === 0) {
      set({ auctionState: null, phase: 'landed' });
      get().addLog({
        playerId: 'system',
        playerName: 'System',
        message: `🔨 Lelangan dibatalkan — tiada pembida!`,
        type: 'auction',
      });
      return;
    }

    let newBidderIndex = 0;
    const currentBidderId = auction.bidderOrder[auction.currentBidderIndex];
    if (playerId === currentBidderId) {
      newBidderIndex = 0;
    } else {
      const idx = newBidderOrder.indexOf(currentBidderId);
      newBidderIndex = idx >= 0 ? idx : 0;
    }

    const newAuction: AuctionState = {
      ...auction,
      bidderOrder: newBidderOrder,
      currentBidderIndex: newBidderIndex,
    };

    set({ auctionState: newAuction });
    get().addLog({
      playerId,
      playerName: player?.name || playerId,
      message: `🚫 ${player?.name || playerId} lalu (pass).`,
      type: 'auction',
    });

    const nextBidderId = newBidderOrder[newBidderIndex];
    const nextBidder = state.players.find(p => p.id === nextBidderId);
    if (nextBidder?.isAI) {
      get().setAIThinking(true);
      setTimeout(() => get().aiAuctionTurn(), 2000);
    }
  },

  resolveAuction: () => {
    const state = get();
    const auction = state.auctionState;
    if (!auction) return;

    const tile = state.tiles.find(t => t.id === auction.tileId);
    if (!tile) {
      set({ auctionState: null, phase: 'landed' });
      return;
    }

    if (auction.highestBidder) {
      const winner = state.players.find(p => p.id === auction.highestBidder);
      if (winner) {
        set(state => ({
          players: state.players.map(p =>
            p.id === auction.highestBidder
              ? { ...p, money: p.money - auction.highestBid, properties: [...p.properties, auction.tileId] }
              : p
          ),
          tiles: state.tiles.map(t =>
            t.id === auction.tileId ? { ...t, owner: auction.highestBidder } : t
          ),
          auctionState: null,
          phase: 'landed',
        }));
        get().addLog({
          playerId: auction.highestBidder,
          playerName: winner.name,
          message: `🔨 ${winner.name} menang lelangan ${tile.name} untuk RM${auction.highestBid}!`,
          type: 'auction',
        });

        // Track auction wins for player
        if (auction.highestBidder === 'player') {
          const newAuctionsWon = get().stats.auctionsWon + 1;
          set(s => ({ stats: { ...s.stats, auctionsWon: newAuctionsWon } }));
          if (newAuctionsWon >= 3) {
            get().unlockAchievement('auction_king');
          }
        }

        return;
      }
    }

    set({ auctionState: null, phase: 'landed' });
    get().addLog({
      playerId: 'system',
      playerName: 'System',
      message: `🔨 Lelangan ${tile.name} tamat tanpa pembida.`,
      type: 'auction',
    });
  },

  aiAuctionTurn: () => {
    const state = get();
    const auction = state.auctionState;
    if (!auction || !auction.isActive) {
      get().setAIThinking(false);
      return;
    }

    const currentBidderId = auction.bidderOrder[auction.currentBidderIndex];
    const player = state.players.find(p => p.id === currentBidderId);
    if (!player || !player.isAI) {
      get().setAIThinking(false);
      return;
    }

    const tile = state.tiles.find(t => t.id === auction.tileId);
    if (!tile) {
      get().setAIThinking(false);
      return;
    }

    // Expert-system auction bid (ai-engine.ts)
    const minIncrement = Math.max(10, Math.floor(auction.highestBid * 0.1));
    const ctx = buildAIContext(state, currentBidderId);
    const { bid, reason } = decideAuctionBid(ctx, tile, auction.highestBid, minIncrement);
    const quote = getRandomQuote(player.coalitionId);

    if (bid > 0 && bid <= player.money) {
      get().placeBid(currentBidderId, bid);
      set(s => ({
        players: s.players.map(p =>
          p.id === currentBidderId ? { ...p, quote } : p,
        ),
      }));
      get().addLog({
        playerId: currentBidderId,
        playerName: player.name,
        message: `🤖 ${player.name}: ${reason} — "${quote}"`,
        type: 'ai_quote',
      });
    } else {
      get().passBid(currentBidderId);
      set(s => ({
        players: s.players.map(p =>
          p.id === currentBidderId ? { ...p, quote } : p,
        ),
      }));
      get().addLog({
        playerId: currentBidderId,
        playerName: player.name,
        message: `🤖 ${player.name}: Pass (${reason}) — "${quote}"`,
        type: 'ai_quote',
      });
    }

    get().setAIThinking(false);
  },

  // --- Mortgage / Unmortgage ---
  mortgageProperty: (tileId: number) => {
    const state = get();
    const tile = state.tiles.find(t => t.id === tileId);
    const player = state.players.find(p => p.id === 'player');
    if (!tile || !player || tile.owner !== 'player') return;
    if (state.mortgagedTiles.includes(tileId)) return;

    // Cannot mortgage if there are houses on the tile
    if ((tile.houses || 0) > 0) return;

    const mortgageValue = tile.mortgageValue || Math.floor((tile.price || 0) / 2);

    set(state => ({
      players: state.players.map(p =>
        p.id === 'player' ? { ...p, money: p.money + mortgageValue } : p
      ),
      mortgagedTiles: [...state.mortgagedTiles, tileId],
    }));

    get().addLog({
      playerId: 'player',
      playerName: player.name,
      message: `🏦 ${player.name} menggadai ${tile.name} for RM${mortgageValue}! (Mortgaged)`,
      type: 'buy',
    });
  },

  unmortgageProperty: (tileId: number) => {
    const state = get();
    const tile = state.tiles.find(t => t.id === tileId);
    const player = state.players.find(p => p.id === 'player');
    if (!tile || !player || tile.owner !== 'player') return;
    if (!state.mortgagedTiles.includes(tileId)) return;

    const mortgageValue = tile.mortgageValue || Math.floor((tile.price || 0) / 2);
    const cost = Math.round(mortgageValue * 1.1); // 10% interest

    if (player.money < cost) return;

    set(state => ({
      players: state.players.map(p =>
        p.id === 'player' ? { ...p, money: p.money - cost } : p
      ),
      mortgagedTiles: state.mortgagedTiles.filter(id => id !== tileId),
    }));

    get().addLog({
      playerId: 'player',
      playerName: player.name,
      message: `🏦 ${player.name} membuka gadai ${tile.name} for RM${cost} (incl. 10% interest)!`,
      type: 'buy',
    });
  },

  // --- AI Speed Control ---
  setAISpeed: (speed: number) => {
    set({ aiSpeed: Math.max(1, Math.min(3, speed)) });
  },

  // --- Achievements ---
  unlockAchievement: (id: string) => {
    const state = get();
    const achievement = state.achievements.find(a => a.id === id);
    if (!achievement || achievement.unlockedAt !== null) return; // already unlocked

    const now = Date.now();
    set(state => ({
      achievements: state.achievements.map(a =>
        a.id === id ? { ...a, unlockedAt: now } : a
      ),
    }));

    get().addLog({
      playerId: 'system',
      playerName: 'System',
      message: `🏆 Achievement Unlocked: ${achievement.emoji} ${achievement.name} — ${achievement.description}!`,
      type: 'system',
    });
  },

  // --- Save / Load Game ---
  saveGame: () => {
    try {
      if (typeof window === 'undefined') return;
      const state = get();
      const saveData = {
        phase: state.phase,
        players: state.players,
        tiles: state.tiles,
        turnOrder: state.turnOrder,
        currentTurnIndex: state.currentTurnIndex,
        turnCount: state.turnCount,
        diceValues: state.diceValues,
        isDoubles: state.isDoubles,
        consecutiveDoubles: state.consecutiveDoubles,
        jawatanMenteriDeck: state.jawatanMenteriDeck,
        krisisNasionalDeck: state.krisisNasionalDeck,
        marketState: state.marketState,
        selectedTileId: state.selectedTileId,
        gameLog: state.gameLog,
        winner: state.winner,
        showPortfolio: state.showPortfolio,
        auctionState: state.auctionState,
        mortgagedTiles: state.mortgagedTiles,
        aiSpeed: state.aiSpeed,
        achievements: state.achievements,
        stats: state.stats,
        netWorthHistory: state.netWorthHistory,
        housesAvailable: state.housesAvailable,
        hotelsAvailable: state.hotelsAvailable,
        centerPot: state.centerPot,
        gameStartTime: state.gameStartTime,
      };
      localStorage.setItem('dewan-rakyat-save', JSON.stringify(saveData));
    } catch {
      // Silently fail if localStorage not available
    }
  },

  loadGame: () => {
    try {
      if (typeof window === 'undefined') return false;
      const raw = localStorage.getItem('dewan-rakyat-save');
      if (!raw) return false;
      // SECURITY: Validate JSON structure before parsing to prevent prototype pollution
      const saveData = JSON.parse(raw);
      // SECURITY: Validate expected fields exist and have correct types
      if (typeof saveData !== 'object' || saveData === null) return false;
      if (saveData.phase && typeof saveData.phase !== 'string') return false;
      if (saveData.players && !Array.isArray(saveData.players)) return false;
      if (saveData.tiles && !Array.isArray(saveData.tiles)) return false;
      if (saveData.turnOrder && !Array.isArray(saveData.turnOrder)) return false;
      if (saveData.currentTurnIndex !== undefined && typeof saveData.currentTurnIndex !== 'number') return false;

      set({
        phase: saveData.phase || 'lobby',
        players: saveData.players || [],
        tiles: saveData.tiles || BOARD_TILES.map(t => ({ ...t })),
        turnOrder: saveData.turnOrder || [],
        currentTurnIndex: saveData.currentTurnIndex || 0,
        turnCount: saveData.turnCount || 1,
        diceValues: saveData.diceValues || null,
        isDoubles: saveData.isDoubles || false,
        consecutiveDoubles: saveData.consecutiveDoubles || 0,
        jawatanMenteriDeck: saveData.jawatanMenteriDeck || shuffleDeck(JAWATAN_MENTERI_CARDS),
        krisisNasionalDeck: saveData.krisisNasionalDeck || shuffleDeck(KRISIS_NASIONAL_CARDS),
        marketState: saveData.marketState || DEFAULT_MARKET_STATE,
        selectedTileId: saveData.selectedTileId || null,
        currentCard: null, // transient UI state
        currentRentPayment: null, // transient UI state
        gameLog: saveData.gameLog || [],
        winner: saveData.winner || null,
        aiThinking: false, // transient UI state
        showPortfolio: saveData.showPortfolio || false,
        auctionState: saveData.auctionState || null,
        mortgagedTiles: saveData.mortgagedTiles || [],
        aiSpeed: saveData.aiSpeed || 1,
        achievements: saveData.achievements || INITIAL_ACHIEVEMENTS.map(a => ({ ...a })),
        stats: saveData.stats || { timesJailed: 0, auctionsWon: 0, highestRentPaid: 0 },
        netWorthHistory: Array.isArray(saveData.netWorthHistory) ? saveData.netWorthHistory : [],
        housesAvailable: typeof saveData.housesAvailable === 'number' ? saveData.housesAvailable : 32,
        hotelsAvailable: typeof saveData.hotelsAvailable === 'number' ? saveData.hotelsAvailable : 12,
        centerPot: typeof saveData.centerPot === 'number' ? saveData.centerPot : 0,
        pendingTaxChoice: null,
        gameStartTime: typeof saveData.gameStartTime === 'number' ? saveData.gameStartTime : Date.now(),
        pendingAITrade: null,
      });
      return true;
    } catch {
      return false;
    }
  },

  hasSavedGame: () => {
    try {
      if (typeof window === 'undefined') return false;
      return localStorage.getItem('dewan-rakyat-save') !== null;
    } catch {
      return false;
    }
  },

  // --- Managing Phase ---
  enterManaging: () => {
    const state = get();
    const currentPlayerId = state.turnOrder[state.currentTurnIndex];
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player || player.isAI || player.isBankrupt) return;
    if (state.phase !== 'landed' && state.phase !== 'playing') return;
    set({ phase: 'managing' });
  },

  exitManaging: () => {
    set({ phase: 'landed' });
  },

  // --- Market Simulation ---
  simulateMarket: () => {
    const state = get();
    const klciChange = (Math.random() - 0.5) * 3;
    const cpoChange = (Math.random() - 0.5) * 5;
    const ringgitChange = (Math.random() - 0.5) * 0.08;

    const newKlci = Math.max(1200, Math.min(2000, state.marketState.klci + klciChange * 10));
    const newCpo = Math.max(2000, Math.min(6000, state.marketState.cpoPrice + cpoChange * 50));
    const newRinggit = Math.max(3.5, Math.min(5.5, state.marketState.ringgitUsd + ringgitChange));

    // Inflation: increases over time to accelerate game (rent gets more expensive)
    const turnInflation = 1 + (state.turnCount * 0.005); // +0.5% per turn
    const marketInflation = 0.85 + (newKlci - 1400) / 2000 + (newCpo - 3500) / 20000;
    const inflationMultiplier = Math.max(marketInflation, turnInflation);
    const federalRentBonus = 1.0 + (newRinggit - 4.47) * 0.3;

    set({
      marketState: {
        klci: Math.round(newKlci * 10) / 10,
        klciChange: Math.round(klciChange * 10) / 10,
        cpoPrice: Math.round(newCpo),
        cpoChange: Math.round(cpoChange * 10) / 10,
        ringgitUsd: Math.round(newRinggit * 100) / 100,
        ringgitChange: Math.round(ringgitChange * 100) / 100,
        inflationMultiplier: Math.round(inflationMultiplier * 100) / 100,
        federalRentBonus: Math.round(federalRentBonus * 100) / 100,
        timestamp: new Date().toISOString(),
      },
    });
  },

  // --- Trade System ---
  initiateTrade: (targetPlayerId: string) => {
    const state = get();
    const currentPlayerId = state.turnOrder[state.currentTurnIndex];
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player || player.isAI) return;
    if (state.phase !== 'landed' && state.phase !== 'playing') return;

    const target = state.players.find(p => p.id === targetPlayerId);
    if (!target || target.isBankrupt || target.isBankrupt === undefined) return;

    set({
      tradeState: {
        initiator: currentPlayerId,
        responder: targetPlayerId,
        offeredProperties: [],
        offeredCash: 0,
        requestedProperties: [],
        requestedCash: 0,
        isActive: true,
      },
    });

    // NOTE: Do NOT auto-trigger aiTradeResponse here.
    // The trade panel lets the human configure their offer first; the AI
    // only evaluates once the human clicks "Propose Trade" (see TradePanel.handlePropose).
    // Auto-evaluating an empty offer caused immediate "BN rejected the trade offer!" pop-ups.
  },

  updateTradeOffer: (offeredProperties: number[], offeredCash: number, requestedProperties: number[], requestedCash: number) => {
    const state = get();
    if (!state.tradeState) return;
    set({
      tradeState: {
        ...state.tradeState,
        offeredProperties,
        offeredCash,
        requestedProperties,
        requestedCash,
      },
    });
  },

  acceptTrade: () => {
    const state = get();
    const trade = state.tradeState;
    if (!trade || !trade.initiator || !trade.responder) return;

    const initiator = state.players.find(p => p.id === trade.initiator);
    const responder = state.players.find(p => p.id === trade.responder);
    if (!initiator || !responder) return;

    // Validate that players own the properties they're offering
    const initiatorOwnsOffered = trade.offeredProperties.every(id => initiator.properties.includes(id));
    const responderOwnsRequested = trade.requestedProperties.every(id => responder.properties.includes(id));
    if (!initiatorOwnsOffered || !responderOwnsRequested) {
      get().addLog({
        playerId: 'system',
        playerName: 'System',
        message: `❌ Trade failed — invalid property ownership!`,
        type: 'system',
      });
      set({ tradeState: null });
      return;
    }

    // Validate cash availability
    if (initiator.money < trade.offeredCash || responder.money < trade.requestedCash) {
      get().addLog({
        playerId: 'system',
        playerName: 'System',
        message: `❌ Trade failed — insufficient funds!`,
        type: 'system',
      });
      set({ tradeState: null });
      return;
    }

    // Execute trade: swap properties and transfer cash
    const initiatorNewProperties = [
      ...initiator.properties.filter(id => !trade.offeredProperties.includes(id)),
      ...trade.requestedProperties,
    ];
    const responderNewProperties = [
      ...responder.properties.filter(id => !trade.requestedProperties.includes(id)),
      ...trade.offeredProperties,
    ];

    set(state => ({
      players: state.players.map(p => {
        if (p.id === trade.initiator) {
          return {
            ...p,
            properties: initiatorNewProperties,
            money: p.money - trade.offeredCash + trade.requestedCash,
          };
        }
        if (p.id === trade.responder) {
          return {
            ...p,
            properties: responderNewProperties,
            money: p.money - trade.requestedCash + trade.offeredCash,
          };
        }
        return p;
      }),
      tiles: state.tiles.map(t => {
        if (trade.offeredProperties.includes(t.id)) {
          return { ...t, owner: trade.responder };
        }
        if (trade.requestedProperties.includes(t.id)) {
          return { ...t, owner: trade.initiator };
        }
        return t;
      }),
      mortgagedTiles: [
        ...state.mortgagedTiles.filter(id => !trade.offeredProperties.includes(id) && !trade.requestedProperties.includes(id)),
      ],
      tradeState: null,
    }));

    // Log the trade
    const offeredDesc = [
      ...trade.offeredProperties.map(id => state.tiles.find(t => t.id === id)?.name).filter(Boolean),
      trade.offeredCash > 0 ? `RM${trade.offeredCash}` : null,
    ].filter(Boolean).join(', ');

    const requestedDesc = [
      ...trade.requestedProperties.map(id => state.tiles.find(t => t.id === id)?.name).filter(Boolean),
      trade.requestedCash > 0 ? `RM${trade.requestedCash}` : null,
    ].filter(Boolean).join(', ');

    get().addLog({
      playerId: trade.initiator,
      playerName: initiator.name,
      message: `🤝 ${initiator.name} trades [${offeredDesc}] with ${responder.name} for [${requestedDesc}]!`,
      type: 'system',
    });

    // Check bankruptcy after trade
    const postTrade = get();
    const anyBankrupt = postTrade.players.some(p => p.money < 0 && !p.isBankrupt);
    if (anyBankrupt) {
      set(state => ({
        players: state.players.map(p =>
          p.money < 0 ? { ...p, isBankrupt: true } : p
        ),
      }));
      const activePlayers = get().players.filter(p => !p.isBankrupt);
      if (activePlayers.length <= 1) {
        set({ phase: 'game_over', winner: activePlayers[0]?.id || null });
      }
    }
  },

  rejectTrade: () => {
    const state = get();
    const trade = state.tradeState;
    if (!trade) return;

    const responder = state.players.find(p => p.id === trade.responder);
    get().addLog({
      playerId: trade.responder,
      playerName: responder?.name || trade.responder,
      message: `🚫 ${responder?.name || 'Opponent'} rejected the trade offer!`,
      type: 'system',
    });

    set({ tradeState: null });
  },

  aiTradeResponse: () => {
    const state = get();
    const trade = state.tradeState;
    if (!trade || !trade.responder) return;

    const responder = state.players.find(p => p.id === trade.responder);
    if (!responder || !responder.isAI) return;

    // Calculate total value offered to AI (responder)
    let offeredValue = trade.offeredCash;
    for (const tileId of trade.offeredProperties) {
      const t = state.tiles.find(tile => tile.id === tileId);
      if (t) offeredValue += Math.round((t.price || 0) * 0.8);
    }

    // Calculate total value requested from AI
    let requestedValue = trade.requestedCash;
    for (const tileId of trade.requestedProperties) {
      const t = state.tiles.find(tile => tile.id === tileId);
      if (t) requestedValue += Math.round((t.price || 0) * 0.8);
    }

    // Heuristic: accept if offered value is reasonably close to requested, with randomness
    const ratio = offeredValue / Math.max(1, requestedValue);
    const shouldAccept = ratio > 0.7 && Math.random() > 0.25;

    if (shouldAccept && responder.money >= trade.requestedCash) {
      get().addLog({
        playerId: trade.responder,
        playerName: responder.name,
        message: `🤝 ${responder.name} accepts the trade! "Deal lah, bro!"`,
        type: 'system',
      });
      get().acceptTrade();
    } else {
      get().rejectTrade();
    }
  },

  toggleWealthChart: () => {
    set(s => ({ showWealthChart: !s.showWealthChart }));
  },

  recordNetWorth: () => {
    const state = get();
    const netWorths: Record<string, number> = {};
    for (const p of state.players) {
      if (p.isBankrupt) {
        netWorths[p.id] = 0;
        continue;
      }
      const propValue = p.properties.reduce((sum, tid) => {
        const tile = state.tiles.find(t => t.id === tid);
        const houses = tile?.houses ?? 0;
        return sum + (tile?.price ?? 0) + houses * (tile?.housePrice ?? 0);
      }, 0);
      netWorths[p.id] = p.money + propValue;
    }
    const turn = state.turnCount;
    set(s => ({
      netWorthHistory: [...s.netWorthHistory, { turn, netWorths }].slice(-60),
    }));
  },

  // ─── Bankruptcy handler ─────────────────────────────────────────────────
  // Transfers all assets from the bankrupt player to the creditor (if any)
  // or returns them to the Bank (unowned). Mortgaged properties stay
  // mortgaged when transferred to a creditor; the new owner must pay 10%
  // interest immediately or unmortgage. Houses are liquidated at half price
  // and the cash goes to the creditor (or Bank, effectively lost).
  handleBankruptcy: (bankruptPlayerId: string, creditorId?: string) => {
    const state = get();
    const bankrupt = state.players.find(p => p.id === bankruptPlayerId);
    if (!bankrupt || bankrupt.isBankrupt) return;

    const creditor = creditorId ? state.players.find(p => p.id === creditorId) : null;

    // 1. Liquidate all houses on the bankrupt player's properties.
    //    Refund half of housePrice per house. Cash goes to creditor (or vanishes to Bank).
    let liquidationCash = 0;
    const tilesAfterLiquidation = state.tiles.map(t => {
      if (t.owner === bankruptPlayerId && (t.houses ?? 0) > 0) {
        const refund = (t.houses ?? 0) * Math.round((t.housePrice ?? 0) * 0.5);
        liquidationCash += refund;
        // Return houses/hotels to the bank supply
        if (t.houses === 5) {
          // hotel -> back to 4 houses worth of supply
        }
        return { ...t, houses: 0 };
      }
      return t;
    });

    // Restore house/hotel supply from liquidated buildings
    let housesRestored = 0;
    let hotelsRestored = 0;
    state.tiles.forEach(t => {
      if (t.owner === bankruptPlayerId) {
        if ((t.houses ?? 0) === 5) hotelsRestored += 1;
        else if ((t.houses ?? 0) > 0) housesRestored += t.houses ?? 0;
      }
    });

    // 2. Transfer properties (and cash) to creditor, or release to Bank
    const tilesAfterTransfer = tilesAfterLiquidation.map(t => {
      if (t.owner === bankruptPlayerId) {
        if (creditor) {
          return { ...t, owner: creditorId };
        }
        // Return to bank: clear owner, keep mortgage status so it can be auctioned later
        return { ...t, owner: undefined };
      }
      return t;
    });

    // 3. Mortgaged properties: if transferred to creditor, creditor must pay 10% interest
    //    (per official Monopoly rules). We auto-deduct; if creditor can't afford, property
    //    stays mortgaged with no immediate penalty (simplified).
    let creditorInterestCost = 0;
    if (creditor) {
      state.mortgagedTiles.forEach(tid => {
        const t = state.tiles.find(x => x.id === tid);
        if (t && t.owner === bankruptPlayerId) {
          creditorInterestCost += Math.round((t.mortgageValue ?? 0) * 0.1);
        }
      });
    }

    // 4. Update players
    const playersUpdated = state.players.map(p => {
      if (p.id === bankruptPlayerId) {
        return { ...p, isBankrupt: true, money: 0, properties: [], isInJail: false, jailTurns: 0, hasGetOutOfJailFree: false };
      }
      if (creditor && p.id === creditor.id) {
        const inheritedProps = state.tiles
          .filter(t => t.owner === bankruptPlayerId)
          .map(t => t.id);
        const totalCash = p.money + liquidationCash + Math.max(0, bankrupt.money) - creditorInterestCost;
        return {
          ...p,
          money: totalCash,
          properties: [...p.properties, ...inheritedProps],
          hasGetOutOfJailFree: p.hasGetOutOfJailFree || bankrupt.hasGetOutOfJailFree,
        };
      }
      return p;
    });

    // 5. Mortgaged tiles: if returned to Bank, clear mortgage (bank-owned = unmortgaged)
    let mortgagedTilesUpdated = state.mortgagedTiles;
    if (!creditor) {
      const bankruptTileIds = state.tiles.filter(t => t.owner === bankruptPlayerId).map(t => t.id);
      mortgagedTilesUpdated = state.mortgagedTiles.filter(id => !bankruptTileIds.includes(id));
    }

    set({
      players: playersUpdated,
      tiles: tilesAfterTransfer,
      mortgagedTiles: mortgagedTilesUpdated,
      housesAvailable: state.housesAvailable + housesRestored,
      hotelsAvailable: state.hotelsAvailable + hotelsRestored,
    });

    // 6. Log
    const bankruptName = bankrupt.name;
    if (creditor) {
      get().addLog({
        playerId: creditor.id,
        playerName: creditor.name,
        message: `💀 ${bankruptName} went bankrupt! All assets transferred to ${creditor.name}${creditorInterestCost > 0 ? ` (10% mortgage interest: RM${creditorInterestCost})` : ''}.`,
        type: 'system',
      });
    } else {
      get().addLog({
        playerId: 'system',
        playerName: 'System',
        message: `💀 ${bankruptName} went bankrupt to the Bank! All properties returned to the Bank.`,
        type: 'system',
      });
    }

    // Game feel: bankruptcy — heavy shake + hitstop + FOV punch + red flash
    gameFeel.onBankruptcy();
    flashScreen('#ef4444', 0.6, 200); // red flash

    // 7. Check game over / auto-win
    const activePlayers = get().players.filter(p => !p.isBankrupt);
    if (activePlayers.length <= 1) {
      set({ phase: 'game_over', winner: activePlayers[0]?.id || null });
      return;
    }
  },

  // ─── Income Tax Choice (10% of net worth OR flat RM200) ─────────────────
  resolveTaxChoice: (useFlat: boolean) => {
    const state = get();
    if (!state.pendingTaxChoice) return;
    const { tileId, playerId } = state.pendingTaxChoice;
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    // Net worth = cash + property values + house values
    const propValue = player.properties.reduce((sum, tid) => {
      const tile = state.tiles.find(t => t.id === tid);
      const houses = tile?.houses ?? 0;
      return sum + (tile?.price ?? 0) + houses * (tile?.housePrice ?? 0);
    }, 0);
    const netWorth = player.money + propValue;
    const tenPercent = Math.round(netWorth * 0.1);
    const amount = useFlat ? 200 : tenPercent;

    const newMoney = player.money - amount;
    set(s => ({
      players: s.players.map(p =>
        p.id === playerId ? { ...p, money: newMoney } : p
      ),
      centerPot: s.centerPot + amount,
      pendingTaxChoice: null,
    }));

    const choiceLabel = useFlat ? 'RM200 flat' : `10% (RM${tenPercent})`;
    get().addLog({
      playerId,
      playerName: player.name,
      message: `💸 ${player.name} pays ${choiceLabel} in Cukai SST/GST! (Net worth was RM${netWorth})`,
      type: 'tax',
    });

    // Check bankruptcy after tax payment
    if (newMoney < 0) {
      get().handleBankruptcy(playerId);
      const activePlayers = get().players.filter(p => !p.isBankrupt);
      if (activePlayers.length <= 1) {
        set({ phase: 'game_over', winner: activePlayers[0]?.id || null });
        return;
      }
    }

    // Proceed to landed phase
    set({ phase: 'landed' });
  },

  // ─── Auto-Win Check: "Supermajority" — own 20+ of 28 buyable properties ──
  // Mirrors the Malaysian Parliament simple-majority concept (112 of 222 seats).
  // With 28 buyable properties, 20 = ~71% = "supermajority".
  checkAutoWin: () => {
    const state = get();
    for (const p of state.players) {
      if (p.isBankrupt) continue;
      if (p.properties.length >= 20) {
        get().addLog({
          playerId: p.id,
          playerName: p.name,
          message: `🏆 ${p.name} wins by SUPERMAJORITY! Owns ${p.properties.length}/28 seats — Dewan Rakyat dissolved!`,
          type: 'system',
        });
        set({ phase: 'game_over', winner: p.id });
        return true;
      }
    }
    return false;
  },

  // ─── AI-Initiated Trade: Human accepts the AI's trade proposal ────────
  acceptAITrade: () => {
    const state = get();
    const trade = state.pendingAITrade;
    if (!trade) return;

    const fromPlayer = state.players.find(p => p.id === trade.fromPlayerId);
    const toPlayer = state.players.find(p => p.id === trade.toPlayerId);
    if (!fromPlayer || !toPlayer) return;

    // Validate: both players still own the properties being traded
    const fromOwnsOffered = trade.offeredProperties.every(id => fromPlayer.properties.includes(id));
    const toOwnsRequested = trade.requestedProperties.every(id => toPlayer.properties.includes(id));
    if (!fromOwnsOffered || !toOwnsRequested) {
      get().addLog({ playerId: 'system', playerName: 'System', message: `❌ Trade cancelled — property ownership changed.`, type: 'system' });
      set({ pendingAITrade: null });
      return;
    }

    // Validate cash
    if (fromPlayer.money < trade.offeredCash) {
      get().addLog({ playerId: 'system', playerName: 'System', message: `❌ Trade cancelled — ${fromPlayer.name} can't afford the cash offer.`, type: 'system' });
      set({ pendingAITrade: null });
      return;
    }

    // Execute trade
    set(s => ({
      players: s.players.map(p => {
        if (p.id === trade.fromPlayerId) {
          return {
            ...p,
            money: p.money - trade.offeredCash + trade.requestedCash,
            properties: [
              ...p.properties.filter(id => !trade.offeredProperties.includes(id)),
              ...trade.requestedProperties,
            ],
          };
        }
        if (p.id === trade.toPlayerId) {
          return {
            ...p,
            money: p.money + trade.offeredCash - trade.requestedCash,
            properties: [
              ...p.properties.filter(id => !trade.requestedProperties.includes(id)),
              ...trade.offeredProperties,
            ],
          };
        }
        return p;
      }),
      tiles: s.tiles.map(t => {
        if (trade.offeredProperties.includes(t.id)) return { ...t, owner: trade.toPlayerId };
        if (trade.requestedProperties.includes(t.id)) return { ...t, owner: trade.fromPlayerId };
        return t;
      }),
      pendingAITrade: null,
    }));

    get().addLog({
      playerId: 'system',
      playerName: 'System',
      message: `🤝 ${toPlayer.name} ACCEPTED ${fromPlayer.name}'s trade! ${trade.offeredProperties.length > 0 ? `${trade.offeredProperties.map(id => BOARD_TILES[id].name).join(', ')} + ` : ''}RM${trade.offeredCash} ↔ ${trade.requestedProperties.map(id => BOARD_TILES[id].name).join(', ')}`,
      type: 'system',
    });

    // Check auto-win after trade
    get().checkAutoWin();
  },

  // ─── AI-Initiated Trade: Human rejects the AI's trade proposal ───────
  rejectAITrade: () => {
    const state = get();
    const trade = state.pendingAITrade;
    if (!trade) return;
    const fromPlayer = state.players.find(p => p.id === trade.fromPlayerId);
    get().addLog({
      playerId: 'system',
      playerName: 'System',
      message: `🚫 ${fromPlayer?.name}'s trade proposal was REJECTED.`,
      type: 'system',
    });
    set({ pendingAITrade: null });
  },

  // ─── AI scans for trade opportunities (called during AI turn) ────────
  aiInitiateTrade: () => {
    // This is a placeholder — the actual AI trade logic is inline in aiTurn step 7.5
    // This function exists for future extensibility (e.g., AI-AI trades)
  },
}));

// Expose store on window for debugging/testing (agent-browser can call actions directly)
if (typeof window !== 'undefined') {
  (window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore;
}