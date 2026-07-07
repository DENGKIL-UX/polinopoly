'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore, type Player, type AuctionState, type Achievement } from '@/lib/game-store';
import { COALITIONS, BOARD_TILES, COLOR_GROUP_HEX, COLOR_GROUP_COALITION, type GameCard } from '@/lib/game-data';
import {
  Wallet, ArrowRight, Gavel, CreditCard,
  AlertTriangle, Trophy, MessageSquare, TrendingUp, TrendingDown,
  ChevronRight, SkipForward, DollarSign, Building2, Crown,
  Briefcase, Hammer, Home, X, Landmark, HelpCircle, RotateCw,
  Volume2, VolumeX, Zap, Save, FolderOpen, Medal, Settings,
  Banknote, ShieldDown, Shield, Gauge, Star, Handshake, Keyboard,
} from 'lucide-react';
import { soundManager, useSoundEnabled } from '@/lib/sound-effects';
import { CoalitionLogo } from '@/components/game/CoalitionLogo';

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚄', '⚅'];

// Pip positions on a die face (percentage x, y for each pip)
const PIP_LAYOUT: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
};

/* ─── Sound Toggle ─── */
function SoundToggleButton() {
  const [enabled, toggle] = useSoundEnabled();
  return (
    <button
      onClick={toggle}
      className="w-7 h-7 rounded-full bg-slate-800/80 border border-slate-600/40 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors backdrop-blur-sm"
      title={enabled ? 'Mute sounds' : 'Enable sounds'}
    >
      {enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
    </button>
  );
}

/* ─── How to Play ─── */
function HowToPlayButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="pointer-events-auto w-8 h-8 rounded-full bg-slate-800/80 border border-slate-600/40 flex items-center justify-center text-slate-400 hover:text-yellow-400 hover:border-yellow-500/40 transition-colors backdrop-blur-sm"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            className="absolute top-10 right-0 w-64 z-40 pointer-events-auto"
          >
            <Card className="bg-slate-900/95 border-slate-600/40 shadow-2xl shadow-black/30 backdrop-blur-sm">
              <CardHeader className="p-3 pb-1.5">
                <CardTitle className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" />Cara Bermain / How to Play
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 text-[9px] text-slate-300 space-y-1.5 leading-relaxed">
                <p>🎲 <b className="text-slate-200">Baling Dadu</b> — Roll dice to move around the board.</p>
                <p>🏛️ <b className="text-slate-200">Beli Hartanah</b> — Buy unowned properties to collect rent.</p>
                <p>🏠 <b className="text-slate-200">Bina Rumah</b> — Own a full color set? Build houses for 2× rent!</p>
                <p>⛓️ <b className="text-slate-200">Tahanan SPRM</b> — Land on TAHANAN or roll 3 doubles = jail.</p>
                <p>📜⚡ <b className="text-slate-200">Kad</b> — Jawatan Menteri & Krisis Nasional cards change your fate.</p>
                <p>🏆 <b className="text-slate-200">Menang</b> — Last coalition standing wins Dewan Rakyat!</p>
                <p className="text-slate-500 pt-1 border-t border-slate-700/30">AI controls 5 other coalitions automatically.</p>
                <p className="text-slate-500 pt-1 border-t border-slate-700/30 flex items-center gap-1">
                  <Keyboard className="h-2.5 w-2.5" /><b className="text-slate-400">Shortcuts:</b> Space/Enter = Roll · B = Buy · P = Pass · S = Sound · Esc = Close
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Dice ─── */
function DiceDisplay({ value, rolling }: { value: number | null; rolling: boolean }) {
  return (
    <div className="relative" style={{ perspective: '200px' }}>
      <div className="absolute inset-0 rounded-lg bg-yellow-400/15 blur-md pointer-events-none" />
      <motion.div
        animate={rolling ? { rotateX: [0, 180, 360, 540, 720], rotateY: [0, 90, 180, 270, 360], scale: [1, 1.15, 0.95, 1.1, 1] } : { rotateX: 0, rotateY: 0, scale: 1 }}
        transition={rolling ? { duration: 0.6, ease: 'easeInOut' } : { duration: 0.2 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg shadow-xl shadow-black/40"
      >
        {/* 3D dice face — CSS 3D cube with pip dots */}
        <div
          className="absolute inset-0 rounded-lg flex flex-wrap items-center justify-center content-center gap-[2px] p-1.5"
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #e2e8f0 50%, #cbd5e1 100%)',
            border: '1.5px solid #94a3b8',
            boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.3)',
          }}
        >
          {value ? PIP_LAYOUT[value].map((pos, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 md:w-2.5 md:h-2.5 rounded-full"
              style={{
                left: `calc(${pos[0]}% - 4px)`,
                top: `calc(${pos[1]}% - 4px)`,
                background: 'radial-gradient(circle at 30% 30%, #1e1b2e, #000)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
              }}
            />
          )) : (
            <span
              className="absolute w-2.5 h-2.5 rounded-full"
              style={{
                left: 'calc(50% - 5px)',
                top: 'calc(50% - 5px)',
                background: 'radial-gradient(circle at 30% 30%, #1e1b2e, #000)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
              }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Player Card ─── */
function PlayerCard({ player, isCurrentTurn }: { player: Player; isCurrentTurn: boolean }) {
  const coalition = COALITIONS[player.coalitionId];
  const tiles = useGameStore(s => s.tiles);
  if (player.isBankrupt) return null;

  // Calculate net worth (cash + property values + house investments)
  const propertyValue = player.properties.reduce((sum, tid) => {
    const tile = BOARD_TILES[tid];
    const state = tiles[tid];
    const houseVal = (state?.houses ?? 0) * (tile?.housePrice ?? 0);
    return sum + (tile?.price ?? 0) + houseVal;
  }, 0);
  const netWorth = player.money + propertyValue;

  return (
    <div className={`relative overflow-hidden flex items-center gap-2 px-2.5 py-2 pt-2.5 rounded-xl border transition-all text-xs backdrop-blur-sm flex-shrink-0 ${
      isCurrentTurn
        ? 'border-yellow-400/70 bg-yellow-400/10 shadow-lg shadow-yellow-400/5'
        : 'border-slate-700/30 bg-slate-800/30'
    }`}>
      {/* Wealth bar at the bottom — thicker with gradient + glow */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-900/60">
        <motion.div
          className="h-full relative overflow-hidden"
          style={{
            background: `linear-gradient(90deg, ${coalition.color}cc, ${coalition.color})`,
            boxShadow: `0 0 8px ${coalition.color}80, inset 0 1px 0 rgba(255,255,255,0.25)`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (netWorth / 4000) * 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Shimmering highlight that sweeps across the bar */}
          <motion.div
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            animate={{ x: ['-100%', '400%'] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'linear', repeatDelay: 1.2 }}
          />
        </motion.div>
        {/* Tick marks every RM1000 */}
        {[1000, 2000, 3000].map(tick => (
          <div key={tick} className="absolute top-0 bottom-0 w-px bg-slate-950/40"
            style={{ left: `${(tick / 4000) * 100}%` }} />
        ))}
      </div>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 shadow-md border border-white/10 overflow-hidden bg-white"
        style={{ boxShadow: `0 0 8px ${coalition.color}30` }}>
        <CoalitionLogo coalitionId={player.coalitionId} size={26} circular alt={player.name} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold truncate" style={{ color: coalition.color }}>{player.name}</span>
          {player.isAI && <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-slate-600 text-slate-500">AI</Badge>}
          {player.isInJail && <Badge className="text-[7px] px-1 py-0 h-3.5 bg-red-600">JAIL</Badge>}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-0.5">
          <span className="flex items-center gap-0.5"><Wallet className="h-2.5 w-2.5" /><span className="font-semibold text-slate-300">RM{player.money.toLocaleString()}</span></span>
          <span className="flex items-center gap-0.5" title={`Net worth: RM${netWorth.toLocaleString()}`}><Building2 className="h-2.5 w-2.5" />{player.properties.length} props</span>
          {player.hasGetOutOfJailFree && <span className="text-amber-400" title="Get Out of Jail Free">🔑</span>}
        </div>
        {/* Net worth label under bar (tiny) */}
        <div className="text-[7px] text-slate-500/80 mt-0.5 font-mono">
          NW: RM{netWorth.toLocaleString()}
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

/* ─── Turn Announcement Banner ─── */
function TurnBanner() {
  const players = useGameStore(s => s.players);
  const turnOrder = useGameStore(s => s.turnOrder);
  const currentTurnIndex = useGameStore(s => s.currentTurnIndex);
  const phase = useGameStore(s => s.phase);
  const turnCount = useGameStore(s => s.turnCount);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const [bannerColor, setBannerColor] = useState('#fbbf24');
  const prevPlayerId = useRef<string | null>(null);

  useEffect(() => {
    const currentPlayerId = turnOrder[currentTurnIndex];
    if (currentPlayerId && currentPlayerId !== prevPlayerId.current) {
      const player = players.find(p => p.id === currentPlayerId);
      if (player) {
        const coalition = COALITIONS[player.coalitionId];
        const text = player.isAI ? `${player.name} sedang berfikir...` : `Giliran ${player.name}!`;
        const color = coalition?.color || '#fbbf24';
        queueMicrotask(() => {
          setBannerText(text);
          setBannerColor(color);
          setShowBanner(true);
        });
        const timer = setTimeout(() => queueMicrotask(() => setShowBanner(false)), 2500);
        prevPlayerId.current = currentPlayerId;
        return () => clearTimeout(timer);
      }
    }
  }, [currentTurnIndex, turnOrder, players]);

  if (!showBanner || phase === 'lobby' || phase === 'game_over') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute top-[20%] left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      >
        <div
          className="px-6 py-2.5 rounded-full backdrop-blur-md shadow-2xl border-2"
          style={{
            borderColor: bannerColor,
            background: `linear-gradient(135deg, rgba(10,10,30,0.92) 0%, rgba(20,20,50,0.88) 100%)`,
            boxShadow: `0 0 25px ${bannerColor}30, 0 4px 20px rgba(0,0,0,0.5)`,
          }}
        >
          <p className="text-sm font-bold tracking-wide" style={{ color: bannerColor }}>
            {bannerText}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Market Ticker ─── */
function MarketTicker() {
  const [ticks, setTicks] = useState({ klci: 1587.3, klciChange: -0.8, cpoPrice: 3950, cpoChange: 2.3, ringgitUsd: 4.47, ringgitChange: -0.2, inflation: 1.0 });
  const [tickKey, setTickKey] = useState(0);
  const centerPot = useGameStore(s => s.centerPot);
  const housesAvailable = useGameStore(s => s.housesAvailable);
  const hotelsAvailable = useGameStore(s => s.hotelsAvailable);
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
      setTickKey(k => k + 1);
    }, 5000);
    return () => clearInterval(iv);
  }, []);
  const items = [
    { l: 'KLCI', v: ticks.klci.toFixed(1), c: ticks.klciChange },
    { l: 'CPO', v: `RM${ticks.cpoPrice}`, c: ticks.cpoChange },
    { l: 'MYR', v: ticks.ringgitUsd.toFixed(2), c: ticks.ringgitChange * 10 },
    { l: 'INF', v: `×${ticks.inflation}`, c: (ticks.inflation - 1) * 50 },
  ];
  return (
    <div className="flex items-center gap-3 md:gap-4 overflow-x-auto px-3 py-1.5 bg-slate-950/90 border-b border-slate-700/30 text-[10px] backdrop-blur-sm">
      <span className="font-bold text-yellow-500 flex items-center gap-1.5 flex-shrink-0">
        <TrendingUp className="h-3 w-3" />
        <span className="hidden sm:inline">BURSA MALAYSIA</span>
        <span className="sm:hidden">📈</span>
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
        />
        <span className="text-[8px] text-emerald-400 font-medium hidden sm:inline">LIVE</span>
      </span>
      {items.map((item, i) => (
        <motion.span
          key={i}
          layout
          initial={false}
          className="flex items-center gap-1 flex-shrink-0"
        >
          <span className="text-slate-500 font-medium">{item.l}</span>
          <motion.span
            key={`${item.l}-val-${tickKey}`}
            initial={{ opacity: 0.4, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="font-bold text-slate-200"
          >
            {item.v}
          </motion.span>
          <motion.span
            key={`${item.l}-chg-${tickKey}`}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-0.5 ${item.c >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
            style={{ minWidth: 38 }}
          >
            {item.c >= 0
              ? <TrendingUp className="h-2.5 w-2.5" />
              : <TrendingDown className="h-2.5 w-2.5" />}
            {Math.abs(item.c).toFixed(1)}%
          </motion.span>
        </motion.span>
      ))}
      {/* Rakyat Fund (Free Parking jackpot) */}
      <span className="flex items-center gap-1 flex-shrink-0 border-l border-slate-700/40 pl-3">
        <span className="text-amber-500">👑</span>
        <span className="text-slate-500 font-medium">RAKYAT</span>
        <motion.span
          key={`pot-${centerPot}`}
          initial={{ scale: 1.3, color: '#fbbf24' }}
          animate={{ scale: 1, color: '#e2e8f0' }}
          transition={{ duration: 0.4 }}
          className="font-bold"
        >
          RM{centerPot}
        </motion.span>
      </span>
      {/* House/Hotel supply */}
      <span className="hidden sm:flex items-center gap-1 flex-shrink-0">
        <span className="text-green-500">🏠</span>
        <span className="text-slate-500">{housesAvailable}</span>
        <span className="text-red-500 ml-1">🏨</span>
        <span className="text-slate-500">{hotelsAvailable}</span>
      </span>
    </div>
  );
}

/* ─── Game Log ─── */
function GameLogPanel() {
  const gameLog = useGameStore(s => s.gameLog);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [gameLog.length]);
  return (
    <Card className="bg-slate-950/80 border-slate-700/20 backdrop-blur-md">
      <CardHeader className="p-2 pb-1">
        <CardTitle className="text-[10px] font-bold text-amber-400/80 flex items-center gap-1 tracking-wide uppercase">
          <Landmark className="h-3 w-3" />Hansard Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-1 pt-0">
        <div ref={ref} className="h-44 overflow-y-auto space-y-0.5 pr-1 dark-scroll">
          {gameLog.slice(-40).reverse().map(e => (
            <div key={e.id} className="text-[10px] leading-relaxed text-slate-300 border-l-2 pl-2 py-0.5 transition-colors hover:bg-slate-800/30 rounded-r"
              style={{ borderColor: e.type === 'ai_quote' ? 'rgba(234,179,8,0.4)' : e.type === 'buy' ? 'rgba(74,222,128,0.4)' : e.type === 'rent' ? 'rgba(248,113,113,0.4)' : e.type === 'jail' ? 'rgba(220,38,38,0.4)' : e.type === 'card' ? 'rgba(168,85,247,0.4)' : 'rgba(100,116,139,0.3)' }}>
              <span className="text-slate-500 mr-1 font-mono text-[9px]">T{e.turn}</span>{e.message}
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
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 shadow-md border border-white/10 overflow-hidden bg-white">
                  <CoalitionLogo coalitionId={latest.coalitionId} size={20} circular alt={latest.playerName} />
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
  const players = useGameStore(s => s.players);
  const selectTile = useGameStore(s => s.selectTile);
  const mortgagedTiles = useGameStore(s => s.mortgagedTiles);
  if (selectedTileId === null) return null;
  const tile = tiles.find(t => t.id === selectedTileId);
  const tileData = BOARD_TILES.find(t => t.id === selectedTileId);
  if (!tile || !tileData) return null;
  const ownerPlayer = tile.owner ? COALITIONS[tile.owner] : null;
  const ownerRealPlayer = tile.owner ? players.find(p => p.id === tile.owner) : null;
  const isMortgaged = mortgagedTiles.includes(tile.id);

  // Color group info
  const groupInfo = tileData.colorGroup ? (() => {
    const groupTiles = BOARD_TILES.filter(t => t.colorGroup === tileData.colorGroup);
    const groupStates = groupTiles.map(t => tiles.find(st => st.id === t.id)).filter(Boolean);
    const owned = groupStates.filter(t => t!.owner);
    const owners = [...new Set(owned.map(t => t!.owner!))];
    const monopoly = owners.length === 1 && owned.length === groupTiles.length;
    return { groupTiles, groupStates, owned, owners, monopoly, hex: COLOR_GROUP_HEX[tileData.colorGroup!] };
  })() : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        className="absolute top-28 left-1/2 -translate-x-1/2 z-30"
      >
        <Card className="bg-slate-900/95 border-slate-600/40 shadow-2xl shadow-black/30 min-w-60 backdrop-blur-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{ backgroundColor: tileData.colorGroup ? `${COLOR_GROUP_HEX[tileData.colorGroup]}30` : 'rgba(100,116,139,0.2)' }}>
                  {tileData.type === 'highway' ? '🚂' : tileData.type === 'media' ? '📺' : tileData.type === 'tax' ? '💰' : tileData.type === 'chest' ? '📜' : tileData.type === 'chance' ? '⚡' : tileData.type === 'corner' ? '👑' : '🏛️'}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-100">{tileData.name}</span>
                  {tileData.colorGroup && (
                    <p className="text-[8px] text-slate-500 capitalize">{tileData.colorGroup} — {COALITIONS[COLOR_GROUP_COALITION[tileData.colorGroup]]?.name}</p>
                  )}
                </div>
              </div>
              <button onClick={() => selectTile(null)} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-[9px] text-slate-400 mb-2 leading-relaxed">{tileData.description}</p>

            {/* Color group ownership bar */}
            {groupInfo && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] text-slate-500 capitalize">{tileData.colorGroup} Group</span>
                  {groupInfo.monopoly && (
                    <Badge className="text-[7px] px-1.5 py-0 h-3.5 bg-yellow-600 text-yellow-100">MONOPOLY</Badge>
                  )}
                </div>
                <div className="flex gap-[2px]">
                  {groupInfo.groupTiles.map(t => {
                    const st = tiles.find(x => x.id === t.id);
                    const op = st?.owner ? players.find(p => p.id === st!.owner) : null;
                    return (
                      <div key={t.id} className="flex-1 h-3 rounded-sm border border-white/10" title={t.name}
                        style={{ backgroundColor: op ? `${COALITIONS[op.coalitionId]?.color}90` : `${groupInfo.hex}20` }}>
                        {st?.houses && st.houses > 0 && (
                          <div className="flex gap-px items-center justify-center h-full">
                            {Array.from({ length: Math.min(st.houses, 4) }).map((_, i) => (
                              <div key={i} className="w-1 h-1.5 bg-green-400 rounded-[1px]" />
                            ))}
                            {st.houses >= 5 && <div className="w-1 h-1.5 bg-red-500 rounded-[1px]" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-[2px] mt-0.5">
                  {groupInfo.groupTiles.map(t => (
                    <div key={t.id} className="flex-1 text-center text-[6px] text-slate-600 truncate">{t.name}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1 text-[10px]">
              {tileData.price && <div className="flex justify-between"><span className="text-slate-500">Price</span><span className="font-bold text-amber-400">RM{tileData.price}</span></div>}
              {tileData.rent && <div className="flex justify-between"><span className="text-slate-500">Base Rent</span><span className="text-emerald-400 font-semibold">RM{tileData.rent[0]}</span></div>}
              {tileData.housePrice && <div className="flex justify-between"><span className="text-slate-500">House Cost</span><span className="text-blue-400">RM{tileData.housePrice}</span></div>}
              {tileData.mortgageValue && <div className="flex justify-between"><span className="text-slate-500">Mortgage</span><span className="text-orange-400">RM{tileData.mortgageValue}</span></div>}
              {isMortgaged && <div className="flex justify-between"><span className="text-orange-400 font-bold">Status</span><span className="text-orange-300 font-bold">🏦 MORTGAGED</span></div>}
              {tile.houses !== undefined && tile.houses > 0 && (
                <div className="flex justify-between"><span className="text-slate-500">Buildings</span>
                  <span className="text-green-400 font-semibold">{tile.houses >= 5 ? '🏨 Hotel' : `🏠 ×${tile.houses}`}</span>
                </div>
              )}
              {tileData.rent && tile.houses && tile.houses > 0 && (
                <div className="flex justify-between"><span className="text-slate-500">Current Rent</span>
                  <span className="text-yellow-400 font-bold">RM{tileData.rent[Math.min(tile.houses, 5)]}</span>
                </div>
              )}
            </div>
            {ownerRealPlayer && (
              <div className="mt-2 pt-2 border-t border-slate-700/30 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] overflow-hidden bg-white border border-white/10">
                    <CoalitionLogo coalitionId={ownerRealPlayer.coalitionId} size={14} circular alt={ownerRealPlayer.name} />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: COALITIONS[ownerRealPlayer.coalitionId]?.color }}>{ownerRealPlayer.name}</span>
                </div>
                {ownerRealPlayer.isAI && <span className="text-[7px] text-slate-600">AI</span>}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Auction Panel ─── */
function AuctionPanel() {
  const auctionState = useGameStore(s => s.auctionState);
  const players = useGameStore(s => s.players);
  const tiles = useGameStore(s => s.tiles);
  const placeBid = useGameStore(s => s.placeBid);
  const passBid = useGameStore(s => s.passBid);
  const [bidAmount, setBidAmount] = useState('');

  if (!auctionState || !auctionState.isActive) return null;

  const tile = tiles.find(t => t.id === auctionState.tileId);
  if (!tile) return null;

  const currentBidderId = auctionState.bidderOrder[auctionState.currentBidderIndex];
  const currentBidder = players.find(p => p.id === currentBidderId);
  const isHumanTurn = currentBidder?.id === 'player' && !currentBidder?.isAI;
  const highestBidderPlayer = auctionState.highestBidder ? players.find(p => p.id === auctionState.highestBidder) : null;
  const minBid = auctionState.highestBid + Math.max(10, Math.floor(auctionState.highestBid * 0.1));
  const playerMoney = players.find(p => p.id === 'player')?.money || 0;

  const handleBid = () => {
    const amount = parseInt(bidAmount);
    if (isNaN(amount) || amount < minBid || amount > playerMoney) return;
    placeBid('player', amount);
    setBidAmount('');
  };

  const handlePass = () => {
    passBid('player');
    setBidAmount('');
  };

  return (
    <Card className="bg-slate-900/95 border-amber-500/30 shadow-2xl shadow-amber-500/10 backdrop-blur-sm">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
          <Gavel className="h-3.5 w-3.5" />
          LELANGAN — {tile.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-xl shadow-inner"
            style={{
              backgroundColor: tile.colorGroup
                ? `${COLOR_GROUP_HEX[tile.colorGroup]}25`
                : 'rgba(100,116,139,0.2)',
            }}
          >
            {tile.type === 'highway' ? '🚂' : tile.type === 'media' ? '📺' : '🏛️'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400">
              Harga asal: <span className="text-slate-300 font-semibold">RM{tile.price}</span>
            </p>
            <p className="text-[10px] text-slate-400">
              Sewa asas: <span className="text-emerald-400 font-semibold">RM{tile.rent?.[0] || 0}</span>
            </p>
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/30">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-400">Bida tertinggi</span>
            <motion.span
              key={auctionState.highestBid}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-sm font-black text-amber-400"
            >
              RM{auctionState.highestBid}
            </motion.span>
          </div>
          {highestBidderPlayer && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] border border-white/10 overflow-hidden bg-white"
              >
                <CoalitionLogo coalitionId={highestBidderPlayer.coalitionId} size={14} circular alt={highestBidderPlayer.name} />
              </div>
              <span
                className="text-[10px] font-semibold"
                style={{ color: COALITIONS[highestBidderPlayer.coalitionId]?.color }}
              >
                {highestBidderPlayer.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-slate-500">Giliran:</span>
          {currentBidder && (
            <div className="flex items-center gap-1">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] border border-white/10 overflow-hidden bg-white"
              >
                <CoalitionLogo coalitionId={currentBidder.coalitionId} size={14} circular alt={currentBidder.name} />
              </div>
              <span
                className="font-bold"
                style={{ color: COALITIONS[currentBidder.coalitionId]?.color }}
              >
                {currentBidder.name}
              </span>
              {currentBidder.isAI && (
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="text-yellow-400"
                >
                  sedang berfikir...
                </motion.span>
              )}
            </div>
          )}
        </div>

        {isHumanTurn && (
          <div className="space-y-2 pt-1 border-t border-slate-700/30">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bidAmount}
                onChange={e => setBidAmount(e.target.value)}
                placeholder={`Min RM${minBid}`}
                min={minBid}
                max={playerMoney}
                className="flex-1 h-9 px-2.5 bg-slate-800/80 border border-slate-600/50 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleBid}
                disabled={!bidAmount || parseInt(bidAmount) < minBid || parseInt(bidAmount) > playerMoney}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold h-9 shadow-lg shadow-amber-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Gavel className="h-3.5 w-3.5 mr-1" />Bida
              </Button>
              <Button
                onClick={handlePass}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 text-xs h-9 hover:bg-slate-800"
              >
                <SkipForward className="h-3.5 w-3.5 mr-1" />Lalu
              </Button>
            </div>
            <p className="text-[8px] text-slate-500 text-center">
              Baki anda: RM{playerMoney.toLocaleString()} · Minimum: RM{minBid}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── AI Speed Control ─── */
function AISpeedControl() {
  const aiSpeed = useGameStore(s => s.aiSpeed);
  const setAISpeed = useGameStore(s => s.setAISpeed);
  return (
    <div className="flex items-center gap-1 bg-slate-800/60 rounded-full px-2 py-1 border border-slate-700/30">
      <Gauge className="h-3 w-3 text-slate-500" />
      {[1, 2, 3].map(s => (
        <button key={s} onClick={() => setAISpeed(s)}
          className={`w-5 h-5 rounded-full text-[8px] font-black transition-all ${
            aiSpeed === s
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 scale-110'
              : 'bg-slate-700/50 text-slate-500 hover:bg-slate-600/50 hover:text-slate-300'
          }`}>
          {s}×
        </button>
      ))}
    </div>
  );
}

/* ─── Game Settings Panel (sound volume + AI speed + shortcuts help) ─── */
function GameSettingsPanel() {
  const [open, setOpen] = useState(false);
  const [soundOn, toggleSound] = useSoundEnabled();
  const aiSpeed = useGameStore(s => s.aiSpeed);
  const setAISpeed = useGameStore(s => s.setAISpeed);

  // Local volume state (synced with soundManager singleton)
  const [volume, setVolume] = useState(soundManager.volume);
  useEffect(() => { soundManager.volume = volume; }, [volume]);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-600/40 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors backdrop-blur-sm"
        title="Game Settings"
      >
        <Settings className="h-4 w-4" />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            className="absolute top-10 right-0 w-64 z-40 pointer-events-auto"
          >
            <Card className="bg-slate-900/95 border-slate-600/40 shadow-2xl shadow-black/30 backdrop-blur-sm">
              <CardHeader className="p-3 pb-1.5 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5" />Tetapan / Settings
                </CardTitle>
                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white"><X className="h-3.5 w-3.5" /></button>
              </CardHeader>
              <CardContent className="p-3 pt-1.5 space-y-3">
                {/* Sound on/off */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-300 flex items-center gap-1.5">
                    {soundOn ? <Volume2 className="h-3 w-3 text-cyan-400" /> : <VolumeX className="h-3 w-3 text-slate-500" />}
                    Sound Effects
                  </span>
                  <button
                    onClick={toggleSound}
                    className={`relative w-9 h-5 rounded-full transition-colors ${soundOn ? 'bg-cyan-600' : 'bg-slate-700'}`}
                  >
                    <motion.div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                      animate={{ left: soundOn ? '18px' : '2px' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
                {/* Volume slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-slate-400">Volume</span>
                    <span className="text-[9px] text-cyan-400 font-mono">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={volume}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-slate-700 accent-cyan-500 cursor-pointer"
                  />
                </div>
                {/* AI speed */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-300 flex items-center gap-1">
                      <Gauge className="h-3 w-3" />AI Speed
                    </span>
                    <span className="text-[9px] text-amber-400 font-mono">{aiSpeed}× speed</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(s => (
                      <button key={s} onClick={() => { setAISpeed(s); soundManager.playSpeedChange(); }}
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                          aiSpeed === s
                            ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        }`}>
                        {s === 1 ? '1× Slow' : s === 2 ? '2× Med' : '3× Fast'}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Quick keyboard reference */}
                <div className="pt-2 border-t border-slate-700/30">
                  <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-1.5">Keyboard Shortcuts</p>
                  <div className="grid grid-cols-2 gap-1 text-[8px]">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">Space</kbd>
                    <span className="text-slate-500">Roll dice</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">B</kbd>
                    <span className="text-slate-500">Buy property</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">P</kbd>
                    <span className="text-slate-500">Pass / Skip</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">S</kbd>
                    <span className="text-slate-500">Toggle sound</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">Esc</kbd>
                    <span className="text-slate-500">Close panel</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Wealth Chart (Net Worth History) ─── */
function WealthChart() {
  const showWealthChart = useGameStore(s => s.showWealthChart);
  const toggleWealthChart = useGameStore(s => s.toggleWealthChart);
  const history = useGameStore(s => s.netWorthHistory);
  const players = useGameStore(s => s.players);
  const turnCount = useGameStore(s => s.turnCount);

  if (!showWealthChart) return null;

  // Compute chart bounds
  const maxNW = Math.max(1500, ...history.flatMap(h => Object.values(h.netWorths)));
  const minNW = Math.min(0, ...history.flatMap(h => Object.values(h.netWorths)));
  const range = Math.max(100, maxNW - minNW);
  const chartW = 240;
  const chartH = 100;
  const padX = 8;
  const padY = 8;

  const points = (playerId: string) => {
    return history.map((h, i) => {
      const x = padX + (i / Math.max(1, history.length - 1)) * (chartW - padX * 2);
      const v = h.netWorths[playerId] ?? 0;
      const y = chartH - padY - ((v - minNW) / range) * (chartH - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -300 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute top-16 right-1 z-30 w-72 pointer-events-auto"
    >
      <Card className="bg-slate-900/95 border-slate-600/30 shadow-2xl shadow-black/30 backdrop-blur-sm">
        <CardHeader className="p-3 pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />Carta Kekayaan
          </CardTitle>
          <button onClick={toggleWealthChart} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
        </CardHeader>
        <CardContent className="p-2.5 pt-0">
          <p className="text-[8px] text-slate-500 mb-2">Net worth over time — Turn {turnCount}</p>
          {/* SVG line chart */}
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-24 bg-slate-950/40 rounded-lg border border-slate-700/30">
            {/* Gridlines */}
            {[0.25, 0.5, 0.75].map(t => (
              <line key={t} x1={padX} y1={padY + t * (chartH - padY * 2)} x2={chartW - padX} y2={padY + t * (chartH - padY * 2)}
                stroke="rgba(148,163,184,0.1)" strokeDasharray="2,3" />
            ))}
            {/* Lines for each player */}
            {players.filter(p => !p.isBankrupt).map(p => {
              const coal = COALITIONS[p.coalitionId];
              const pts = points(p.id);
              if (!pts) return null;
              return (
                <g key={p.id}>
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={coal?.color || '#94a3b8'}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                  {/* End-point dot */}
                  {history.length > 0 && (() => {
                    const last = history[history.length - 1];
                    const v = last.netWorths[p.id] ?? 0;
                    const x = chartW - padX;
                    const y = chartH - padY - ((v - minNW) / range) * (chartH - padY * 2);
                    return <circle cx={x} cy={y} r="2" fill={coal?.color || '#94a3b8'} />;
                  })()}
                </g>
              );
            })}
          </svg>
          {/* Legend */}
          <div className="mt-2 grid grid-cols-2 gap-1">
            {players.filter(p => !p.isBankrupt).map(p => {
              const coal = COALITIONS[p.coalitionId];
              const last = history[history.length - 1];
              const nw = last ? (last.netWorths[p.id] ?? 0) : 0;
              return (
                <div key={p.id} className="flex items-center gap-1.5 text-[8px]">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: coal?.color }} />
                  <span className="font-semibold truncate" style={{ color: coal?.color }}>{p.name}</span>
                  <span className="text-slate-400 ml-auto font-mono">RM{nw.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Achievements Panel ─── */
function AchievementsPanel() {
  const achievements = useGameStore(s => s.achievements);
  const [open, setOpen] = useState(false);
  const unlocked = achievements.filter(a => a.unlockedAt !== null).length;
  const total = achievements.length;
  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/30 text-[10px] text-slate-400 font-medium backdrop-blur-sm hover:text-amber-400 hover:border-amber-500/30 transition-colors"
      >
        <Medal className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Achievements</span>
        <span className="text-amber-400 font-bold">{unlocked}/{total}</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            className="absolute top-10 right-0 w-72 z-50"
          >
            <Card className="bg-slate-900/98 border-amber-500/20 shadow-2xl shadow-black/40 backdrop-blur-sm">
              <CardHeader className="p-3 pb-1.5">
                <CardTitle className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" />
                  Pencapaian / Achievements
                  <Badge variant="outline" className="text-[8px] ml-auto border-amber-600/40 text-amber-400">{unlocked}/{total}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0 max-h-72 overflow-y-auto space-y-1.5">
                {achievements.map(a => (
                  <div key={a.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all ${
                    a.unlockedAt
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-slate-800/20 border-slate-700/10 opacity-50'
                  }`}>
                    <span className={`text-base flex-shrink-0 ${a.unlockedAt ? '' : 'grayscale'}`}>{a.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-bold ${a.unlockedAt ? 'text-amber-300' : 'text-slate-500'}`}>{a.name}</p>
                      <p className="text-[8px] text-slate-500 leading-tight">{a.description}</p>
                    </div>
                    {a.unlockedAt && <span className="text-[7px] text-amber-500/60 flex-shrink-0">✓</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Trade Button + Dropdown ─── */
function TradeButton() {
  const phase = useGameStore(s => s.phase);
  const players = useGameStore(s => s.players);
  const turnOrder = useGameStore(s => s.turnOrder);
  const currentTurnIndex = useGameStore(s => s.currentTurnIndex);
  const tradeState = useGameStore(s => s.tradeState);
  const initiateTrade = useGameStore(s => s.initiateTrade);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentPlayerId = turnOrder[currentTurnIndex];
  const isPlayerTurn = currentPlayerId === 'player';
  const canTrade = isPlayerTurn && (phase === 'landed' || phase === 'playing') && !tradeState?.isActive;

  if (!canTrade) return null;

  const tradeTargets = players.filter(p => p.id !== 'player' && !p.isBankrupt);

  const handleSelect = (targetId: string) => {
    setDropdownOpen(false);
    initiateTrade(targetId);
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setDropdownOpen(v => !v)}
        className="w-7 h-7 rounded-full bg-slate-800/80 border border-slate-600/40 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors backdrop-blur-sm"
        title="Trade with another player"
      >
        <Handshake className="h-3.5 w-3.5" />
      </motion.button>
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            className="absolute top-10 right-0 w-52 z-50"
          >
            <Card className="bg-slate-900/98 border-amber-500/20 shadow-2xl shadow-black/40 backdrop-blur-sm">
              <CardHeader className="p-3 pb-1.5">
                <CardTitle className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <Handshake className="h-3.5 w-3.5" />Pilih Rakan Dagangan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1.5 pt-0 space-y-0.5">
                {tradeTargets.map(p => {
                  const coalition = COALITIONS[p.coalitionId];
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(p.id)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-800/60 transition-colors text-left"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 border border-white/10 overflow-hidden bg-white"
                      >
                        <CoalitionLogo coalitionId={p.coalitionId} size={20} circular alt={p.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold truncate" style={{ color: coalition.color }}>{p.name}</p>
                        <p className="text-[8px] text-slate-500">RM{p.money.toLocaleString()} · {p.properties.length} properties</p>
                      </div>
                      {p.isAI && <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-slate-600 text-slate-500">AI</Badge>}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Trade Panel ─── */
function TradePanel() {
  const tradeState = useGameStore(s => s.tradeState);
  const players = useGameStore(s => s.players);
  const tiles = useGameStore(s => s.tiles);
  const updateTradeOffer = useGameStore(s => s.updateTradeOffer);
  const rejectTrade = useGameStore(s => s.rejectTrade);
  const aiTradeResponse = useGameStore(s => s.aiTradeResponse);

  const [offeredProps, setOfferedProps] = useState<number[]>(tradeState?.offeredProperties || []);
  const [requestedProps, setRequestedProps] = useState<number[]>(tradeState?.requestedProperties || []);
  const [offeredCash, setOfferedCash] = useState(String(tradeState?.offeredCash || 0));
  const [requestedCash, setRequestedCash] = useState(String(tradeState?.requestedCash || 0));
  const aiResponder = tradeState ? players.find(p => p.id === tradeState.responder) : null;
  const [aiThinking, setAiThinking] = useState(() => !!aiResponder?.isAI);

  if (!tradeState?.isActive) return null;

  const initiator = players.find(p => p.id === tradeState.initiator);
  const responder = players.find(p => p.id === tradeState.responder);
  if (!initiator || !responder) return null;

  const responderCoalition = COALITIONS[responder.coalitionId];

  const isHumanInitiator = initiator.id === 'player';
  const humanPlayer = isHumanInitiator ? initiator : responder;
  const otherPlayer = isHumanInitiator ? responder : initiator;

  const humanProperties = humanPlayer.properties
    .map(pid => tiles.find(t => t.id === pid))
    .filter(t => t && (t.type === 'property' || t.type === 'highway' || t.type === 'media'));

  const otherProperties = otherPlayer.properties
    .map(pid => tiles.find(t => t.id === pid))
    .filter(t => t && (t.type === 'property' || t.type === 'highway' || t.type === 'media'));

  const toggleOfferedProp = (tileId: number) => {
    setOfferedProps(prev => prev.includes(tileId) ? prev.filter(id => id !== tileId) : [...prev, tileId]);
  };

  const toggleRequestedProp = (tileId: number) => {
    setRequestedProps(prev => prev.includes(tileId) ? prev.filter(id => id !== tileId) : [...prev, tileId]);
  };

  const handlePropose = () => {
    const oc = Math.max(0, parseInt(offeredCash) || 0);
    const rc = Math.max(0, parseInt(requestedCash) || 0);
    updateTradeOffer(offeredProps, oc, requestedProps, rc);
    // If responder is AI, trigger AI response now
    if (otherPlayer.isAI) {
      setAiThinking(true);
      setTimeout(() => {
        aiTradeResponse();
        setAiThinking(false);
      }, 800);
    }
  };

  const handleCancel = () => {
    setAiThinking(false);
    rejectTrade();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="max-w-md mx-auto w-full"
    >
      <Card className="bg-slate-900/95 border-amber-500/30 shadow-2xl shadow-amber-500/10 backdrop-blur-sm">
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Handshake className="h-3.5 w-3.5" />
              Dagangan / Trade
            </CardTitle>
            <button onClick={handleCancel} className="text-slate-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">
            Trading with{' '}
            <span className="font-bold" style={{ color: responderCoalition.color }}>
              {otherPlayer.name}
            </span>
          </p>
        </CardHeader>
        <CardContent className="p-2.5 pt-0 space-y-2.5">
          {/* Two-column layout */}
          <div className="grid grid-cols-2 gap-2">
            {/* You Offer column */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5 rotate-[-45deg]" />You Offer
              </p>
              <div className="h-28 overflow-y-auto space-y-0.5 pr-0.5">
                {humanProperties.length === 0 && (
                  <p className="text-[8px] text-slate-600 text-center py-2">No properties</p>
                )}
                {humanProperties.map(t => {
                  if (!t) return null;
                  const checked = offeredProps.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer transition-colors ${
                        checked ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-slate-800/40 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOfferedProp(t.id)}
                        className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/30 accent-emerald-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-semibold text-slate-300 truncate">{t.name}</p>
                        <div className="flex items-center gap-1">
                          {t.colorGroup && (
                            <div className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLOR_GROUP_HEX[t.colorGroup] || '#6b7280' }} />
                          )}
                          <span className="text-[7px] text-slate-500">RM{t.price}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-slate-500">Cash:</span>
                <input
                  type="number"
                  value={offeredCash}
                  onChange={e => setOfferedCash(e.target.value)}
                  min={0}
                  className="flex-1 h-6 px-1.5 bg-slate-800/80 border border-slate-600/50 rounded text-[9px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 w-full"
                  placeholder="0"
                />
              </div>
            </div>

            {/* You Request column */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5 rotate-[135deg]" />You Request
              </p>
              <div className="h-28 overflow-y-auto space-y-0.5 pr-0.5">
                {otherProperties.length === 0 && (
                  <p className="text-[8px] text-slate-600 text-center py-2">No properties</p>
                )}
                {otherProperties.map(t => {
                  if (!t) return null;
                  const checked = requestedProps.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer transition-colors ${
                        checked ? 'bg-amber-500/10 border border-amber-500/30' : 'hover:bg-slate-800/40 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRequestedProp(t.id)}
                        className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/30 accent-amber-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-semibold text-slate-300 truncate">{t.name}</p>
                        <div className="flex items-center gap-1">
                          {t.colorGroup && (
                            <div className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLOR_GROUP_HEX[t.colorGroup] || '#6b7280' }} />
                          )}
                          <span className="text-[7px] text-slate-500">RM{t.price}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-slate-500">Cash:</span>
                <input
                  type="number"
                  value={requestedCash}
                  onChange={e => setRequestedCash(e.target.value)}
                  min={0}
                  className="flex-1 h-6 px-1.5 bg-slate-800/80 border border-slate-600/50 rounded text-[9px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 w-full"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* AI thinking indicator */}
          {aiThinking && (
            <div className="flex items-center justify-center gap-2 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <div className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <span className="text-[10px] text-amber-400 font-medium">
                AI sedang berfikir<motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>.</motion.span>
              </span>
            </div>
          )}

          {/* Action buttons */}
          {!aiThinking && (
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handlePropose}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-8 shadow-lg shadow-emerald-600/20"
              >
                <Handshake className="h-3 w-3 mr-1" />Propose Trade
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 text-xs h-8 hover:bg-slate-800"
              >
                <X className="h-3 w-3 mr-1" />Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Save/Load Buttons ─── */
function SaveLoadButtons() {
  const saveGame = useGameStore(s => s.saveGame);
  const loadGame = useGameStore(s => s.loadGame);
  const hasSavedGame = useGameStore(s => s.hasSavedGame);
  const [showSaveMsg, setShowSaveMsg] = useState(false);
  const [showLoadMsg, setShowLoadMsg] = useState(false);

  const handleSave = () => {
    saveGame();
    setShowSaveMsg(true);
    setTimeout(() => setShowSaveMsg(false), 1500);
  };
  const handleLoad = () => {
    const ok = loadGame();
    setShowLoadMsg(true);
    setTimeout(() => setShowLoadMsg(false), 1500);
  };

  return (
    <div className="flex items-center gap-1 relative">
      <button onClick={handleSave}
        className="w-7 h-7 rounded-full bg-slate-800/80 border border-slate-600/40 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors backdrop-blur-sm"
        title="Save game">
        <Save className="h-3.5 w-3.5" />
      </button>
      <button onClick={handleLoad} disabled={!hasSavedGame()}
        className="w-7 h-7 rounded-full bg-slate-800/80 border border-slate-600/40 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-500/40 transition-colors backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed"
        title={!hasSavedGame() ? 'No saved game' : 'Load game'}>
        <FolderOpen className="h-3.5 w-3.5" />
      </button>
      <AnimatePresence>
        {showSaveMsg && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[8px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
            Game saved! ✓
          </motion.div>
        )}
        {showLoadMsg && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
            Game loaded! ✓
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Property Portfolio Panel (enhanced with mortgage) ─── */
function PropertyPortfolio() {
  const showPortfolio = useGameStore(s => s.showPortfolio);
  const togglePortfolio = useGameStore(s => s.togglePortfolio);
  const players = useGameStore(s => s.players);
  const tiles = useGameStore(s => s.tiles);
  const buildHouse = useGameStore(s => s.buildHouse);
  const sellProperty = useGameStore(s => s.sellProperty);
  const mortgageProperty = useGameStore(s => s.mortgageProperty);
  const unmortgageProperty = useGameStore(s => s.unmortgageProperty);
  const mortgagedTiles = useGameStore(s => s.mortgagedTiles);
  const phase = useGameStore(s => s.phase);
  const turnOrder = useGameStore(s => s.turnOrder);
  const currentTurnIndex = useGameStore(s => s.currentTurnIndex);
  const currentPlayerId = turnOrder[currentTurnIndex];
  const isPlayerTurn = currentPlayerId === 'player';

  const player = players.find(p => p.id === 'player');
  if (!player) return null;

  const ownedTiles = player.properties.map(pid => tiles.find(t => t.id === pid)).filter(Boolean) as typeof BOARD_TILES;

  const totalPropertyValue = ownedTiles.reduce((s, t) => s + (t.price || 0), 0);
  const totalHouseValue = ownedTiles.reduce((s, t) => s + (t.houses || 0) * (t.housePrice || 0), 0);
  const mortgagedCount = ownedTiles.filter(t => mortgagedTiles.includes(t.id)).length;

  const groups: Record<string, typeof BOARD_TILES> = {};
  ownedTiles.forEach(t => {
    const g = t.colorGroup || 'other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(t);
  });

  const canBuildAny = ownedTiles.some(t => {
    if (t.type !== 'property' || !t.colorGroup || !t.housePrice || (t.houses || 0) >= 5) return false;
    if (mortgagedTiles.includes(t.id)) return false;
    const groupTiles = BOARD_TILES.filter(gt => gt.colorGroup === t.colorGroup);
    return groupTiles.every(gt => gt.owner === 'player' && !mortgagedTiles.includes(gt.id));
  });

  return (
    <>
      <div className="absolute bottom-20 right-3 z-30 flex flex-col items-end gap-2 pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (confirm('Return to hero page? Your game will be saved.')) {
              useGameStore.getState().saveGame();
              useGameStore.setState({ phase: 'lobby' });
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 border border-amber-600/40 text-[10px] text-amber-300 font-medium backdrop-blur-sm shadow-lg hover:bg-slate-700/80 transition-colors"
          title="Back to hero page"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Hero</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => useGameStore.getState().toggleWealthChart()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 border border-emerald-600/40 text-[10px] text-emerald-300 font-medium backdrop-blur-sm shadow-lg hover:bg-slate-700/80 transition-colors"
          title="Toggle wealth chart"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Chart</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={togglePortfolio}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-600/40 text-[10px] text-slate-300 font-medium backdrop-blur-sm shadow-lg hover:bg-slate-700/80 transition-colors"
        >
          <Briefcase className="h-3.5 w-3.5" />
          <span>Portfolio</span>
          <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 border-amber-600/50 text-amber-400">{ownedTiles.length}</Badge>
          {mortgagedCount > 0 && <Badge className="text-[7px] px-1 py-0 h-3.5 bg-orange-600/80">{mortgagedCount} mortgaged</Badge>}
          {canBuildAny && isPlayerTurn && (
            <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 rounded-full bg-green-400" />
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {showPortfolio && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-16 left-1 z-30 w-72 max-h-[65vh] pointer-events-auto"
          >
            <Card className="bg-slate-900/95 border-slate-600/30 shadow-2xl shadow-black/30 backdrop-blur-sm">
              <CardHeader className="p-3 pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5" />Portfolio Hartanah
                </CardTitle>
                <button onClick={togglePortfolio} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-1.5 mb-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/20">
                  <div className="text-center">
                    <p className="text-[7px] text-slate-500 uppercase tracking-wider">Properties</p>
                    <p className="text-[11px] font-black text-slate-200">{ownedTiles.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] text-slate-500 uppercase tracking-wider">Value</p>
                    <p className="text-[11px] font-black text-amber-400">RM{(totalPropertyValue + totalHouseValue).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] text-slate-500 uppercase tracking-wider">Houses</p>
                    <p className="text-[11px] font-black text-green-400">{ownedTiles.reduce((s, t) => s + (t.houses || 0), 0)}</p>
                  </div>
                </div>

                <div className="h-[45vh] overflow-y-auto space-y-2 pr-1">
                  {ownedTiles.length === 0 && (
                    <p className="text-[10px] text-slate-500 text-center py-4">No properties yet. Buy some!</p>
                  )}
                  {Object.entries(groups).map(([group, gTiles]) => (
                    <div key={group}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_GROUP_HEX[group as keyof typeof COLOR_GROUP_HEX] || '#6b7280' }} />
                        <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">{group}</span>
                        {(() => {
                          const groupSet = gTiles[0]?.colorGroup;
                          if (!groupSet) return null;
                          const allOwned = BOARD_TILES.filter(gt => gt.colorGroup === groupSet).every(gt => gt.owner === 'player');
                          const noneMortgaged = gTiles.every(t => !mortgagedTiles.includes(t.id));
                          return allOwned && noneMortgaged ? <span className="text-[7px] text-green-400 font-bold">✦ FULL SET</span> : null;
                        })()}
                      </div>
                      {gTiles.map(t => {
                        const isMortgaged = mortgagedTiles.includes(t.id);
                        const ownsGroup = t.colorGroup && BOARD_TILES.filter(gt => gt.colorGroup === t.colorGroup).every(gt => gt.owner === 'player');
                        const canBuild = ownsGroup && t.type === 'property' && !!t.housePrice && (t.houses || 0) < 5 && !isMortgaged && player.money >= (t.housePrice || 0) && isPlayerTurn && phase !== 'rolling' && phase !== 'moving';
                        const unmortgageCost = Math.round((t.mortgageValue || 0) * 1.1);
                        return (
                          <div key={t.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border mb-1 transition-all ${
                            isMortgaged
                              ? 'bg-orange-950/20 border-orange-500/15'
                              : 'bg-slate-800/40 border-slate-700/20'
                          }`}>
                            <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] flex-shrink-0"
                              style={{ backgroundColor: isMortgaged ? 'rgba(234,88,12,0.15)' : `${COLOR_GROUP_HEX[t.colorGroup!] || '#6b7280'}40` }}>
                              {isMortgaged ? '🏦' : '🏛️'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[9px] font-bold truncate ${isMortgaged ? 'text-orange-300/60 line-through' : 'text-slate-200'}`}>{t.name}</p>
                              <div className="flex items-center gap-2 text-[8px] text-slate-400">
                                <span>Rent: {isMortgaged ? <span className="text-orange-400">RM0</span> : `RM${t.rent?.[(t.houses || 0)] || t.rent?.[0]}`}</span>
                                {(t.houses || 0) > 0 && (
                                  <span className="text-green-400">{t.houses >= 5 ? '🏨' : `🏠×${t.houses}`}</span>
                                )}
                                {isMortgaged && <span className="text-orange-400 text-[7px]">MORTGAGED</span>}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {canBuild && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  onClick={() => { soundManager.playBuildHouse(); buildHouse(t.id); }}
                                  className="w-6 h-6 rounded bg-green-600/20 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-600/40 transition-colors"
                                  title={`Build house (RM${t.housePrice})`}
                                >
                                  <Home className="h-3 w-3" />
                                </motion.button>
                              )}
                              {!isMortgaged && t.mortgageValue && (t.houses || 0) === 0 && (
                                <button
                                  onClick={() => { soundManager.playEndTurn(); mortgageProperty(t.id); }}
                                  className="w-6 h-6 rounded bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400/60 hover:bg-orange-600/30 hover:text-orange-400 transition-colors"
                                  title={`Mortgage (get RM${t.mortgageValue})`}
                                >
                                  <Banknote className="h-3 w-3" />
                                </button>
                              )}
                              {isMortgaged && (
                                <button
                                  onClick={() => unmortgageProperty(t.id)}
                                  disabled={player.money < unmortgageCost}
                                  className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                                    player.money < unmortgageCost
                                      ? 'bg-slate-800/20 border-slate-700/10 text-slate-600 cursor-not-allowed'
                                      : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400/60 hover:bg-emerald-600/30 hover:text-emerald-400'
                                  }`}
                                  title={`Unmortgage (cost RM${unmortgageCost})`}
                                >
                                  <Shield className="h-3 w-3" />
                                </button>
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
                {mortgagedCount > 0 && (
                  <div className="mt-1 pt-1.5 border-t border-orange-500/10 text-center">
                    <p className="text-[8px] text-orange-400/60">🏦 {mortgagedCount} property mortgaged — no rent collected. Unmortgage to reactivate.</p>
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

/* ─── Achievement Unlock Toast ─── */
function AchievementToast() {
  const achievements = useGameStore(s => s.achievements);
  const [latestUnlocked, setLatestUnlocked] = useState<Achievement | null>(null);
  const processedRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentKey = achievements.filter(a => a.unlockedAt).map(a => `${a.id}:${a.unlockedAt}`).sort().join('|');
    if (currentKey === processedRef.current) return;
    
    const processedSet = new Set(processedRef.current.split('|').filter(Boolean));
    const newlyUnlocked = achievements.find(a => a.unlockedAt && !processedSet.has(`${a.id}:${a.unlockedAt}`));
    
    if (newlyUnlocked) {
      processedRef.current = currentKey;
      setLatestUnlocked(newlyUnlocked);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setLatestUnlocked(null), 3500);
    }
  }, [achievements]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  if (!latestUnlocked) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      >
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-900/90 to-yellow-900/90 border border-amber-500/40 shadow-2xl shadow-amber-500/20 backdrop-blur-sm animate-achievement-glow">
          <span className="text-2xl">{latestUnlocked.emoji}</span>
          <div>
            <p className="text-[9px] text-amber-400/80 uppercase tracking-widest font-bold">Achievement Unlocked!</p>
            <p className="text-sm font-black text-amber-200">{latestUnlocked.name}</p>
            <p className="text-[9px] text-amber-300/60">{latestUnlocked.description}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Main Dashboard ─── */
export default function GameDashboard() {
  const phase = useGameStore(s => s.phase);
  const players = useGameStore(s => s.players);
  const turnOrder = useGameStore(s => s.turnOrder);
  const currentTurnIndex = useGameStore(s => s.currentTurnIndex);
  const diceValues = useGameStore(s => s.diceValues);
  const turnCount = useGameStore(s => s.turnCount);
  const gameLog = useGameStore(s => s.gameLog);
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
  const tradeState = useGameStore(s => s.tradeState);
  const showPortfolio = useGameStore(s => s.showPortfolio);
  const togglePortfolio = useGameStore(s => s.togglePortfolio);
  const selectTile = useGameStore(s => s.selectTile);
  const rejectTrade = useGameStore(s => s.rejectTrade);
  const pendingTaxChoice = useGameStore(s => s.pendingTaxChoice);
  const resolveTaxChoice = useGameStore(s => s.resolveTaxChoice);
  const [, toggleSound] = useSoundEnabled();

  /* ─── Keyboard Shortcuts ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'playing' && isPlayerTurn) {
          soundManager.playDiceRoll();
          rollDice();
        }
      }
      if (e.key === 'b' || e.key === 'B') {
        if (phase === 'buying' && isPlayerTurn) {
          soundManager.playBuy();
          buyProperty();
        }
      }
      if (e.key === 'p' || e.key === 'P') {
        if (phase === 'buying' && isPlayerTurn) {
          soundManager.playAuction();
          skipBuy();
        }
      }
      if (e.key === 'Escape') {
        if (tradeState?.isActive) rejectTrade();
        if (showPortfolio) togglePortfolio();
        if (selectedTileId !== null) selectTile(null);
      }
      if (e.key === 's' || e.key === 'S') {
        if (phase === 'playing' || phase === 'landed') {
          toggleSound();
        }
      }
      // Tax choice: 1 = 10% net worth, 2 = flat RM200
      if (e.key === '1' && pendingTaxChoice) {
        soundManager.playEndTurn();
        resolveTaxChoice(false);
      }
      if (e.key === '2' && pendingTaxChoice) {
        soundManager.playEndTurn();
        resolveTaxChoice(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, isPlayerTurn, rollDice, buyProperty, skipBuy, tradeState?.isActive, showPortfolio, selectedTileId, togglePortfolio, selectTile, rejectTrade, toggleSound, pendingTaxChoice, resolveTaxChoice]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col">
      <div className="relative">
        <MarketTicker />
        {/* Mobile player strip below ticker */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto px-2 py-1.5 bg-slate-950/80 border-b border-slate-700/20 pointer-events-auto">
          {players.map(p => <PlayerCard key={p.id} player={p} isCurrentTurn={p.id === currentPlayerId} />)}
        </div>
      </div>

      {/* Top-right controls */}
      <div className="absolute top-8 right-1.5 z-30 pointer-events-auto hidden md:flex items-center gap-1.5">
        <AISpeedControl />
        <AchievementsPanel />
        <TradeButton />
        <SaveLoadButtons />
        <SoundToggleButton />
        <GameSettingsPanel />
        <HowToPlayButton />
      </div>
      <div className="absolute top-[4.5rem] right-1.5 z-30 pointer-events-auto flex items-center gap-1.5 md:hidden">
        <AISpeedControl />
        <AchievementsPanel />
        <TradeButton />
        <SaveLoadButtons />
        <SoundToggleButton />
        <GameSettingsPanel />
        <HowToPlayButton />
      </div>

      {/* Turn / Round indicator badge */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <Badge className="bg-slate-800/80 border-slate-600/40 text-[9px] text-amber-300 backdrop-blur-sm pointer-events-auto">
          <RotateCw className="h-2.5 w-2.5 mr-1" />
          {'Round '}{Math.ceil(turnCount / Math.max(players.filter(p => !p.isBankrupt).length, 1))}{' · Turn '}{turnCount}
        </Badge>
      </div>

      <div className="flex-1" />

      {/* Bottom action area */}
      <div className="pointer-events-auto pb-1.5 px-2 flex justify-center">
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
              <Button onClick={() => { soundManager.playDiceRoll(); rollDice(); }} size="lg"
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
                    <Button onClick={() => { soundManager.playBuy(); buyProperty(); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-9 shadow-lg shadow-emerald-600/20">
                      <CreditCard className="h-3.5 w-3.5 mr-1" />Beli
                    </Button>
                    <Button onClick={() => { soundManager.playAuction(); skipBuy(); }} variant="outline" className="flex-1 border-slate-600 text-slate-300 text-xs h-9 hover:bg-slate-800">
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
                  <Button onClick={() => { soundManager.playRent(); payRent(); }} className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold h-9 shadow-lg shadow-red-600/20">
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
                  <Button onClick={() => { soundManager.playCardDraw(); applyCard(currentCard); }} className="w-full bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold h-9">
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
                  <p className="text-xs font-bold text-orange-300">⛓️ Tahanan SPRM</p>
                  <p className="text-[10px] text-slate-400">Turn {currentPlayer.jailTurns}/3 sebelum dibebaskan</p>
                  <div className="flex gap-2">
                    <Button onClick={() => { soundManager.playEndTurn(); handleJailDecision(true); }} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold h-9">
                      <DollarSign className="h-3.5 w-3.5 mr-1" />Bayar RM50
                    </Button>
                    <Button onClick={() => { soundManager.playJail(); handleJailDecision(false); }} variant="outline" className="flex-1 border-orange-600/50 text-orange-300 text-xs h-9 hover:bg-orange-900/30">
                      🎲 Baling Doubles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'auction' && (
            <motion.div key="auction" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="max-w-xs mx-auto w-full">
              <AuctionPanel />
            </motion.div>
          )}

          {tradeState?.isActive && (
            <motion.div key="trade" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="max-w-md mx-auto w-full">
              <TradePanel />
            </motion.div>
          )}

          {phase === 'landed' && isPlayerTurn && (
            <motion.div key="end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
              <Button onClick={() => { soundManager.playEndTurn(); endTurn(); }} variant="outline"
                className="px-6 py-2.5 border-yellow-500/40 text-yellow-300 hover:bg-yellow-900/30 hover:text-yellow-200 text-xs font-bold transition-colors animate-end-turn-pulse">
                Akhir Giliran <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </motion.div>
          )}

          {/* Income Tax Choice — 10% of net worth OR flat RM200 */}
          {pendingTaxChoice && pendingTaxChoice.playerId === 'player' && (
            <motion.div key="tax-choice" initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="max-w-sm mx-auto w-full">
              <Card className="bg-amber-950/80 border-amber-500/40 shadow-2xl shadow-amber-500/10 backdrop-blur-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="text-center">
                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: 2 }}>
                      <AlertTriangle className="h-7 w-7 text-amber-400 mx-auto" />
                    </motion.div>
                    <p className="text-xs font-black text-amber-300 mt-1">Cukai SST/GST — Pilih Bayaran</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Income Tax — choose your payment</p>
                  </div>
                  {(() => {
                    const playerObj = players.find(p => p.id === 'player');
                    if (!playerObj) return null;
                    const propValue = playerObj.properties.reduce((sum, tid) => {
                      const t = BOARD_TILES[tid];
                      const ts = useGameStore.getState().tiles[tid];
                      return sum + (t?.price ?? 0) + (ts?.houses ?? 0) * (t?.housePrice ?? 0);
                    }, 0);
                    const netWorth = playerObj.money + propValue;
                    const tenPercent = Math.round(netWorth * 0.1);
                    const flat = 200;
                    const useTen = tenPercent < flat;
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => { soundManager.playEndTurn(); resolveTaxChoice(false); }}
                            className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                              useTen
                                ? 'bg-emerald-600/20 border-emerald-500/50 hover:bg-emerald-600/30'
                                : 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-700/40'
                            }`}>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider">10% Net Worth</p>
                            <p className="text-base font-black text-amber-300">RM{tenPercent}</p>
                            <p className="text-[8px] text-slate-500">NW: RM{netWorth.toLocaleString()}</p>
                            {useTen && <p className="text-[8px] text-emerald-400 mt-0.5">✓ Cheaper</p>}
                          </button>
                          <button
                            onClick={() => { soundManager.playEndTurn(); resolveTaxChoice(true); }}
                            className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                              !useTen
                                ? 'bg-emerald-600/20 border-emerald-500/50 hover:bg-emerald-600/30'
                                : 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-700/40'
                            }`}>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Flat Rate</p>
                            <p className="text-base font-black text-amber-300">RM{flat}</p>
                            <p className="text-[8px] text-slate-500">Fixed amount</p>
                            {!useTen && <p className="text-[8px] text-emerald-400 mt-0.5">✓ Cheaper</p>}
                          </button>
                        </div>
                        <p className="text-[8px] text-slate-500 text-center">
                          💡 Tip: 10% is cheaper when your net worth is under RM2,000
                        </p>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'game_over' && (
            <motion.div key="over" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
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

                  {/* Game Statistics */}
                  <div className="border-t border-yellow-500/20 pt-3 mt-2">
                    <p className="text-[9px] text-amber-400/60 font-bold uppercase tracking-wider mb-2">Keputusan Pilihan Raya / Election Results</p>
                    <div className="space-y-1.5">
                      {players
                        .filter(p => !p.isBankrupt)
                        .sort((a, b) => {
                          const aVal = a.money + a.properties.reduce((s, pid) => s + (BOARD_TILES[pid]?.price || 0), 0);
                          const bVal = b.money + b.properties.reduce((s, pid) => s + (BOARD_TILES[pid]?.price || 0), 0);
                          return bVal - aVal;
                        })
                        .map((p, idx) => {
                          const totalValue = p.money + p.properties.reduce((s, pid) => s + (BOARD_TILES[pid]?.price || 0), 0);
                          return (
                            <div key={p.id} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] ${p.id === winner ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-800/30'}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-amber-400/60 font-mono font-bold w-4">#{idx + 1}</span>
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] overflow-hidden bg-white border border-white/10">
                                  <CoalitionLogo coalitionId={p.coalitionId} size={16} circular alt={p.name} />
                                </div>
                                <span className="font-bold" style={{ color: COALITIONS[p.coalitionId]?.color }}>{p.name}</span>
                                {p.isAI && <span className="text-slate-600 text-[8px]">AI</span>}
                              </div>
                              <div className="flex items-center gap-3 text-[9px]">
                                <span className="text-slate-400"><span className="text-amber-400 font-bold">{p.properties.length}</span> seats</span>
                                <span className="text-slate-400">RM<span className="font-bold text-slate-200">{totalValue.toLocaleString()}</span></span>
                                {p.id === winner && <span className="text-yellow-400">👑</span>}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    <p className="text-[8px] text-slate-600 mt-2">Total turns: {turnCount} · {gameLog.length} events logged</p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => { soundManager.playGameOver(); window.location.reload(); }} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold shadow-lg">Pilihan Raya Baru</Button>
                    <Button onClick={() => { useGameStore.setState({ phase: 'lobby' }); }} variant="outline" className="flex-1 border-slate-600 text-slate-300 text-xs font-bold hover:bg-slate-800">Hero Page</Button>
                  </div>
                  {/* Achievements summary in game over */}
                  <div className="border-t border-yellow-500/10 pt-2 mt-1">
                    <p className="text-[8px] text-amber-400/40 font-bold uppercase tracking-wider mb-1.5">Pencapaian / Achievements Unlocked</p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {useGameStore.getState().achievements.filter(a => a.unlockedAt).map(a => (
                        <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[8px] text-amber-300">
                          {a.emoji} {a.name}
                        </span>
                      ))}
                      {useGameStore.getState().achievements.filter(a => a.unlockedAt).length === 0 && (
                        <span className="text-[8px] text-slate-600">No achievements unlocked this game.</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Left sidebar */}
      <div className="absolute top-8 left-1 w-44 space-y-1 pointer-events-auto max-h-[50vh] overflow-y-auto hidden md:block">
        {players.map(p => <PlayerCard key={p.id} player={p} isCurrentTurn={p.id === currentPlayerId} />)}
      </div>

      {/* Right sidebar */}
      <div className="absolute top-8 right-1 w-52 pointer-events-auto hidden md:block">
        <GameLogPanel />
      </div>

      {/* Mobile log */}
      <div className="md:hidden pointer-events-auto px-2 pb-16">
        <GameLogPanel />
      </div>

      <AIQuoteBubble />
      <TileDetail />
      <PropertyPortfolio />
      <WealthChart />
      <TurnBanner />
      <AchievementToast />
    </div>
  );
}