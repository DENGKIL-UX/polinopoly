'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/lib/game-store';
import LobbyScreen from '@/components/game/LobbyScreen';

// Dynamic imports to avoid OOM during Turbopack compilation
const GameBoard = dynamic(
  () => import('@/components/game/GameBoard'),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-950" /> }
);

const GameDashboard = dynamic(
  () => import('@/components/game/GameDashboard'),
  { ssr: false, loading: () => null }
);

export default function Home() {
  const phase = useGameStore(s => s.phase);

  if (phase === 'lobby') {
    return <LobbyScreen />;
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-slate-950 relative flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <Suspense fallback={<div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-400">Loading Board...</div>}>
          <GameBoard />
        </Suspense>
        <GameDashboard />
      </div>
    </div>
  );
}