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

  // Auction
  auctionState: AuctionState | null;

  // Mortgage
  mortgagedTiles: number[];

  // AI Speed (1=normal, 2=fast, 3=fastest)
  aiSpeed: number;

  // Achievements
  achievements: Achievement[];
  stats: GameStats;

  // Actions
  startGame: (coalitionId: string) => void;
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
  
  // Check if owner has full color group
  if (tile.colorGroup) {
    const colorGroupTiles = BOARD_TILES.filter(t => t.colorGroup === tile.colorGroup);
    const ownsAll = colorGroupTiles.every(t => owner.properties.includes(t.id));
    if (ownsAll) {
      return Math.round(baseRent * 2 * marketState.inflationMultiplier);
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
  auctionState: null,
  mortgagedTiles: [],
  aiSpeed: 1,
  achievements: INITIAL_ACHIEVEMENTS.map(a => ({ ...a })),
  stats: { timesJailed: 0, auctionsWon: 0, highestRentPaid: 0 },

  startGame: (playerCoalitionId: string) => {
    const allCoalitionIds = Object.keys(COALITIONS);
    const aiCoalitions = allCoalitionIds.filter(c => c !== playerCoalitionId);

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
          message: `🎲 Tiga kali doubles! ${cp.name} dihantar ke Tahanan SPR! (3 consecutive doubles = jail)`,
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
      return;
    }

    // Tax tiles
    if (tile.type === 'tax') {
      const amount = tile.id === 4 ? 200 : 100;
      const newMoney = player.money - amount;
      const isBankrupt = newMoney < 0;
      set(state => ({
        players: state.players.map(p =>
          p.id === currentPlayerId ? { ...p, money: newMoney, isBankrupt } : p
        ),
        phase: isBankrupt ? 'game_over' : 'landed',
      }));
      get().addLog({
        playerId: currentPlayerId,
        playerName: player.name,
        message: `💸 ${player.name} pays RM${amount} in ${tile.name}! (${tile.description})`,
        type: 'tax',
      });
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
      return;
    }

    // Property / Highway / Media
    if (tile.type === 'property' || tile.type === 'highway' || tile.type === 'media') {
      // Unowned
      if (!tile.owner) {
        if (player.money >= (tile.price || 0)) {
          if (player.isAI) {
            // AI decides — try LLM API, fallback to random
            set({ aiThinking: true });
            const aiDecide = async () => {
              try {
                const res = await fetch('/api/ai-decision', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    coalitionId: player.coalitionId,
                    coalitionName: COALITIONS[player.coalitionId]?.fullName || player.name,
                    property: { name: tile.name, id: tile.id, price: tile.price, rent: tile.rent },
                    money: player.money,
                    ownedProperties: player.properties.map(pid => BOARD_TILES[pid]?.name || `Tile ${pid}`),
                    marketData: get().marketState,
                  }),
                });
                const data = await res.json();
                const quote = data.quote || getRandomQuote(player.coalitionId);
                if (data.action === 'BUY' && player.money >= (tile.price || 0)) {
                  get().buyProperty();
                } else {
                  get().skipBuy();
                }
                set(state => ({
                  players: state.players.map(p =>
                    p.id === currentPlayerId ? { ...p, quote } : p
                  ),
                  aiThinking: false,
                }));
                get().addLog({
                  playerId: currentPlayerId,
                  playerName: player.name,
                  message: `🤖 ${player.name}: "${quote}"`,
                  type: 'ai_quote',
                });
              } catch {
                // Fallback to random decision
                const shouldBuy = Math.random() > 0.2;
                const quote = getRandomQuote(player.coalitionId);
                if (shouldBuy && player.money >= (tile.price || 0)) {
                  get().buyProperty();
                } else {
                  get().skipBuy();
                }
                set(state => ({
                  players: state.players.map(p =>
                    p.id === currentPlayerId ? { ...p, quote } : p
                  ),
                  aiThinking: false,
                }));
                get().addLog({
                  playerId: currentPlayerId,
                  playerName: player.name,
                  message: `🤖 ${player.name}: "${quote}"`,
                  type: 'ai_quote',
                });
              }
            };
            setTimeout(aiDecide, 800);
          } else {
            set({ phase: 'buying', selectedTileId: tile.id });
          }
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

    // Corner or other
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
      }
    }

    // Achievement: monopolist — 10+ properties
    if (newProperties.length >= 10 && currentPlayerId === 'player') {
      get().unlockAchievement('monopolist');
    }

    // Achievement: banker — money check happens in endTurn
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
    const payeeNew = payee.money + amount;

    set(state => ({
      players: state.players.map(p => {
        if (p.id === from) return { ...p, money: payerNew, isBankrupt: payerNew < 0 };
        if (p.id === to) return { ...p, money: payeeNew };
        return p;
      }),
      currentRentPayment: null,
      phase: payerNew < 0 ? 'game_over' : 'landed',
    }));

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
            p.id === currentPlayerId ? { ...p, money: newMoney, isBankrupt: newMoney < 0 } : p
          ),
          currentCard: null,
          phase: newMoney < 0 ? 'game_over' : 'landed',
        }));
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
        const targetPos = effect.tileId || 0;
        const passedGo = player.position > targetPos;
        set(state => ({
          players: state.players.map(p =>
            p.id === currentPlayerId
              ? { ...p, position: targetPos, money: passedGo ? p.money + 200 : p.money }
              : p
          ),
          currentCard: null,
          phase: 'landed',
        }));
        if (passedGo) {
          get().addLog({
            playerId: currentPlayerId,
            playerName: player.name,
            message: `💰 Passed GO during card! +RM200!`,
            type: 'pass_go',
          });
        }
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

    // Check for bankruptcy
    const newState = get();
    const updatedPlayer = newState.players.find(p => p.id === currentPlayerId);
    if (updatedPlayer && updatedPlayer.money < 0) {
      set({ phase: 'game_over' });
    }
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

    // Auto-save after each turn
    get().saveGame();

    // If next player is AI, auto-play
    if (nextPlayer?.isAI) {
      get().setAIThinking(true);
      const aiDelay = Math.round(1000 / state.aiSpeed);
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
            : `Dice: ${d1},${d2} — No doubles. ${player.name} remains in Tahanan SPR. (Turn ${newJailTurns}/3)`,
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

  aiTurn: async () => {
    const state = get();
    const speed = state.aiSpeed;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, Math.round(ms / speed)));

    const currentPlayerId = state.turnOrder[state.currentTurnIndex];
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player || !player.isAI || player.isBankrupt) {
      get().endTurn();
      return;
    }

    // Handle jail for AI
    if (player.isInJail) {
      get().handleJailDecision(Math.random() > 0.5);
      await delay(1500);
    }

    const currentState = get();
    if (currentState.phase === 'jail_decision') {
      // Still in jail, end turn
      get().endTurn();
      return;
    }

    // Roll dice
    get().rollDice();

    // Wait for move to complete
    await delay(3000);

    // Check if we need to pay rent or buy
    const afterMoveState = get();
    if (afterMoveState.phase === 'paying_rent') {
      get().payRent();
      await delay(500);
    }
    if (afterMoveState.phase === 'card') {
      const card = afterMoveState.currentCard;
      if (card) {
        get().applyCard(card);
        await delay(500);
      }
    }

    // Wait for auction to complete if one was triggered
    let auctionWaitCount = 0;
    while (get().phase === 'auction' && auctionWaitCount < 30) {
      await delay(1000);
      auctionWaitCount++;
    }

    get().setAIThinking(false);
    // Only end turn if we're in a terminal sub-phase
    const finalPhase = get().phase;
    if (finalPhase === 'landed' || finalPhase === 'playing') {
      get().endTurn();
    }
  },

  getMarketState: () => get().marketState,

  buildHouse: (tileId: number) => {
    const state = get();
    const tile = state.tiles.find(t => t.id === tileId);
    const player = state.players.find(p => p.id === 'player');
    if (!tile || !player || tile.owner !== 'player') return;
    if (tile.type !== 'property' || !tile.housePrice) return;
    if ((tile.houses || 0) >= 5) return;

    // Cannot build on mortgaged properties
    if (state.mortgagedTiles.includes(tileId)) return;

    const cost = tile.housePrice;
    if (player.money < cost) return;

    // Must own full color group to build
    if (tile.colorGroup) {
      const groupTiles = BOARD_TILES.filter(t => t.colorGroup === tile.colorGroup);
      const ownsAll = groupTiles.every(t => t.owner === 'player');
      if (!ownsAll) return;
    }

    const newHouses = (tile.houses || 0) + 1;
    set(state => ({
      players: state.players.map(p =>
        p.id === 'player' ? { ...p, money: p.money - cost } : p
      ),
      tiles: state.tiles.map(t =>
        t.id === tileId ? { ...t, houses: newHouses } : t
      ),
    }));
    get().addLog({
      playerId: 'player',
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
    const player = state.players.find(p => p.id === 'player');
    if (!tile || !player || tile.owner !== 'player') return;

    // If mortgaged, sell price is reduced (only get mortgage value, not 80% of price)
    const isMortgaged = state.mortgagedTiles.includes(tileId);
    const sellPrice = isMortgaged
      ? Math.round((tile.mortgageValue || tile.price || 0) * 0.5)
      : Math.round((tile.mortgageValue || tile.price || 0) * 0.8);
    const houseRefund = (tile.houses || 0) * Math.round((tile.housePrice || 0) * 0.5);

    set(state => ({
      players: state.players.map(p =>
        p.id === 'player'
          ? { ...p, money: p.money + sellPrice + houseRefund, properties: p.properties.filter(pid => pid !== tileId) }
          : p
      ),
      tiles: state.tiles.map(t =>
        t.id === tileId ? { ...t, owner: undefined, houses: 0 } : t
      ),
      mortgagedTiles: state.mortgagedTiles.filter(id => id !== tileId),
    }));
    get().addLog({
      playerId: 'player',
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

    const baseRent = tile.rent?.[0] || 0;
    const maxWillingToPay = Math.floor(baseRent * 15);
    const minIncrement = Math.max(10, Math.floor(auction.highestBid * 0.1));
    const proposedBid = auction.highestBid + minIncrement;

    const quote = getRandomQuote(player.coalitionId);

    if (proposedBid <= maxWillingToPay && proposedBid <= player.money && Math.random() > 0.3) {
      get().placeBid(currentBidderId, proposedBid);
      set(state => ({
        players: state.players.map(p =>
          p.id === currentBidderId ? { ...p, quote } : p
        ),
      }));
      get().addLog({
        playerId: currentBidderId,
        playerName: player.name,
        message: `🤖 ${player.name}: "${quote}"`,
        type: 'ai_quote',
      });
    } else {
      get().passBid(currentBidderId);
      set(state => ({
        players: state.players.map(p =>
          p.id === currentBidderId ? { ...p, quote } : p
        ),
      }));
      get().addLog({
        playerId: currentBidderId,
        playerName: player.name,
        message: `🤖 ${player.name}: "${quote}"`,
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
      const saveData = JSON.parse(raw);

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
}));