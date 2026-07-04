'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game-store';
import { BOARD_TILES, COLOR_GROUP_HEX, COALITIONS, COLOR_GROUP_COALITION, type Tile, type ColorGroup } from '@/lib/game-data';

const CORNER_SIZE = 11.5;
const EDGE_TILE_W = 8.5;
const EDGE_TILE_D = 6.2;

function getTileStyle(tileId: number): React.CSSProperties {
  const isCorner = tileId % 10 === 0;
  const half = 50;
  let x: number, y: number, w: number, h: number;
  if (isCorner) {
    if (tileId === 0) { x = half - CORNER_SIZE; y = half - CORNER_SIZE; }
    else if (tileId === 10) { x = 0; y = half - CORNER_SIZE; }
    else if (tileId === 20) { x = 0; y = 0; }
    else { x = half - CORNER_SIZE; y = 0; }
    w = CORNER_SIZE; h = CORNER_SIZE;
  } else if (tileId >= 1 && tileId <= 9) {
    const t = tileId / 10;
    x = half - CORNER_SIZE - t * (half - CORNER_SIZE); y = half - EDGE_TILE_D; w = EDGE_TILE_W; h = EDGE_TILE_D;
  } else if (tileId >= 11 && tileId <= 19) {
    const t = (tileId - 10) / 10;
    x = half - EDGE_TILE_D; y = half - CORNER_SIZE - t * (half - CORNER_SIZE); w = EDGE_TILE_D; h = EDGE_TILE_W;
  } else if (tileId >= 21 && tileId <= 29) {
    const t = (tileId - 20) / 10;
    x = CORNER_SIZE + (t * (half - CORNER_SIZE)) - EDGE_TILE_W; y = 0; w = EDGE_TILE_W; h = EDGE_TILE_D;
  } else {
    const t = (tileId - 30) / 10;
    x = 0; y = CORNER_SIZE + (t * (half - CORNER_SIZE)) - EDGE_TILE_W; w = EDGE_TILE_D; h = EDGE_TILE_W;
  }
  return { position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` };
}

function getTileBg(tile: Tile, colorGroup: ColorGroup | undefined): string {
  if (tile.type === 'corner') return 'linear-gradient(135deg, #f5e6c8 0%, #e8d5a8 100%)';
  if (tile.type === 'highway') return 'linear-gradient(180deg, #e5e7eb 0%, #d1d5db 100%)';
  if (tile.type === 'media') return 'linear-gradient(180deg, #f0abfc 0%, #d946ef 100%)';
  if (tile.type === 'tax') return 'linear-gradient(180deg, #fca5a5 0%, #ef4444 100%)';
  if (tile.type === 'chest') return 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 100%)';
  if (tile.type === 'chance') return 'linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%)';
  if (colorGroup) {
    const base = COLOR_GROUP_HEX[colorGroup];
    return `linear-gradient(180deg, ${base} 0%, ${base}dd 100%)`;
  }
  return '#4b5563';
}

function getTileIcon(tile: Tile): string {
  if (tile.type === 'corner') return tile.id === 0 ? '🗳️' : tile.id === 10 ? '⛓️' : tile.id === 20 ? '👑' : '🚔';
  if (tile.type === 'highway') return '🚂';
  if (tile.type === 'media') return '📺';
  if (tile.type === 'tax') return '💰';
  if (tile.type === 'chest') return '📜';
  if (tile.type === 'chance') return '⚡';
  return '🏛️';
}

function getCornerLabel(tile: Tile): string {
  if (tile.id === 0) return 'GO';
  if (tile.id === 10) return 'TAHANAN';
  if (tile.id === 20) return 'ISTANA';
  return 'SPR';
}

function TileView({ tile }: { tile: Tile }) {
  const tiles = useGameStore(s => s.tiles);
  const players = useGameStore(s => s.players);
  const selectTile = useGameStore(s => s.selectTile);
  const isCorner = tile.type === 'corner';
  const bg = getTileBg(tile, tile.colorGroup);
  const icon = getTileIcon(tile);
  const currentTile = tiles.find(t => t.id === tile.id);
  const owner = currentTile?.owner;
  const ownerPlayer = owner ? players.find(p => p.id === owner) : null;
  const houses = currentTile?.houses || 0;
  const hasColorStrip = tile.type === 'property' && tile.colorGroup;
  const playersOnTile = players.filter(p => p.position === tile.id && !p.isBankrupt);
  const isPlayerHere = playersOnTile.some(p => p.id === 'player');
  const isSelected = useGameStore(s => s.selectedTileId === tile.id);

  // Check if player owns this and can build (full color set, houses < 5)
  const playerProps = players.find(p => p.id === 'player')?.properties || [];
  const canBuild = useMemo(() => {
    if (tile.owner !== 'player' || tile.type !== 'property' || !tile.colorGroup || !tile.housePrice) return false;
    if (houses >= 5) return false;
    const groupTiles = BOARD_TILES.filter(t => t.colorGroup === tile.colorGroup);
    return groupTiles.every(t => t.owner === 'player');
  }, [tile, houses, playerProps]);

  return (
    <div
      className={`absolute border transition-all duration-200 ${
        isCorner ? 'rounded-lg border-amber-700/50' : 'rounded-sm border-white/15'
      } ${isSelected ? 'ring-2 ring-yellow-400 z-20 scale-105' : ''} ${isPlayerHere ? 'z-10' : ''}`}
      style={{
        ...getTileStyle(tile.id),
        background: bg,
        boxShadow: isCorner
          ? 'inset 0 0 20px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,230,200,0.15)'
          : `inset 0 0 10px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.4)${
            canBuild ? ', 0 0 8px rgba(74,222,128,0.4)' : ''
          }${ownerPlayer ? `, 0 0 6px ${COALITIONS[ownerPlayer.coalitionId]?.color}40` : ''}`,
      }}
      onClick={() => selectTile(tile.id === useGameStore.getState().selectedTileId ? null : tile.id)}
    >
      {hasColorStrip && (
        <div className="absolute top-0 left-0 right-0 h-[22%] rounded-t-sm"
          style={{
            background: `linear-gradient(180deg, ${COLOR_GROUP_HEX[tile.colorGroup!]} 0%, ${COLOR_GROUP_HEX[tile.colorGroup!]}cc 100%)`,
            boxShadow: `0 1px 4px ${COLOR_GROUP_HEX[tile.colorGroup!]}40`,
          }}
        />
      )}
      <div className={`relative w-full h-full flex flex-col items-center justify-center gap-0 ${hasColorStrip ? 'mt-[22%] h-[78%]' : ''}`}>
        <span className={isCorner ? 'text-sm leading-none drop-shadow' : 'text-[9px] leading-none'}>{icon}</span>
        <span className={`font-extrabold text-center leading-tight ${
          isCorner ? 'text-[6.5px] text-amber-900' : 'text-[5.5px] text-slate-900'
        }`} style={{ textShadow: '0 0 2px rgba(255,255,255,0.3)' }}>
          {isCorner ? getCornerLabel(tile) : tile.name}
        </span>
        {tile.price && !isCorner && (
          <span className="text-[5px] font-bold text-slate-800/80">RM{tile.price}</span>
        )}
        {isCorner && (
          <span className="text-[4.5px] text-amber-800/70 font-medium">{tile.description?.substring(0, 25)}</span>
        )}
        {houses > 0 && (
          <div className="flex gap-[1.5px] mt-px">
            {Array.from({ length: Math.min(houses, 4) }).map((_, i) => (
              <motion.div key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-1.5 h-1.5 bg-green-400 rounded-[1px] border border-green-600 shadow-sm"
              />
            ))}
            {houses >= 5 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="w-1.5 h-1.5 bg-red-500 rounded-[1px] border border-red-700 shadow-sm" />
            )}
          </div>
        )}
        {ownerPlayer && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-white/50 shadow-sm"
            style={{ backgroundColor: COALITIONS[ownerPlayer.coalitionId]?.color }}
          />
        )}
      </div>
      {playersOnTile.length > 0 && (
        <div className="absolute -top-2 -right-0.5 flex flex-col gap-[2px]">
          {playersOnTile.map((p, idx) => (
            <motion.div
              key={p.id}
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 + idx * 0.3, delay: idx * 0.15 }}
              className="w-3.5 h-3.5 rounded-full border-2 border-white/80 shadow-lg flex items-center justify-center text-[7px]"
              style={{
                backgroundColor: COALITIONS[p.coalitionId]?.color,
                boxShadow: `0 0 6px ${COALITIONS[p.coalitionId]?.color}60`,
              }}
            >
              {p.avatarEmoji}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GameBoard() {
  const turnCount = useGameStore(s => s.turnCount);
  const players = useGameStore(s => s.players);
  const turnOrder = useGameStore(s => s.turnOrder);
  const currentTurnIndex = useGameStore(s => s.currentTurnIndex);
  const currentPlayer = players.find(p => p.id === turnOrder[currentTurnIndex]);
  const phase = useGameStore(s => s.phase);
  const diceValues = useGameStore(s => s.diceValues);

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Deep space background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a1628] to-emerald-950" />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
        backgroundSize: '35px 35px',
      }} />
      {/* Ambient glow blobs */}
      <div className="absolute top-[20%] left-[10%] w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[15%] right-[15%] w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute top-[50%] right-[30%] w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.85, rotateX: 15 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] w-[min(84vw,84vh)] h-[min(84vw,84vh)]"
        style={{ transform: 'translateX(-50%) translateY(-45%)' }}
      >
        {/* Outer glow ring */}
        <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-amber-500/10 via-transparent to-emerald-500/10 blur-sm" />

        {/* Board base with wood-like gradient */}
        <div className="absolute inset-0 rounded-xl overflow-hidden"
          style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 3px rgba(180,130,60,0.3), inset 0 0 30px rgba(0,0,0,0.3)',
          }}
        >
          <div className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #1a472a 0%, #0f2e1a 25%, #1a472a 50%, #143a20 75%, #1a472a 100%)',
            }} />
          {/* Felt texture */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
          }} />
          {/* Gold border */}
          <div className="absolute inset-0 rounded-xl border-2 border-amber-600/40" />
        </div>

        {/* Center area */}
        <div className="absolute rounded-lg bg-gradient-to-br from-[#0d2a18] to-[#153d22] border border-amber-700/20"
          style={{
            top: '12%', left: '12%', right: '12%', bottom: '12%',
            boxShadow: 'inset 0 0 25px rgba(0,0,0,0.4), 0 0 20px rgba(0,0,0,0.2)',
          }}
        >
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="w-full h-full flex flex-col items-center justify-center p-2">
            {/* Title with glow */}
            <div className="relative">
              <div className="absolute inset-0 blur-md bg-amber-400/20" />
              <div className="relative text-xl md:text-3xl font-black tracking-tighter">
                <span className="bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200 bg-clip-text text-transparent drop-shadow-lg"
                  style={{ WebkitTextStroke: '1px rgba(0,0,0,0.1)' }}>
                  DEWAN RAKYAT
                </span>
              </div>
            </div>
            <div className="text-[7px] md:text-[9px] text-amber-300/40 tracking-[0.3em] uppercase mt-0.5 font-light">
              Pilihan Raya Edition
            </div>

            {/* Decorative line */}
            <div className="w-16 md:w-24 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent my-1.5" />

            {/* Coalition emblems */}
            <div className="flex items-center justify-center gap-1.5 md:gap-2">
              {Object.values(COALITIONS).map((c, i) => (
                <motion.div key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[7px] md:text-[9px] shadow-md border border-white/10"
                  style={{
                    backgroundColor: `${c.color}90`,
                    boxShadow: `0 0 8px ${c.color}30`,
                  }}
                >
                  {c.emblem}
                </motion.div>
              ))}
            </div>

            {/* Current turn indicator */}
            {currentPlayer && (
              <motion.div key={currentPlayer.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 border border-white/5">
                <div className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: COALITIONS[currentPlayer.coalitionId]?.color, boxShadow: `0 0 6px ${COALITIONS[currentPlayer.coalitionId]?.color}` }} />
                <span className="text-[8px] md:text-[10px] font-bold" style={{ color: COALITIONS[currentPlayer.coalitionId]?.color }}>
                  {currentPlayer.name}
                </span>
                <span className="text-[7px] text-slate-500">R{turnCount}</span>
              </motion.div>
            )}

            {/* Dice display in center */}
            {diceValues && (phase === 'rolling' || phase === 'moving') && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-1.5 flex items-center gap-1.5">
                <motion.span animate={phase === 'rolling' ? { rotate: [0, 180, 360] } : {}} transition={{ duration: 0.3 }}
                  className="text-base md:text-lg">{'⚀⚁⚂⚃⚄⚅'[diceValues[0] - 1]}</motion.span>
                <span className="text-[8px] text-slate-500">+</span>
                <motion.span animate={phase === 'rolling' ? { rotate: [0, -180, -360] } : {}} transition={{ duration: 0.3 }}
                  className="text-base md:text-lg">{'⚀⚁⚂⚃⚄⚅'[diceValues[1] - 1]}</motion.span>
                <span className="text-[9px] font-black text-amber-400">={diceValues[0] + diceValues[1]}</span>
              </motion.div>
            )}

            <div className="text-[6px] md:text-[7px] text-slate-600 mt-1.5 italic text-center leading-relaxed">
              &ldquo;Satu hari nanti, rakyat akan menilai&rdquo;
            </div>

            {/* Live player count */}
            <div className="flex items-center gap-2 mt-1 text-[6px] text-slate-600">
              <span>🗳️ {players.filter(p => !p.isBankrupt).length} Active</span>
              <span>•</span>
              <span>💰 {(players.reduce((s, p) => s + p.money, 0) / 1000).toFixed(1)}K Total</span>
            </div>
          </motion.div>
        </div>

        {/* Tiles */}
        {BOARD_TILES.map(tile => <TileView key={tile.id} tile={tile} />)}
      </motion.div>
    </div>
  );
}