'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { COALITIONS, type Coalition } from '@/lib/game-data';
import { useGameStore } from '@/lib/game-store';
import {
  Crown,
  Users,
  ChevronRight,
  Sparkles,
  BookOpen,
  Info,
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

export default function LobbyScreen() {
  const [selectedCoalition, setSelectedCoalition] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState<string | null>(null);
  const startGame = useGameStore(s => s.startGame);

  const handleStart = () => {
    if (selectedCoalition) {
      startGame(selectedCoalition);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a1628] to-emerald-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-15" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div className="absolute top-[20%] left-[15%] w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[10%] right-[10%] w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute top-[60%] left-[60%] w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />

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
          <Crown className="h-10 w-10 text-yellow-400" />
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              DEWAN RAKYAT
            </span>
          </h1>
          <Crown className="h-10 w-10 text-yellow-400" />
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
            <motion.div
              key={coalition.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.08 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border-2 ${
                  selectedCoalition === coalition.id
                    ? 'border-yellow-400 shadow-yellow-400/20 shadow-lg'
                    : 'border-slate-700/50 hover:border-slate-600'
                }`}
                style={{
                  backgroundColor: selectedCoalition === coalition.id
                    ? `${coalition.color}15`
                    : 'rgba(15, 23, 42, 0.8)',
                }}
                onClick={() => {
                  setSelectedCoalition(coalition.id);
                  setShowInfo(coalition.id);
                }}
              >
                <CardHeader className="p-3 pb-1 text-center">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl shadow-inner"
                    style={{ backgroundColor: coalition.color }}
                  >
                    {coalition.emblem}
                  </div>
                  <CardTitle className="text-sm font-bold" style={{ color: coalition.color }}>
                    {coalition.name}
                  </CardTitle>
                  <CardDescription className="text-[10px] text-slate-400 leading-tight">
                    {coalition.fullName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {selectedCoalition === coalition.id && (
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

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center"
        >
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
        </motion.div>

        {/* Game rules hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-6"
        >
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
            <Info className="h-3 w-3" />
            Roll dice, buy properties, collect rent, avoid jail. Last coalition standing wins!
            AI controls the other 5 coalitions.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}