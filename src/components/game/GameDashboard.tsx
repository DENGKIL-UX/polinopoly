'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useGameStore, type Player } from '@/lib/game-store';
import { COALITIONS, BOARD_TILES, type GameCard } from '@/lib/game-data';
import {
  Wallet, ArrowRight, Gavel, CreditCard,
  AlertTriangle, Trophy, MessageSquare, TrendingUp, TrendingDown,
  ChevronRight, SkipForward, DollarSign, Building2, Crown,
} from 'lucide-react';

// Dice faces
const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function DiceDisplay({ value, rolling }: { value: number | null; rolling: boolean }) {
  return (
    <motion.div
      animate={rolling ? { rotate: [0, 360], scale: [1, 1.15, 1] } : {}}
      transition={rolling ? { duration: 0.4, repeat: 2 } : {}}
      className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-white shadow-lg flex items-center justify-center text-xl md:text-2xl"
    >
      {value ? DICE_FACES[value] : '⚀'}
    </motion.div>
  );
}

function PlayerCard({ player, isCurrentTurn }: { player: Player; isCurrentTurn: boolean }) {
  const coalition = COALITIONS[player.coalitionId];
  if (player.isBankrupt) return null;

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all text-xs ${
      isCurrentTurn
        ? 'border-yellow-400/80 bg-yellow-400/10 shadow-md shadow-yellow-400/10'
        : 'border-slate-700/40 bg-slate-800/40'
    }`}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
        style={{ backgroundColor: coalition.color }}>
        {player.avatarEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold truncate" style={{ color: coalition.color }}>{player.name}</span>
          {player.isAI && <span className="text-[8px] text-slate-500">AI</span>}
          {player.isInJail && <span className="text-[8px] text-red-400">JAIL</span>}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-slate-400">
          <span className="flex items-center gap-0.5"><Wallet className="h-2.5 w-2.5" />RM{player.money.toLocaleString()}</span>
          <span className="flex items-center gap-0.5"><Building2 className="h-2.5 w-2.5" />{player.properties.length}</span>
        </div>
      </div>
      {isCurrentTurn && (
        <motion.div animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
          <ArrowRight className="h-3 w-3 text-yellow-400" />
        </motion.div>
      )}
    </div>
  );
}

function MarketTicker() {
  const [ticks, setTicks] = useState({ klci: 1587.3, klciChange: -0.8, cpoPrice: 3950, cpoChange: 2.3, ringgitUsd: 4.47, ringgitChange: -0.2 });

  useEffect(() => {
    const iv = setInterval(() => {
      setTicks(p => ({
        klci: +(p.klci + (Math.random() - 0.48) * 3).toFixed(1),
        klciChange: +((Math.random() - 0.45) * 2.5).toFixed(1),
        cpoPrice: Math.round(p.cpoPrice + (Math.random() - 0.45) * 50),
        cpoChange: +((Math.random() - 0.4) * 3).toFixed(1),
        ringgitUsd: +(p.ringgitUsd + (Math.random() - 0.52) * 0.02).toFixed(2),
        ringgitChange: +((Math.random() - 0.5) * 0.3).toFixed(2),
      }));
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex items-center gap-3 overflow-x-auto px-3 py-1 bg-slate-900/90 border-b border-slate-700/40 text-[10px]">
      <span className="font-bold text-yellow-500 flex items-center gap-1 flex-shrink-0">
        <TrendingUp className="h-3 w-3" />BURSA
      </span>
      {[
        { l: 'KLCI', v: ticks.klci.toFixed(1), c: ticks.klciChange },
        { l: 'CPO', v: `RM${ticks.cpoPrice}`, c: ticks.cpoChange },
        { l: 'MYR/USD', v: ticks.ringgitUsd.toFixed(2), c: ticks.ringgitChange * 10 },
      ].map((item, i) => (
        <span key={i} className="flex items-center gap-1 flex-shrink-0">
          <span className="text-slate-500">{item.l}</span>
          <span className="font-bold text-slate-200">{item.v}</span>
          <span className={item.c >= 0 ? 'text-green-400' : 'text-red-400'}>
            {item.c >= 0 ? '▲' : '▼'}{Math.abs(item.c).toFixed(1)}%
          </span>
        </span>
      ))}
    </div>
  );
}

function GameLogPanel() {
  const gameLog = useGameStore(s => s.gameLog);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [gameLog.length]);

  return (
    <Card className="bg-slate-900/80 border-slate-700/40">
      <CardHeader className="p-2 pb-1">
        <CardTitle className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
          <MessageSquare className="h-3 w-3 text-yellow-500" />Hansard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-1.5 pt-0">
        <div ref={ref} className="h-36 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
          {gameLog.slice(-25).reverse().map(e => (
            <div key={e.id} className="text-[9px] leading-relaxed text-slate-400 border-l border-slate-700 pl-1.5">
              <span className="text-slate-600 mr-1">T{e.turn}</span>{e.message}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AIQuoteBubble() {
  const players = useGameStore(s => s.players);
  const aiThinking = useGameStore(s => s.aiThinking);
  const aiWithQuotes = players.filter(p => p.isAI && p.quote && !p.isBankrupt);
  const latest = aiWithQuotes[aiWithQuotes.length - 1];

  if (!latest && !aiThinking) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="absolute bottom-16 left-2 right-2 md:left-auto md:right-2 md:w-72 z-30"
      >
        <Card className="bg-slate-800/95 border-yellow-500/20 shadow-xl">
          <CardContent className="p-2.5">
            {aiThinking && !latest ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
                <span className="text-[10px] text-yellow-400">AI sedang berfikir...</span>
              </div>
            ) : latest ? (
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] flex-shrink-0"
                  style={{ backgroundColor: COALITIONS[latest.coalitionId]?.color }}>
                  {latest.avatarEmoji}
                </div>
                <div>
                  <p className="text-[9px] font-bold" style={{ color: COALITIONS[latest.coalitionId]?.color }}>{latest.name}</p>
                  <p className="text-[10px] text-slate-300 italic">&ldquo;{latest.quote}&rdquo;</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Selected tile detail popup
function TileDetail() {
  const selectedTileId = useGameStore(s => s.selectedTileId);
  const tiles = useGameStore(s => s.tiles);
  const selectTile = useGameStore(s => s.selectTile);

  if (selectedTileId === null) return null;
  const tile = tiles.find(t => t.id === selectedTileId);
  if (!tile) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute top-28 left-1/2 -translate-x-1/2 z-30"
      >
        <Card className="bg-slate-800/95 border-slate-600/50 shadow-2xl min-w-52">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-200">{tile.name}</span>
              <button onClick={() => selectTile(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
            </div>
            <p className="text-[9px] text-slate-400 mb-2">{tile.description}</p>
            {tile.price && <p className="text-[10px] text-amber-400">Price: RM{tile.price}</p>}
            {tile.rent && <p className="text-[10px] text-green-400">Base Rent: RM{tile.rent[0]}</p>}
            {tile.owner && (
              <p className="text-[10px] text-purple-300 mt-1">
                Owner: <span style={{ color: COALITIONS[tile.owner]?.color }}>{COALITIONS[tile.owner]?.name || tile.owner}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

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
      {/* Ticker */}
      <MarketTicker />

      {/* Dice & Turn */}
      <div className="flex-1" />

      {/* Bottom actions area */}
      <div className="pointer-events-auto pb-2 px-2 flex justify-center">
        <AnimatePresence mode="wait">
          {phase === 'playing' && isPlayerTurn && (
            <motion.div key="roll" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-3 mb-3 justify-center">
                <DiceDisplay value={diceValues?.[0] ?? null} rolling={phase === 'rolling'} />
                <DiceDisplay value={diceValues?.[1] ?? null} rolling={phase === 'rolling'} />
                {diceValues && (
                  <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-lg font-bold text-yellow-400">
                    = {diceValues[0] + diceValues[1]}
                  </motion.span>
                )}
                {diceValues && diceValues[0] === diceValues[1] && (
                  <Badge className="bg-yellow-500 text-black text-[10px]">DOUBLES!</Badge>
                )}
              </div>
              <Button onClick={rollDice} size="lg"
                className="w-full max-w-xs mx-auto block px-8 py-4 text-sm font-bold bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black shadow-xl shadow-yellow-500/20">
                🎲 Baling Dadu!
              </Button>
            </motion.div>
          )}

          {phase === 'buying' && selectedTile && (
            <motion.div key="buy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="max-w-xs mx-auto w-full">
              <Card className="bg-slate-900/95 border-slate-600/50 shadow-2xl">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{selectedTile.type === 'highway' ? '🚂' : selectedTile.type === 'media' ? '📺' : '🏛️'}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{selectedTile.name}</p>
                      <p className="text-[9px] text-slate-400">{selectedTile.description}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Price:</span>
                    <span className="font-bold text-amber-400">RM{selectedTile.price}</span>
                  </div>
                  {selectedTile.rent && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Base Rent:</span>
                      <span className="text-green-400">RM{selectedTile.rent[0]}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button onClick={buyProperty} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold h-8">
                      <CreditCard className="h-3 w-3 mr-1" />Buy
                    </Button>
                    <Button onClick={skipBuy} variant="outline" className="flex-1 border-slate-600 text-slate-300 text-xs h-8">
                      <SkipForward className="h-3 w-3 mr-1" />Pass
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'paying_rent' && currentRentPayment && (
            <motion.div key="rent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <Card className="bg-red-950/80 border-red-500/30 shadow-2xl max-w-xs mx-auto">
                <CardContent className="p-3 text-center space-y-2">
                  <AlertTriangle className="h-5 w-5 text-red-400 mx-auto" />
                  <p className="text-xs font-bold text-red-300">Rent Due!</p>
                  <p className="text-[10px] text-slate-300">
                    Pay <span className="font-bold text-red-400">RM{currentRentPayment.amount}</span> to {players.find(p => p.id === currentRentPayment.to)?.name}
                  </p>
                  <Button onClick={payRent} className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold h-8">
                    <DollarSign className="h-3 w-3 mr-1" />Pay RM{currentRentPayment.amount}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'card' && currentCard && (
            <motion.div key="card" initial={{ opacity: 0, y: 20, rotateY: 60 }} animate={{ opacity: 1, y: 0, rotateY: 0 }} exit={{ opacity: 0, y: 20 }}
              className="max-w-xs mx-auto">
              <Card className={`shadow-2xl ${currentCard.effect.value > 0 ? 'bg-green-950/80 border-green-500/30' : 'bg-red-950/80 border-red-500/30'}`}>
                <CardContent className="p-3 space-y-2 text-center">
                  <p className={`text-xs font-bold ${currentCard.effect.value > 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {currentCard.effect.type === 'money' && currentCard.effect.value > 0 && '💰'}
                    {currentCard.effect.type === 'money' && currentCard.effect.value < 0 && '💸'}
                    {currentCard.effect.type === 'move' && '➡️'}
                    {currentCard.effect.type === 'jail' && '⛓️'}
                    {currentCard.effect.type === 'go_to' && '🏁'}
                    {currentCard.effect.type === 'collect_all' && '🤲'}
                    {currentCard.effect.type === 'pay_all' && '😰'}
                    {' '}{currentCard.title}
                  </p>
                  <p className="text-[10px] text-slate-300">{currentCard.description}</p>
                  <Button onClick={() => applyCard(currentCard)} className="w-full bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold h-8">
                    Apply
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'jail_decision' && isPlayerTurn && currentPlayer?.isInJail && (
            <motion.div key="jail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <Card className="bg-orange-950/80 border-orange-500/30 shadow-2xl max-w-xs mx-auto">
                <CardContent className="p-3 space-y-2 text-center">
                  <p className="text-xs font-bold text-orange-300">⛓️ Tahanan SPR (Turn {currentPlayer.jailTurns}/3)</p>
                  <div className="flex gap-2">
                    <Button onClick={() => handleJailDecision(true)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold h-8">
                      <DollarSign className="h-3 w-3 mr-1" />Pay RM50
                    </Button>
                    <Button onClick={() => handleJailDecision(false)} variant="outline" className="flex-1 border-orange-700 text-orange-300 text-xs h-8">
                      🎲 Roll Doubles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'landed' && isPlayerTurn && (
            <motion.div key="end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button onClick={endTurn} variant="outline" className="px-6 py-2 border-slate-600 text-slate-300 hover:bg-slate-800 text-xs">
                End Turn <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </motion.div>
          )}

          {phase === 'game_over' && (
            <motion.div key="over" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm mx-auto">
              <Card className="bg-gradient-to-br from-yellow-900/80 to-amber-900/80 border-yellow-500/50 shadow-2xl">
                <CardContent className="p-4 text-center space-y-2">
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <Trophy className="h-10 w-10 text-yellow-400 mx-auto" />
                  </motion.div>
                  <h2 className="text-lg font-black text-yellow-400">PILIHAN RAYA TAMAT!</h2>
                  {winner && (
                    <p className="text-xs text-slate-300">
                      <span className="font-bold" style={{ color: COALITIONS[players.find(p => p.id === winner)?.coalitionId || 'PH']?.color }}>
                        {players.find(p => p.id === winner)?.name}
                      </span> wins!
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    {winner === 'player' ? '🎉 You formed the government, YAB!' : '😞 Opposition wins. GE16, maybe?'}
                  </p>
                  <Button onClick={() => window.location.reload()} className="bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold">New Game</Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Left sidebar - Player cards */}
      <div className="absolute top-8 left-1.5 w-44 space-y-1 pointer-events-auto max-h-[60vh] overflow-y-auto scrollbar-thin hidden md:block">
        {players.map(p => (
          <PlayerCard key={p.id} player={p} isCurrentTurn={p.id === currentPlayerId} />
        ))}
      </div>

      {/* Right sidebar - Log */}
      <div className="absolute top-8 right-1.5 w-56 pointer-events-auto hidden md:block">
        <GameLogPanel />
      </div>

      {/* Mobile log at bottom */}
      <div className="md:hidden pointer-events-auto px-2 pb-14">
        <GameLogPanel />
      </div>

      <AIQuoteBubble />
      <TileDetail />
    </div>
  );
}