'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game-store';
import { BOARD_TILES, COLOR_GROUP_HEX, COALITIONS, type Tile } from '@/lib/game-data';

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
    w = CORNER_SIZE;
    h = CORNER_SIZE;
  } else if (tileId >= 1 && tileId <= 9) {
    const t = tileId / 10;
    x = half - CORNER_SIZE - t * (half - CORNER_SIZE);
    y = half - EDGE_TILE_D;
    w = EDGE_TILE_W;
    h = EDGE_TILE_D;
  } else if (tileId >= 11 && tileId <= 19) {
    const t = (tileId - 10) / 10;
    x = half - EDGE_TILE_D;
    y = half - CORNER_SIZE - t * (half - CORNER_SIZE);
    w = EDGE_TILE_D;
    h = EDGE_TILE_W;
  } else if (tileId >= 21 && tileId <= 29) {
    const t = (tileId - 20) / 10;
    x = CORNER_SIZE + (t * (half - CORNER_SIZE)) - EDGE_TILE_W;
    y = 0;
    w = EDGE_TILE_W;
    h = EDGE_TILE_D;
  } else {
    const t = (tileId - 30) / 10;
    x = 0;
    y = CORNER_SIZE + (t * (half - CORNER_SIZE)) - EDGE_TILE_W;
    w = EDGE_TILE_D;
    h = EDGE_TILE_W;
  }

  return { position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` };
}

function getTileColor(tile: Tile): string {
  if (tile.type === 'corner') return '#f5e6c8';
  if (tile.type === 'property' && tile.colorGroup) return COLOR_GROUP_HEX[tile.colorGroup] || '#6b7280';
  if (tile.type === 'highway') return '#d1d5db';
  if (tile.type === 'media') return '#e879f9';
  if (tile.type === 'tax') return '#fca5a5';
  if (tile.type === 'chest') return '#fde68a';
  if (tile.type === 'chance') return '#93c5fd';
  return '#4b5563';
}

function getTileIcon(tile: Tile): string {
  if (tile.type === 'corner') {
    return tile.id === 0 ? '🗳️' : tile.id === 10 ? '⛓️' : tile.id === 20 ? '👑' : '🚔';
  }
  if (tile.type === 'highway') return '🚂';
  if (tile.type === 'media') return '📺';
  if (tile.type === 'tax') return '💰';
  if (tile.type === 'chest') return '📜';
  if (tile.type === 'chance') return '⚡';
  return '🏛️';
}

function TileView({ tile }: { tile: Tile }) {
  const tiles = useGameStore(s => s.tiles);
  const players = useGameStore(s => s.players);
  const selectTile = useGameStore(s => s.selectTile);
  const isCorner = tile.type === 'corner';
  const color = getTileColor(tile);
  const icon = getTileIcon(tile);
  const currentTile = tiles.find(t => t.id === tile.id);
  const owner = currentTile?.owner;
  const ownerPlayer = owner ? players.find(p => p.id === owner) : null;
  const houses = currentTile?.houses || 0;
  const hasColorStrip = tile.type === 'property' && tile.colorGroup;
  const playersOnTile = players.filter(p => p.position === tile.id && !p.isBankrupt);
  const isHighlighted = playersOnTile.some(p => p.id === 'player');

  return (
    <div
      className={`absolute border transition-all duration-200 ${
        isCorner ? 'rounded-lg border-amber-800/40' : 'rounded border-white/10'
      } ${isHighlighted ? 'ring-1 ring-yellow-400/60 z-10' : ''}`}
      style={{
        ...getTileStyle(tile.id),
        backgroundColor: color,
        boxShadow: isCorner
          ? 'inset 0 0 15px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.4)'
          : 'inset 0 0 8px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.3)',
      }}
      onClick={() => selectTile(tile.id === useGameStore.getState().selectedTileId ? null : tile.id)}
    >
      {hasColorStrip && (
        <div className="absolute top-0 left-0 right-0 h-[20%] rounded-t-sm opacity-90"
          style={{ backgroundColor: COLOR_GROUP_HEX[tile.colorGroup!] }} />
      )}
      <div className={`relative w-full h-full flex flex-col items-center justify-center gap-0 ${
        hasColorStrip ? 'mt-[20%] h-[80%]' : ''
      }`}>
        <span className={isCorner ? 'text-sm leading-none' : 'text-[9px] leading-none'}>{icon}</span>
        <span className={`font-bold text-center leading-tight ${
          isCorner ? 'text-[7px]' : 'text-[5.5px]'
        } text-slate-800`} style={{ textShadow: '0 0 1px rgba(255,255,255,0.4)' }}>
          {tile.type === 'corner'
            ? (tile.id === 0 ? 'GO' : tile.id === 10 ? 'JAIL' : tile.id === 20 ? 'FREE PK' : 'GO JAIL')
            : tile.name}
        </span>
        {tile.price && <span className="text-[5px] font-semibold text-slate-700">RM{tile.price}</span>}
        {houses > 0 && (
          <div className="flex gap-[1px]">
            {Array.from({ length: Math.min(houses, 4) }).map((_, i) => (
              <div key={i} className="w-1 h-1 bg-green-500 rounded-[1px]" />
            ))}
            {houses >= 5 && <div className="w-1 h-1 bg-red-500 rounded-[1px]" />}
          </div>
        )}
        {ownerPlayer && (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full border border-white/40"
            style={{ backgroundColor: COALITIONS[ownerPlayer.coalitionId]?.color }}
          />
        )}
      </div>
      {playersOnTile.length > 0 && (
        <div className="absolute -top-1.5 -right-0.5 flex flex-col gap-[1px]">
          {playersOnTile.map((p, idx) => (
            <motion.div
              key={p.id}
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 + idx * 0.3, delay: idx * 0.15 }}
              className="w-3 h-3 rounded-full border border-white shadow-md flex items-center justify-center text-[6px]"
              style={{ backgroundColor: COALITIONS[p.coalitionId]?.color }}
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

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950" />
      <div className="absolute inset-0 opacity-15" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.25) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] w-[min(82vw,82vh)] h-[min(82vw,82vh)]"
        style={{ transform: 'translateX(-50%) translateY(-45%)' }}
      >
        {/* Board base */}
        <div className="absolute inset-0 rounded-xl border-4 border-amber-900/50"
          style={{
            background: 'linear-gradient(135deg, #1a472a 0%, #143a20 50%, #1a472a 100%)',
            boxShadow: '0 15px 50px rgba(0,0,0,0.5), inset 0 0 25px rgba(0,0,0,0.25)',
          }} />

        {/* Center area */}
        <div className="absolute rounded-lg border border-amber-800/20 bg-[#153d22]"
          style={{ top: '12%', left: '12%', right: '12%', bottom: '12%', boxShadow: 'inset 0 0 15px rgba(0,0,0,0.3)' }}>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="w-full h-full flex flex-col items-center justify-center">
            <div className="text-xl md:text-2xl font-black tracking-tighter">
              <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                DEWAN RAKYAT
              </span>
            </div>
            <div className="text-[8px] md:text-[10px] text-amber-200/50 tracking-[0.25em] uppercase mt-0.5">
              Pilihan Raya Edition
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {Object.values(COALITIONS).map(c => (
                <div key={c.id} className="w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[8px] md:text-[10px] shadow border border-white/10"
                  style={{ backgroundColor: `${c.color}80` }}>
                  {c.emblem}
                </div>
              ))}
            </div>
            {currentPlayer && (
              <motion.div key={currentPlayer.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COALITIONS[currentPlayer.coalitionId]?.color }} />
                <span className="text-[8px] font-semibold" style={{ color: COALITIONS[currentPlayer.coalitionId]?.color }}>
                  {currentPlayer.name}
                </span>
                <span className="text-[7px] text-slate-500">Turn {turnCount}</span>
              </motion.div>
            )}
            <div className="text-[7px] text-slate-500 mt-1.5 italic">
              &ldquo;Satu hari nanti, rakyat akan menilai&rdquo;
            </div>
          </motion.div>
        </div>

        {/* Tiles */}
        {BOARD_TILES.map(tile => <TileView key={tile.id} tile={tile} />)}
      </motion.div>
    </div>
  );
}