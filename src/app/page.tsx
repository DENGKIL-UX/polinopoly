'use client';

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game-store';
import LobbyScreen from '@/components/game/LobbyScreen';
import { NarrationPopup } from '@/components/game/NarrationPopup';
import { MusicPlayer } from '@/components/game/MusicPlayer';
import { Boxes, Grid3x3 } from 'lucide-react';

// Dynamic imports to keep the initial bundle lean and avoid SSR issues with WebGL
const GameScene = dynamic(
  () => import('@/components/game/GameScene'),
  { ssr: false, loading: () => <SceneLoader /> },
);

const GameBoard = dynamic(
  () => import('@/components/game/GameBoard'),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-950" /> },
);

const GameDashboard = dynamic(
  () => import('@/components/game/GameDashboard'),
  { ssr: false, loading: () => null },
);

function SceneLoader() {
  return (
    <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center gap-3">
      <motion.div
        animate={{ rotateY: [0, 360], rotateX: [0, 360] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 rounded-lg border-2 border-amber-400/60"
        style={{ transformStyle: 'preserve-3d' }}
      />
      <p className="text-amber-300/70 text-xs tracking-widest uppercase">
        Memuat Papan 3D…
      </p>
    </div>
  );
}

/* Floating view-toggle (3D ↔ 2D) — only visible during play */
function ViewToggle({ view, setView }: { view: '3d' | '2d'; setView: (v: '3d' | '2d') => void }) {
  return (
    <div className="absolute bottom-14 right-3 z-40 flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-600/40 backdrop-blur-md shadow-lg">
      <button
        onClick={() => setView('3d')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
          view === '3d'
            ? 'bg-amber-500 text-black shadow'
            : 'text-slate-400 hover:text-amber-300'
        }`}
        title="3D view"
      >
        <Boxes className="h-3.5 w-3.5" /> 3D
      </button>
      <button
        onClick={() => setView('2d')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
          view === '2d'
            ? 'bg-amber-500 text-black shadow'
            : 'text-slate-400 hover:text-amber-300'
        }`}
        title="2D view"
      >
        <Grid3x3 className="h-3.5 w-3.5" /> 2D
      </button>
    </div>
  );
}

export default function Home() {
  const phase = useGameStore((s) => s.phase);
  const [view, setView] = useState<'3d' | '2d'>(() => {
    if (typeof window === 'undefined') return '3d';
    const saved = window.localStorage.getItem('polinopoly-view');
    return saved === '2d' ? '2d' : '3d';
  });

  // Persist view preference
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('polinopoly-view', view);
  }, [view]);

  if (phase === 'lobby') {
    return <LobbyScreen />;
  }

  const is2D = view === '2d';

  return (
    <div className="w-full h-screen overflow-hidden bg-slate-950 relative flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <Suspense fallback={<SceneLoader />}>
          <AnimatePresence mode="wait">
            {is2D ? (
              <motion.div
                key="board-2d"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <GameBoard />
              </motion.div>
            ) : (
              <motion.div
                key="scene-3d"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <GameScene />
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>

        <ViewToggle view={view} setView={setView} />

        {/* The dashboard (dice, player cards, action buttons, log) floats on top of either view */}
        <GameDashboard />

        {/* Political soap opera narration pop-ups during AI turns */}
        <NarrationPopupWrapper />
      </div>

      {/* Game music player (loop + toggle, default On) */}
      <MusicPlayer />
    </div>
  );
}

/** Wrapper that reads narration state from the store and passes to the popup */
function NarrationPopupWrapper() {
  const narration = useGameStore((s) => s.currentNarration);
  const aiThinking = useGameStore((s) => s.aiThinking);
  return (
    <NarrationPopup
      narration={narration ? { id: narration.id, text: narration.text, category: narration.category } : null}
      isVisible={!!narration && aiThinking}
    />
  );
}
