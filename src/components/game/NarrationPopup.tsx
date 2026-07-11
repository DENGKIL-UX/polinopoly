'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { type Narration } from '@/lib/narrations';
import { COALITIONS } from '@/lib/game-data';
import { useGameStore } from '@/lib/game-store';

// ───────────────────────────────────────────────────────────────────
// NARRATION POPUP — political soap opera dialog that appears during
// AI turns, showing satirical Malaysian political commentary.
// ───────────────────────────────────────────────────────────────────

interface NarrationPopupProps {
  narration: Narration | null;
  isVisible: boolean;
}

const CATEGORY_STYLES: Record<string, { icon: string; color: string; label: string }> = {
  ai_thinking: { icon: '🤔', color: '#fbbf24', label: 'STRATEGI' },
  buy: { icon: '🏛️', color: '#22c55e', label: 'PEMERANGAN' },
  skip: { icon: '🚶', color: '#64748b', label: 'UNDUR' },
  penalty: { icon: '💸', color: '#ef4444', label: 'SKANDAL' },
  jail: { icon: '⛓️', color: '#dc2626', label: 'TAHANAN' },
  rent: { icon: '💰', color: '#f59e0b', label: 'TRIBUT' },
  monopoly: { icon: '👑', color: '#a855f7', label: 'DOMINASI' },
  auction: { icon: '🔨', color: '#3b82f6', label: 'TAWARAN' },
  card: { icon: '🃏', color: '#ec4899', label: 'NASIB' },
  pass_go: { icon: '🗳️', color: '#10b981', label: 'PILIHAN RAYA' },
  general: { icon: '🎭', color: '#8b5cf6', label: 'DRAMA' },
};

export function NarrationPopup({ narration, isVisible }: NarrationPopupProps) {
  const players = useGameStore((s) => s.players);
  const turnOrder = useGameStore((s) => s.turnOrder);
  const currentTurnIndex = useGameStore((s) => s.currentTurnIndex);
  const aiThinking = useGameStore((s) => s.aiThinking);

  const currentPlayerId = turnOrder[currentTurnIndex];
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const coalition = currentPlayer ? COALITIONS[currentPlayer.coalitionId] : null;

  if (!narration) return null;

  const style = CATEGORY_STYLES[narration.category] || CATEGORY_STYLES.general;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={narration.id}
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          style={{ maxWidth: '90vw', width: '480px' }}
        >
          <div
            className="relative rounded-xl overflow-hidden shadow-lg border-2"
            style={{
              borderColor: style.color,
              background: `linear-gradient(135deg, rgba(10,10,30,0.95) 0%, rgba(20,20,50,0.92) 100%)`,
              boxShadow: `0 0 30px ${style.color}30, 0 8px 32px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Top accent bar */}
            <div
              className="h-1.5 w-full"
              style={{ background: `linear-gradient(90deg, ${style.color}, ${coalition?.color || style.color}, ${style.color})` }}
            />

            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              {currentPlayer && coalition && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border border-white/20 overflow-hidden"
                  style={{ backgroundColor: coalition.color }}
                >
                  {coalition.emblem}
                </div>
              )}
              <span
                className="text-[10px] font-black tracking-widest uppercase"
                style={{ color: style.color }}
              >
                {style.icon} {style.label}
              </span>
              {currentPlayer && (
                <span className="text-[10px] text-slate-400 ml-auto truncate">
                  {currentPlayer.name}
                </span>
              )}
            </div>

            {/* Narration text — the soap opera dialog */}
            <div className="px-4 py-3">
              <p className="text-sm md:text-base text-white leading-relaxed italic">
                &ldquo;{narration.text}&rdquo;
              </p>
            </div>

            {/* Bottom fade */}
            <div
              className="h-1 w-full"
              style={{ background: `linear-gradient(90deg, transparent, ${style.color}40, transparent)` }}
            />

            {/* Animated "thinking" dots */}
            <div className="flex items-center gap-1 px-4 pb-2">
              <motion.span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: style.color }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
              />
              <motion.span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: style.color }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              />
              <motion.span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: style.color }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              />
              <span className="text-[8px] text-slate-500 ml-1">AI sedang berfikir...</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
