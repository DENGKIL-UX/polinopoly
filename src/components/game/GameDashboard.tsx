'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore, type Player } from '@/lib/game-store';
import { COALITIONS, BOARD_TILES, COLOR_GROUP_HEX, type GameCard } from '@/lib/game-data';
import {
  Wallet, ArrowRight, Gavel, CreditCard,
  AlertTriangle, Trophy, MessageSquare, TrendingUp, TrendingDown,
  ChevronRight, SkipForward, DollarSign, Building2, Crown,
  Briefcase, Hammer, Home, X, Landmark,
} from 'lucide-react';

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

/* ─── Dice ─── */
function DiceDisplay({ value, rolling }: { value: number | null; rolling: boolean }) {
  return (
    <motion.div
      animate={rolling ? { rotate: [0, 360, 720], scale: [1, 1.2, 0.9, 1] } : { scale: 1 }}
      transition={rolling ? { duration: 0.6, ease: 'easeInOut' } : { duration: 0.2 }}
      className="w-11 h-11 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-white to-slate-100 shadow-xl shadow-black/20 flex items-center justify-center text-xl md:text-2xl border border-slate-200"
    >
      {value ? DICE_FACES[value] : '⚀'}
    </motion.div>
  );
}

/* ─── Player Card ─── */
function PlayerCard({ player, isCurrentTurn }: { player: Player; isCurrentTurn: boolean }) {
  const coalition = COALITIONS[player.coalitionId];
  if (player.isBankrupt) return null;
  return (
    <div className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all text-xs backdrop-blur-sm ${
      isCurrentTurn
        ? 'border-yellow-400/70 bg-yellow-400/10 shadow-lg shadow-yellow-400/5'
        : 'border-slate-700/30 bg-slate-800/30'
    }`}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 shadow-md border border-white/10"
        style={{ backgroundColor: coalition.color, boxShadow: `0 0 8px ${coalition.color}30` }}>
        {player.avatarEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold truncate" style={{ color: coalition.color }}>{player.name}</span>
          {player.isAI && <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-slate-600 text-slate-500">AI</Badge>}
          {player.isInJail && <Badge className="text-[7px] px-1 py-0 h-3.5 bg-red-600">JAIL</Badge>}
        </div>
        <div className="flex items-center gap-2.5 text-[9px] text-slate-400 mt-0.5">
          <span className="flex items-center gap-0.5"><Wallet className="h-2.5 w-2.5" /><span className="font-semibold text-slate-300">RM{player.money.toLocaleString()}</span></span>
          <span className="flex items-center gap-0.5"><Building2 className="h-2.5 w-2.5" />{player.properties.length}</span>
        </div>
      </div>
      {isCurrentTurn && (
        <motion.div animate={{ x: [0, 4, 0], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
          <ArrowRight className="h-3.5 w-3.5 text-yellow-400" />
        </motion.div>
      )}
    </div>
  );
}

/* ─── Market Ticker ─── */
function MarketTicker() {
  const [ticks, setTicks] = useState({ klci: 1587.3, klciChange: -0.8, cpoPrice: 3950, cpoChange: 2.3, ringgitUsd: 4.47, ringgitChange: -0.2, inflation: 1.0 });
  useEffect(() => {
    const iv = setInterval(() => {
      setTicks(p => ({
        klci: +(p.klci + (Math.random() - 0.48) * 3).toFixed(1),
        klciChange: +((Math.random() - 0.45) * 2.5).toFixed(1),
        cpoPrice: Math.round(p.cpoPrice + (Math.random() - 0.45) * 50),
        cpoChange: +((Math.random() - 0.4) * 3).toFixed(1),
        ringgitUsd: +(p.ringgitUsd + (Math.random() - 0.52) * 0.02).toFixed(2),
        ringgitChange: +((Math.random() - 0.5) * 0.3).toFixed(2),
        inflation: +(0.85 + Math.random() * 0.3).toFixed(2),
      }));
    }, 5000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="flex items-center gap-3 md:gap-4 overflow-x-auto px-3 py-1.5 bg-slate-950/90 border-b border-slate-700/30 text-[10px] backdrop-blur-sm">
      <span className="font-bold text-yellow-500 flex items-center gap-1 flex-shrink-0">
        <TrendingUp className="h-3 w-3" /><span className="hidden sm:inline">BURSA</span><span className="sm:hidden">📈</span>
      </span>
      {[
        { l: 'KLCI', v: ticks.klci.toFixed(1), c: ticks.klciChange },
        { l: 'CPO', v: `RM${ticks.cpoPrice}`, c: ticks.cpoChange },
        { l: 'MYR', v: ticks.ringgitUsd.toFixed(2), c: ticks.ringgitChange * 10 },
        { l: 'INF', v: `×${ticks.inflation}`, c: (ticks.inflation - 1) * 50 },
      ].map((item, i) => (
        <span key={i} className="flex items-center gap-1 flex-shrink-0">
          <span className="text-slate-500 font-medium">{item.l}</span>
          <span className="font-bold text-slate-200">{item.v}</span>
          <span className={item.c >= 0 ? 'text-emerald-400' : 'text-red-400'} style={{ minWidth: 38 }}>
            {item.c >= 0 ? '▲' : '▼'}{Math.abs(item.c).toFixed(1)}%
          </span>
        </span>
      ))}
    </div>
  );
}

/* ─── Game Log ─── */
function GameLogPanel() {
  const gameLog = useGameStore(s => s.gameLog);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [gameLog.length]);
  return (
    <Card className="bg-slate-950/90 border-slate-700/30 backdrop-blur-sm">
      <CardHeader className="p-2.5 pb-1.5">
        <CardTitle className="text-[10px] font-bold text-amber-400/80 flex items-center gap-1.5 tracking-wide uppercase">
          <Landmark className="h-3 w-3" />Hansard Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-1.5 pt-0">
        <div ref={ref} className="h-40 overflow-y-auto space-y-1 pr-1">
          {gameLog.slice(-30).reverse().map(e => (
            <div key={e.id} className="text-[9px] leading-relaxed text-slate-400 border-l-2 pl-2 py-0.5"
              style={{ borderColor: e.type === 'ai_quote' ? 'rgba(234,179,8,0.3)' : e.type === 'buy' ? 'rgba(74,222,128,0.3)' : e.type === 'rent' ? 'rgba(248,113,113,0.3)' : 'rgba(100,116,139,0.2)' }}>
              <span className="text-slate-600 mr-1 font-mono">T{e.turn}</span>{e.message}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── AI Quote Bubble ─── */
function AIQuoteBubble() {
  const players = useGameStore(s => s.players);
  const aiThinking = useGameStore(s => s.aiThinking);
  const aiWithQuotes = players.filter(p => p.isAI && p.quote && !p.isBankrupt);
  const latest = aiWithQuotes[aiWithQuotes.length - 1];
  if (!latest && !aiThinking) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="absolute bottom-20 left-2 right-2 md:left-auto md:right-2 md:w-72 z-30"
      >
        <Card className="bg-slate-900/95 border-yellow-500/20 shadow-xl shadow-black/20 backdrop-blur-sm">
          <CardContent className="p-3">
            {aiThinking && !latest ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
                <span className="text-[10px] text-yellow-400 font-medium">AI sedang berfikir...</span>
              </div>
            ) : latest ? (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 shadow-md border border-white/10"
                  style={{ backgroundColor: COALITIONS[latest.coalitionId]?.color }}>
                  {latest.avatarEmoji}
                </div>
                <div>
                  <p className="text-[10px] font-bold mb-0.5" style={{ color: COALITIONS[latest.coalitionId]?.color }}>{latest.name}</p>
                  <p className="text-[11px] text-slate-300 italic leading-relaxed">&ldquo;{latest.quote}&rdquo;</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Tile Detail Popup ─── */
function TileDetail() {
  const selectedTileId = useGameStore(s => s.selectedTileId);
  const tiles = useGameStore(s => s.tiles);
  const selectTile = useGameStore(s => s.selectTile);
  if (selectedTileId === null) return null;
  const tile = tiles.find(t => t.id === selectedTileId);
  if (!tile) return null;
  const ownerPlayer = tile.owner ? COALITIONS[tile.owner] : null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        className="absolute top-28 left-1/2 -translate-x-1/2 z-30"
      >
        <Card className="bg-slate-900/95 border-slate-600/40 shadow-2xl shadow-black/30 min-w-56 backdrop-blur-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{ backgroundColor: tile.colorGroup ? `${COLOR_GROUP_HEX[tile.colorGroup]}30` : 'rgba(100,116,139,0.2)' }}>
                  {tile.type === 'highway' ? '🚂' : tile.type === 'media' ? '📺' : tile.type === 'tax' ? '💰' : '🏛️'}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-100">{tile.name}</span>
                  {tile.colorGroup && (
                    <p className="text-[8px] text-slate-500">{COALITIONS[COLOR_GROUP_COALITION[tile.colorGroup]]?.fullName}</p>
                  )}
                </div>
              </div>
              <button onClick={() => selectTile(null)} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-[9px] text-slate-400 mb-2 leading-relaxed">{tile.description}</p>
            <div className="space-y-1 text-[10px]">
              {tile.price && <div className="flex justify-between"><span className="text-slate-500">Price</span><span className="font-bold text-amber-400">RM{tile.price}</span></div>}
              {tile.rent && <div className="flex justify-between"><span className="text-slate-500">Base Rent</span><span className="text-emerald-400 font-semibold">RM{tile.rent[0]}</span></div>}
              {tile.housePrice && <div className="flex justify-between"><span className="text-slate-500">House Cost</span><span className="text-blue-400">RM{tile.housePrice}</span></div>}
              {tile.houses !== undefined && tile.houses > 0 && (
                <div className="flex justify-between"><span className="text-slate-500">Houses</span>
                  <span className="text-green-400 font-semibold">{tile.houses >= 5 ? '🏨 Hotel' : `🏠 ×${tile.houses}`}</span>
                </div>
              )}
              {tile.rent && tile.houses && tile.houses > 0 && (
                <div className="flex justify-between"><span className="text-slate-500">Current Rent</span>
                  <span className="text-yellow-400 font-bold">RM{tile.rent[Math.min(tile.houses, 5)]}</span>
                </div>
              )}
            </div>
            {ownerPlayer && (
              <div className="mt-2 pt-2 border-t border-slate-700/30 flex items-center justify-between">
                <span className="text-[9px] text-slate-500">Owner</span>
                <span className="text-[10px] font-bold" style={{ color: ownerPlayer.color }}>{ownerPlayer.name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Property Portfolio Panel ─── */
function PropertyPortfolio() {
  const showPortfolio = useGameStore(s => s.showPortfolio);
  const togglePortfolio = useGameStore(s => s.togglePortfolio);
  const players = useGameStore(s => s.players);
  const tiles = useGameStore(s => s.tiles);
  const buildHouse = useGameStore(s => s.buildHouse);
  const sellProperty = useGameStore(s => s.sellProperty);
  const phase = useGameStore(s => s.phase);
  const turnOrder = useGameStore(s => s.turnOrder);
  const currentTurnIndex = useGameStore(s => s.currentTurnIndex);
  const currentPlayerId = turnOrder[currentTurnIndex];
  const isPlayerTurn = currentPlayerId === 'player';

  const player = players.find(p => p.id === 'player');
  if (!player) return null;

  const ownedTiles = player.properties.map(pid => tiles.find(t => t.id === pid)).filter(Boolean) as typeof BOARD_TILES;

  // Group by color group
  const groups: Record<string, typeof BOARD_TILES> = {};
  ownedTiles.forEach(t => {
    const g = t.colorGroup || 'other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(t);
  });

  const canBuildAny = ownedTiles.some(t => {
    if (t.type !== 'property' || !t.colorGroup || !t.housePrice || (t.houses || 0) >= 5) return false;
    const groupTiles = BOARD_TILES.filter(gt => gt.colorGroup === t.colorGroup);
    return groupTiles.every(gt => gt.owner === 'player');
  });

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={togglePortfolio}
        className="absolute top-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-600/40 text-[10px] text-slate-300 font-medium backdrop-blur-sm shadow-lg hover:bg-slate-700/80 transition-colors pointer-events-auto"
      >
        <Briefcase className="h-3.5 w-3.5" />
        <span>Portfolio</span>
        <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 border-amber-600/50 text-amber-400">{ownedTiles.length}</Badge>
        {canBuildAny && isPlayerTurn && (
          <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-1.5 h-1.5 rounded-full bg-green-400" />
        )}
      </motion.button>

      <AnimatePresence>
        {showPortfolio && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-16 left-1 z-30 w-64 max-h-[65vh] pointer-events-auto"
          >
            <Card className="bg-slate-900/95 border-slate-600/30 shadow-2xl shadow-black/30 backdrop-blur-sm">
              <CardHeader className="p-3 pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5" />Your Properties
                </CardTitle>
                <button onClick={togglePortfolio} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="h-[50vh] overflow-y-auto space-y-2 pr-1">
                  {ownedTiles.length === 0 && (
                    <p className="text-[10px] text-slate-500 text-center py-4">No properties yet. Buy some!</p>
                  )}
                  {Object.entries(groups).map(([group, gTiles]) => (
                    <div key={group}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_GROUP_HEX[group as keyof typeof COLOR_GROUP_HEX] || '#6b7280' }} />
                        <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">{group}</span>
                      </div>
                      {gTiles.map(t => {
                        const ownsGroup = t.colorGroup && BOARD_TILES.filter(gt => gt.colorGroup === t.colorGroup).every(gt => gt.owner === 'player');
                        const canBuild = ownsGroup && t.type === 'property' && !!t.housePrice && (t.houses || 0) < 5 && player.money >= (t.housePrice || 0) && isPlayerTurn && phase !== 'rolling' && phase !== 'moving';
                        return (
                          <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/20 mb-1">
                            <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] flex-shrink-0"
                              style={{ backgroundColor: `${COLOR_GROUP_HEX[t.colorGroup!] || '#6b7280'}40` }}>
                              🏛️
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-bold text-slate-200 truncate">{t.name}</p>
                              <div className="flex items-center gap-2 text-[8px] text-slate-400">
                                <span>Rent: RM{t.rent?.[(t.houses || 0)] || t.rent?.[0]}</span>
                                {(t.houses || 0) > 0 && (
                                  <span className="text-green-400">{t.houses >= 5 ? '🏨' : `🏠×${t.houses}`}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {canBuild && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  onClick={() => buildHouse(t.id)}
                                  className="w-6 h-6 rounded bg-green-600/20 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-600/40 transition-colors"
                                  title={`Build house (RM${t.housePrice})`}
                                >
                                  <Home className="h-3 w-3" />
                                </motion.button>
                              )}
                              <button
                                onClick={() => sellProperty(t.id)}
                                className="w-6 h-6 rounded bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400/60 hover:bg-red-600/30 hover:text-red-400 transition-colors"
                                title="Sell property"
                              >
                                <DollarSign className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                {canBuildAny && isPlayerTurn && (
                  <div className="mt-2 pt-2 border-t border-slate-700/30 text-center">
                    <p className="text-[8px] text-green-400/70">✨ Full set owned — build houses to increase rent!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Main Dashboard ─── */
export default function GameDashboard() {
  const phase = useGameStore(s => s.phase);
  const players = useGameStore(s => s.players);
  const turnOrder = useGameStore(s => s.turnOrder);
  const currentTurnIndex = useGameStore(s => s.currentTurnIndex);
  const diceValues = useGameStore(s => s.diceValues);
  const currentPlayerId = turnOrder[currentTurnIndex];
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const isPlayerTurn = currentPlayer?.id === 'player' && !currentPlayer?.isAI;
  const rollDice = useGameStore(s => s.rollDice);
  const buyProperty = useGameStore(s => s.buyProperty);
  const skipBuy = useGameStore(s => s.skipBuy);
  const payRent = useGameStore(s => s.payRent);
  const applyCard = useGameStore(s => s.applyCard);
  const endTurn = useGameStore(s => s.endTurn);
  const handleJailDecision = useGameStore(s => s.handleJailDecision);
  const currentCard = useGameStore(s => s.currentCard);
  const currentRentPayment = useGameStore(s => s.currentRentPayment);
  const winner = useGameStore(s => s.winner);
  const selectedTileId = useGameStore(s => s.selectedTileId);
  const selectedTile = selectedTileId !== null ? BOARD_TILES[selectedTileId] : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col">
      <MarketTicker />
      <div className="flex-1" />

      {/* Bottom action area */}
      <div className="pointer-events-auto pb-2 px-2 flex justify-center">
        <AnimatePresence mode="wait">
          {phase === 'playing' && isPlayerTurn && (
            <motion.div key="roll" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-3 mb-3 justify-center">
                <DiceDisplay value={diceValues?.[0] ?? null} rolling={phase === 'rolling'} />
                <DiceDisplay value={diceValues?.[1] ?? null} rolling={phase === 'rolling'} />
                {diceValues && (
                  <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="text-xl font-black text-yellow-400 min-w-[2rem] text-center"
                    style={{ textShadow: '0 0 10px rgba(250,204,21,0.4)' }}>
                    {diceValues[0] + diceValues[1]}
                  </motion.div>
                )}
                {diceValues && diceValues[0] === diceValues[1] && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="px-2 py-0.5 rounded-full bg-yellow-500 text-black text-[9px] font-black shadow-lg shadow-yellow-500/30">
                    DOUBLES!
                  </motion.div>
                )}
              </div>
              <Button onClick={rollDice} size="lg"
                className="w-full max-w-xs mx-auto block px-8 py-4 text-sm font-extrabold bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 hover:from-yellow-400 hover:via-amber-400 hover:to-yellow-400 text-black shadow-xl shadow-yellow-500/25 border border-yellow-400/50 tracking-wide">
                🎲 Baling Dadu!
              </Button>
            </motion.div>
          )}

          {phase === 'buying' && selectedTile && (
            <motion.div key="buy" initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="max-w-xs mx-auto w-full">
              <Card className="bg-slate-900/95 border-emerald-500/20 shadow-2xl shadow-black/20 backdrop-blur-sm">
                <CardContent className="p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl shadow-inner"
                      style={{ backgroundColor: selectedTile.colorGroup ? `${COLOR_GROUP_HEX[selectedTile.colorGroup]}25` : 'rgba(100,116,139,0.2)' }}>
                      {selectedTile.type === 'highway' ? '🚂' : selectedTile.type === 'media' ? '📺' : '🏛️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-100">{selectedTile.name}</p>
                      <p className="text-[9px] text-slate-400 truncate">{selectedTile.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex justify-between text-[10px] bg-slate-800/50 rounded px-2 py-1">
                      <span className="text-slate-500">Price</span><span className="font-bold text-amber-400">RM{selectedTile.price}</span>
                    </div>
                    {selectedTile.rent && (
                      <div className="flex justify-between text-[10px] bg-slate-800/50 rounded px-2 py-1">
                        <span className="text-slate-500">Rent</span><span className="font-bold text-emerald-400">RM{selectedTile.rent[0]}</span>
                      </div>
                    )}
                    {selectedTile.housePrice && (
                      <div className="flex justify-between text-[10px] bg-slate-800/50 rounded px-2 py-1">
                        <span className="text-slate-500">Hotel</span><span className="text-blue-400">RM{selectedTile.rent[5]}</span>
                      </div>
                    )}
                    {selectedTile.colorGroup && (
                      <div className="flex justify-between text-[10px] bg-slate-800/50 rounded px-2 py-1">
                        <span className="text-slate-500">Group</span>
                        <span className="font-semibold" style={{ color: COLOR_GROUP_HEX[selectedTile.colorGroup] }}>{selectedTile.colorGroup}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button onClick={buyProperty} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-9 shadow-lg shadow-emerald-600/20">
                      <CreditCard className="h-3.5 w-3.5 mr-1" />Beli
                    </Button>
                    <Button onClick={skipBuy} variant="outline" className="flex-1 border-slate-600 text-slate-300 text-xs h-9 hover:bg-slate-800">
                      <SkipForward className="h-3.5 w-3.5 mr-1" />Lewat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'paying_rent' && currentRentPayment && (
            <motion.div key="rent" initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
              className="max-w-xs mx-auto">
              <Card className="bg-red-950/80 border-red-500/30 shadow-2xl shadow-red-500/10 backdrop-blur-sm">
                <CardContent className="p-3.5 text-center space-y-2.5">
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: 2 }}><AlertTriangle className="h-6 w-6 text-red-400 mx-auto" /></motion.div>
                  <p className="text-xs font-bold text-red-300">Rent Perlu Dibayar!</p>
                  <p className="text-[10px] text-slate-300">Bayar <span className="font-black text-red-400 text-sm">RM{currentRentPayment.amount}</span> kepada {players.find(p => p.id === currentRentPayment.to)?.name}</p>
                  <Button onClick={payRent} className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold h-9 shadow-lg shadow-red-600/20">
                    <DollarSign className="h-3.5 w-3.5 mr-1" />Bayar RM{currentRentPayment.amount}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'card' && currentCard && (
            <motion.div key="card" initial={{ opacity: 0, y: 20, rotateY: 60, scale: 0.9 }} animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }} exit={{ opacity: 0, y: 20, rotateY: -60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="max-w-xs mx-auto">
              <Card className={`shadow-2xl backdrop-blur-sm ${currentCard.effect.value > 0 ? 'bg-emerald-950/80 border-emerald-500/30' : 'bg-red-950/80 border-red-500/30'}`}>
                <CardContent className="p-3.5 space-y-2 text-center">
                  <p className={`text-sm font-black ${currentCard.effect.value > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {currentCard.effect.type === 'money' && currentCard.effect.value > 0 && '💰'}
                    {currentCard.effect.type === 'money' && currentCard.effect.value < 0 && '💸'}
                    {currentCard.effect.type === 'move' && currentCard.effect.value > 0 && '➡️'}
                    {currentCard.effect.type === 'move' && currentCard.effect.value < 0 && '⬅️'}
                    {currentCard.effect.type === 'jail' && '⛓️'}
                    {currentCard.effect.type === 'go_to' && '🏁'}
                    {currentCard.effect.type === 'collect_all' && '🤲'}
                    {currentCard.effect.type === 'pay_all' && '😰'}
                    {' '}{currentCard.title}
                  </p>
                  <p className="text-[10px] text-slate-300 leading-relaxed">{currentCard.description}</p>
                  <Button onClick={() => applyCard(currentCard)} className="w-full bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold h-9">
                    <ChevronRight className="h-3.5 w-3.5 mr-1" />Terima
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'jail_decision' && isPlayerTurn && currentPlayer?.isInJail && (
            <motion.div key="jail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="max-w-xs mx-auto">
              <Card className="bg-orange-950/80 border-orange-500/30 shadow-2xl backdrop-blur-sm">
                <CardContent className="p-3.5 space-y-2.5 text-center">
                  <p className="text-xs font-bold text-orange-300">⛓️ Tahanan SPR</p>
                  <p className="text-[10px] text-slate-400">Turn {currentPlayer.jailTurns}/3 sebelum dibebaskan</p>
                  <div className="flex gap-2">
                    <Button onClick={() => handleJailDecision(true)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold h-9">
                      <DollarSign className="h-3.5 w-3.5 mr-1" />Bayar RM50
                    </Button>
                    <Button onClick={() => handleJailDecision(false)} variant="outline" className="flex-1 border-orange-600/50 text-orange-300 text-xs h-9 hover:bg-orange-900/30">
                      🎲 Baling Doubles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'landed' && isPlayerTurn && (
            <motion.div key="end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button onClick={endTurn} variant="outline"
                className="px-6 py-2.5 border-slate-600/50 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-medium transition-colors">
                Akhir Giliran <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </motion.div>
          )}

          {phase === 'game_over' && (
            <motion.div key="over" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm mx-auto">
              <Card className="bg-gradient-to-br from-yellow-900/80 via-amber-900/60 to-yellow-900/80 border-yellow-500/50 shadow-2xl shadow-yellow-500/10 backdrop-blur-sm">
                <CardContent className="p-5 text-center space-y-3">
                  <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <Trophy className="h-12 w-12 text-yellow-400 mx-auto drop-shadow-lg" />
                  </motion.div>
                  <h2 className="text-xl font-black text-yellow-400 tracking-tight">PILIHAN RAYA TAMAT!</h2>
                  {winner && (
                    <p className="text-sm text-slate-200">
                      <span className="font-black text-base" style={{ color: COALITIONS[players.find(p => p.id === winner)?.coalitionId || 'PH']?.color }}>
                        {players.find(p => p.id === winner)?.name}
                      </span>
                      <br /><span className="text-slate-400 text-xs">memenangi pilihan raya!</span>
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    {winner === 'player' ? '🎉 Tahniah YAB! Kerajaan terbentuk!' : '😞 Pembangkang menang. Tunggu GE16!'}
                  </p>
                  <Button onClick={() => window.location.reload()} className="bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold shadow-lg">Pilihan Raya Baru</Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Left sidebar */}
      <div className="absolute top-8 left-1.5 w-48 space-y-1 pointer-events-auto max-h-[55vh] overflow-y-auto hidden md:block">
        {players.map(p => <PlayerCard key={p.id} player={p} isCurrentTurn={p.id === currentPlayerId} />)}
      </div>

      {/* Right sidebar */}
      <div className="absolute top-8 right-1.5 w-56 pointer-events-auto hidden md:block">
        <GameLogPanel />
      </div>

      {/* Mobile log */}
      <div className="md:hidden pointer-events-auto px-2 pb-16">
        <GameLogPanel />
      </div>

      <AIQuoteBubble />
      <TileDetail />
      <PropertyPortfolio />
    </div>
  );
}