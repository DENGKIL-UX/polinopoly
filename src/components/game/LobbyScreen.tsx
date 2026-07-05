'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { COALITIONS, type Coalition } from '@/lib/game-data';
import { useGameStore } from '@/lib/game-store';
import { CoalitionLogo } from '@/components/game/CoalitionLogo';
import {
  Crown,
  Users,
  ChevronRight,
  Sparkles,
  BookOpen,
  Info,
  ChevronDown,
  FolderOpen,
} from 'lucide-react';

const COALITION_LIST = Object.values(COALITIONS);

const COALITION_DESCRIPTIONS: Record<string, string> = {
  PH: 'The reform coalition. Led by Anwar Ibrahim. Strong in urban centers and Peninsula West Coast.',
  PN: 'The green wave. Islamic-centric coalition. Dominant in East Coast and Malay heartland.',
  BN: 'The former ruling coalition. Traditional power base across rural Peninsula and East Malaysia.',
  GPS: 'Sarawak-based coalition. Kingmakers in federal politics. Controls the richest state.',
  GRS: 'Sabah-based coalition. Regional autonomy champions. Allies of convenience in Putrajaya.',
  IND: 'No party affiliation. Fighting for the rakyat alone. The hardest difficulty.',
};

const COALITION_ADVANTAGES: Record<string, string[]> = {
  PH: ['Urban property discount (-10%)', 'Strong starting position in KL', 'Reformasi morale boost'],
  PN: ['Green Wave momentum (+RM100)', 'East Coast property synergy', 'Religious grassroots network'],
  BN: ['Federal machinery (+RM200)', 'Infrastructure rent bonus', 'Experienced political operatives'],
  GPS: ['Oil royalty income (+RM150)', 'Sarawak property monopoly', 'Autonomous budget control'],
  GRS: ['Sabah tourism income (+RM100)', 'Regional development bonus', 'Coalition flexibility'],
  IND: ['None — pure rakyat power!', 'Higher difficulty = more glory', 'No coalition obligations'],
};

const CONFETTI_COLORS = ['#fbbf24', '#ef4444', '#3b82f6', '#10b981', '#f472b6', '#f59e0b'];

/* ─── Confetti particle component ─── */
function ConfettiParticle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
      style={{ left: '50%', top: '50%', backgroundColor: color }}
      initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
      animate={{
        x: [0, x * 40, x * 80],
        y: [0, -30 - Math.abs(x) * 15, 20 + Math.abs(x) * 10],
        opacity: [0, 1, 0],
        scale: [0, 1, 0.5],
        rotate: [0, 180 + Math.abs(x) * 50, 360],
      }}
      transition={{ duration: 1.2, delay, ease: 'easeOut' }}
    />
  );
}

/* ─── Tilted coalition card ─── */
function TiltedCoalitionCard({ coalition, index, selected, onSelect }: {
  coalition: typeof COALITION_LIST[number];
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(500px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale(1.03)`;
  }, []);
  const handleMouseLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = '';
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 + index * 0.08 }}
    >
      <Card
        ref={ref}
        className={`cursor-pointer hover:shadow-lg border-2 ${
          selected
            ? 'border-yellow-400 shadow-yellow-400/20 shadow-lg'
            : 'border-slate-700/50 hover:border-slate-600 hover:-translate-y-1'
        }`}
        style={{
          backgroundColor: selected
            ? `${coalition.color}15`
            : 'rgba(15, 23, 42, 0.8)',
          transition: 'transform 0.15s ease-out, box-shadow 0.2s, border-color 0.2s, background-color 0.2s',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => onSelect(coalition.id)}
      >
        <CardHeader className="p-3 pb-1 text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center shadow-inner overflow-hidden bg-white/95 border border-white/40"
            style={{ boxShadow: `0 0 0 2px ${coalition.color}50, inset 0 0 8px ${coalition.color}20` }}
          >
            <CoalitionLogo coalitionId={coalition.id} size={52} alt={`${coalition.fullName} logo`} />
          </div>
          <CardTitle className="text-sm font-bold" style={{ color: coalition.color }}>
            {coalition.name}
          </CardTitle>
          <CardDescription className="text-[10px] text-slate-400 leading-tight">
            {coalition.fullName}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {selected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <p className="text-[10px] text-slate-400 mb-2">
                {COALITION_DESCRIPTIONS[coalition.id]}
              </p>
              <Badge variant="outline" className="text-[9px] border-yellow-600/50 text-yellow-500">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                {coalition.slogan}
              </Badge>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LobbyScreen() {
  const [selectedCoalition, setSelectedCoalition] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const startGame = useGameStore(s => s.startGame);
  const loadGame = useGameStore(s => s.loadGame);
  const hasSavedGame = useGameStore(s => s.hasSavedGame);
  const [hasSaved, setHasSaved] = useState(false);
  const [loadAttempted, setLoadAttempted] = useState(false);

  useEffect(() => {
    setHasSaved(hasSavedGame());
  }, [hasSavedGame]);

  const handleStart = () => {
    if (selectedCoalition) {
      startGame(selectedCoalition);
    }
  };

  const handleSelectCoalition = (id: string) => {
    setSelectedCoalition(id);
    setShowInfo(id);
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #020617 0%, #0a1628 25%, #0f2e1a 50%, #0a1628 75%, #020617 100%)',
        backgroundSize: '400% 400%',
        animation: 'lobby-gradient 12s ease infinite',
      }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 opacity-15" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div className="absolute top-[20%] left-[15%] w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[10%] right-[10%] w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute top-[60%] left-[60%] w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />

      {/* Floating particles */}
      {[
        {x:'10%',y:'20%',color:'#f59e0b',d:0,size:4},
        {x:'85%',y:'15%',color:'#10b981',d:1.5,size:3},
        {x:'75%',y:'75%',color:'#ef4444',d:0.8,size:5},
        {x:'20%',y:'80%',color:'#3b82f6',d:2.0,size:3},
        {x:'60%',y:'10%',color:'#f472b6',d:1.2,size:4},
        {x:'40%',y:'90%',color:'#eab308',d:0.5,size:3},
      ].map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none opacity-30"
          style={{
            left: p.x, top: p.y,
            width: p.size, height: p.size,
            backgroundColor: p.color,
            filter: `blur(${p.size}px)`,
            animation: `gentle-float ${4 + p.d}s ease-in-out ${p.d}s infinite`,
          }}
        />
      ))}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-8 z-10"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex items-center justify-center gap-3 mb-3"
        >
          {/* Jalur Gemilang — Malaysia national flag */}
          <motion.img
            src="/logos/flag.svg"
            alt="Jalur Gemilang"
            className="h-10 md:h-12 w-auto rounded-sm shadow-lg border border-white/20"
            initial={{ rotate: -8, x: -6 }}
            animate={{ rotate: [-8, -6, -8], x: [-6, -4, -6] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            draggable={false}
          />
          <Crown className="h-10 w-10 text-yellow-400" />
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            <span className="animate-shimmer">
              DEWAN RAKYAT
            </span>
          </h1>
          <Crown className="h-10 w-10 text-yellow-400" />
          <motion.img
            src="/logos/flag.svg"
            alt="Jalur Gemilang"
            className="h-10 md:h-12 w-auto rounded-sm shadow-lg border border-white/20"
            initial={{ rotate: 8, x: 6 }}
            animate={{ rotate: [8, 6, 8], x: [6, 4, 6] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            draggable={false}
          />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl md:text-2xl text-amber-200/80 font-light tracking-widest uppercase"
        >
          Pilihan Raya Edition
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-sm text-slate-400 mt-2 max-w-md mx-auto"
        >
          A 3D Political Satire Monopoly Game — Navigate the Malaysian political landscape,
          buy influence, collect rent, and outmaneuver your rivals to control Dewan Rakyat!
        </motion.p>
      </motion.div>

      {/* Coalition Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="w-full max-w-5xl z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Users className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-300">
            Choose Your Coalition
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {COALITION_LIST.map((coalition, index) => (
            <TiltedCoalitionCard
              key={coalition.id}
              coalition={coalition}
              index={index}
              selected={selectedCoalition === coalition.id}
              onSelect={handleSelectCoalition}
            />
          ))}
        </div>

        {/* Selected coalition info */}
        <AnimatePresence>
          {selectedCoalition && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: COALITIONS[selectedCoalition].color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-sm" style={{ color: COALITIONS[selectedCoalition].color }}>
                          {COALITIONS[selectedCoalition].fullName} — Advantages
                        </h3>
                        <Badge variant="secondary" className="text-[10px]">
                          <BookOpen className="h-2.5 w-2.5 mr-1" />
                          Starting Bonus
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {COALITION_ADVANTAGES[selectedCoalition].map((adv, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                            <ChevronRight className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                            {adv}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Button with confetti */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center gap-3"
        >
          {hasSaved && (
            <div className="relative">
              <Button
                size="lg"
                variant="outline"
                onClick={() => { const ok = loadGame(); if (!ok) setLoadAttempted(true); }}
                className="px-6 py-6 text-sm font-bold border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/20 hover:text-emerald-200 shadow-xl transition-all duration-300"
              >
                <FolderOpen className="h-5 w-5 mr-2" />
                Sambung Game
              </Button>
              {loadAttempted && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] text-red-400 text-center mt-1">
                  Failed to load. Starting fresh is recommended.
                </motion.p>
              )}
            </div>
          )}
          <div className="relative" onPointerEnter={() => setConfettiActive(true)} onPointerLeave={() => setConfettiActive(false)}>
            <AnimatePresence>
              {confettiActive && CONFETTI_COLORS.map((color, i) => (
                <ConfettiParticle key={i} delay={i * 0.04} x={(i - 2.5) * 0.8} color={color} />
              ))}
            </AnimatePresence>
            <Button
              size="lg"
              disabled={!selectedCoalition}
              onClick={handleStart}
              className="px-12 py-6 text-lg font-bold bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black shadow-xl shadow-yellow-500/20 disabled:opacity-30 disabled:shadow-none transition-all duration-300"
            >
              <Crown className="h-5 w-5 mr-2" />
              Mulakan Pilihan Raya!
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </motion.div>

        {/* Rules expandable section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-6 mb-4 w-full max-w-2xl mx-auto"
        >
          <button
            onClick={() => setShowRules(v => !v)}
            className="flex items-center gap-2 mx-auto text-xs text-slate-400 hover:text-amber-400 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Peraturan Permainan / Game Rules</span>
            <motion.div animate={{ rotate: showRules ? 180 : 0 }}>
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.div>
          </button>
          <AnimatePresence>
            {showRules && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Card className="mt-3 bg-slate-800/40 border-slate-700/30 backdrop-blur-sm">
                  <CardContent className="p-4 text-[11px] text-slate-400 space-y-2 leading-relaxed">
                    <p><b className="text-amber-300">Objektif:</b> Jadilah gabungan terakhir yang berdiri! Beli hartanah, kutip sewa, dan bankrapkan lawan anda.</p>
                    <p><b className="text-amber-300">Objective:</b> Be the last coalition standing! Buy properties, collect rent, and bankrupt your opponents.</p>
                    <p><b className="text-amber-300">Dadu:</b> Baling dua dadu untuk bergerak. Doubles = giliran lagi. 3 doubles berturut = Tahanan SPR!</p>
                    <p><b className="text-amber-300">Dice:</b> Roll two dice to move. Doubles = extra turn. 3 doubles in a row = SPR Jail!</p>
                    <p><b className="text-amber-300">Hartanah:</b> Miliki set warna penuh untuk bina rumah dan naikkan sewa.</p>
                    <p><b className="text-amber-300">Properties:</b> Own a full color set to build houses and increase rent.</p>
                    <p><b className="text-amber-300">Kad:</b> Kad Jawatan Menteri & Krisis Nasional boleh memberi wang, menggerak, atau masuk penjara.</p>
                    <p><b className="text-amber-300">Cards:</b> Jawatan Menteri & Krisis Nasional cards can give money, move you, or send you to jail.</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Game rules hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-2"
        >
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
            <Info className="h-3 w-3" />
            Roll dice, buy properties, collect rent, avoid jail. Last coalition standing wins!
            AI controls the other 5 coalitions.
          </p>
        </motion.div>
      </motion.div>

      {/* Version footer */}
      <div className="absolute bottom-3 text-[9px] text-slate-600 tracking-wider">v1.0 — DENGKIL-UX</div>
    </div>
  );
}