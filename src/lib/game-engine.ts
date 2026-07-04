// Dewan Rakyat Game Engine - Standalone module for the static full-page server
import { BOARD_TILES, COALITIONS, COLOR_GROUP_HEX, JAWATAN_MENTERI_CARDS, KRISIS_NASIONAL_CARDS, DEFAULT_MARKET_STATE, getRandomQuote } from './game-data';

// --- Types ---
interface Player {
  id: string;
  coalitionId: string;
  name: string;
  position: number;
  money: number;
  isAI: boolean;
  isInJail: boolean;
  jailTurns: number;
  hasGetOutOfJailFree: boolean;
  properties: number[];
  isBankrupt: boolean;
  quote?: string;
  avatarEmoji: string;
}

interface LogEntry {
  id: string;
  turn: number;
  playerId: string;
  playerName: string;
  message: string;
  type: string;
}

interface DiceResult { d1: number; d2: number; total: number; doubles: boolean }

interface RentPayment { from: string; to: string; amount: number }

// --- Module-level Game State ---
var phase = 'lobby';
var players: Player[] = [];
var turnOrder: string[] = [];
var currentTurnIndex = 0;
var turnCount = 1;
var diceValues: [number, number] | null = null;
var selectedTileId: number | null = null;
var currentRentPayment: RentPayment | null = null;
var currentCard: any = null;
var winner: string | null = null;
var gameLog: LogEntry[] = [];
var aiThinking = false;
var marketState = { ...DEFAULT_MARKET_STATE };

function addLog(type: string, playerId: string, playerName: string, message: string) {
  var entry: LogEntry = { id: 'l' + gameLog.length, turn: turnCount, playerId, playerName, message, type };
  gameLog.push(entry);
}

function rollDice(): DiceResult {
  var d1 = Math.floor(Math.random() * 6) + 1;
  var d2 = Math.floor(Math.random() * 6) + 1;
  return { d1, d2, total: d1 + d2, doubles: d1 === d2 };
}

function movePlayer(total: number) {
  var player = players.find(function(p) { return p.id === turnOrder[currentTurnIndex]; });
  if (!player || player.isBankrupt) return;
  var oldPos = player.position;
  var newPos = oldPos + total;
  if (newPos >= 40) { newPos = newPos % 40; player.money += 200; }
  player.position = newPos;
  addLog('pass_go', player.name, '💰 Passed GO! Collected RM200!');
}

function handleLanding() {
  var tile = tiles[player.position];
  if (!tile) return;
  if (tile.id === 30) { player.position = 10; player.isInJail = true; player.jailTurns = 0; addLog('jail', player.name, '⛓️ Disyorkan ke SPR!'); return; }
  if (tile.type === 'tax') {
    var amount = tile.id === 4 ? 200 : 100;
    player.money -= amount;
    if (player.money < 0) { player.isBankrupt = true; return; }
    addLog('tax', player.name, `💸 ${tile.name}: Pay RM${amount}!`);
    return;
  }
  if (tile.type === 'chest' || tile.type === 'chance') {
    var cards = tile.type === 'chest'
      ? [
        { title: 'Kerajaan Pusat Grant', desc: 'Federal grant RM50.', action: { type: 'money', value: 50 } },
        { title: 'MACC Audit', desc: 'Pay RM100.', action: { type: 'money', value: -100 } },
        { title: 'Election Promise', desc: 'Collect RM150 each.', action: { type: 'collect_all', value: 150 } },
        { title: 'KWSP Bonus', desc: 'EPF dividend! RM100.', action: { type: 'money', value: 100 } },
        { title: 'Koperasi Loan', desc: 'Borrow RM50.', action: { type: 'money', value: -50 } },
        { title: 'Hospital Bill', desc: 'Govt hospital. RM50.', action: { type: 'money', value: -50 } },
        { title: 'Raya Angpow', desc: 'Open house collection! RM25 each.', action: { type: 'collect_all', value: 25 } },
      ]
      : [
        { title: 'Flood!', desc: 'Monsoon floods! Pay RM75.', action: { type: 'money', value: -75 } },
        { title: 'KLCI Surges!', desc: 'Market rally! RM150.', action: { type: 'money', value: 150 } },
        { title: 'CPO Boom', desc: 'CPO RM5000/tonne! RM100.', action: { type: 'money', value: 100 } },
        { title: 'Go to Putrajaya', desc: 'PM summons you!', action: { type: 'go_to', value: 37 } },
        { title: 'Road Protest', desc: 'Toll hike! Back 3.', action: { type: 'move', value: -3 } },
        { title: 'Ringgit Drop', desc: 'Ringgit weak! Pay everyone RM50.', action: { type: 'pay_all', value: 50 } },
        { title: 'Infrastructure', desc: 'New highway! RM200.', action: { type: 'money', value: 200 } },
      ];
    }
    var card = cards[Math.floor(Math.random() * cards.length)];
    var effect = card.effect;
    if (effect.type === 'money') player.money += effect.value;
    else if (effect.type === 'move') { var np = player.position + effect.value; if (np < 0) np += 40; if (np >= 40) np %= 40; player.position = np; if (player.position >= 40) player.money += 200; }
    else if (effect.type === 'jail') { player.position = 10; player.isInJail = true; player.jailTurns = 0; }
    else if (effect.type === 'go_to') { if (player.position >= (effect.tileId || 0)) player.money += 200; player.position = effect.tileId || 0; }
    else if (effect.type === 'collect_all') { players.forEach(function(p) { if (p.id !== player.id) p.money -= effect.value; }); player.money += (players.length - 1) * effect.value; }
    else if (effect.type === 'pay_all') { players.forEach(function(p) { if (p.id !== player.id) p.money += effect.value; }); player.money -= (players.length - 1) * effect.value; }
    if (player.money < 0) { player.isBankrupt = true; }
    return;
  }
}

function endTurn() {
  var active = players.filter(function(p) { return !p.isBankrupt; });
  if (active.length <= 1) { winner = active[0]?.id || null; phase = 'game_over'; return; }
  var nextIdx = (currentTurnIndex + 1) % turnOrder.length;
  var safety = 0;
  while (players.find(function(p) { return p.id === turnOrder[nextIdx]; })?.isBankrupt && safety < 15) {
    nextIdx = (nextIdx + 1) % turnOrder.length;
    safety++;
  }
  currentTurnIndex = nextIdx;
  turnCount = nextIdx <= currentTurnIndex ? turnCount + 1 : turnCount;
  diceValues = null;
}

function getFullGameState() {
  return {
    phase, players, turnOrder, currentTurnIndex, turnCount,
    diceValues, selectedTileId, currentRentPayment, currentCard, winner,
    aiThinking, marketState, gameLog,
  };
}

// --- Route Handlers ---
export async function GET() {
  return new Response(getFullGameState(), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}

export async function POST(request: NextRequest) {
  try {
    var res = await fetch('http://localhost:3000/full-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: request.body,
    });
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    var data = await res.json();
    return NextResponse.json(data, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}