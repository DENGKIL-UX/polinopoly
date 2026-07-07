'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game-store';
import { BOARD_TILES, COLOR_GROUP_HEX, COALITIONS, type Tile, type ColorGroup } from '@/lib/game-data';
import { CoalitionLogo } from '@/components/game/CoalitionLogo';

// --- CSS Grid position mapping ---
// 11×11 grid: corners at (1,1), (1,11), (11,1), (11,11)
// Clockwise from GO (bottom-right):
//   Bottom row: GO at (11,11), tiles 1-9 at (11, 10→2), Jail at (11,1)
//   Left col:  tiles 11-19 at (10→2, 1), Free Parking at (1,1)
//   Top row:   tiles 21-29 at (1, 2→10), Go to Jail at (1,11)
//   Right col: tiles 31-39 at (2→10, 11)
function getGridPosition(tileId: number): { row: number; col: number } {
  if (tileId === 0) return { row: 11, col: 11 };
  if (tileId >= 1 && tileId <= 9) return { row: 11, col: 11 - tileId };
  if (tileId === 10) return { row: 11, col: 1 };
  if (tileId >= 11 && tileId <= 19) return { row: 11 - (tileId - 10), col: 1 };
  if (tileId === 20) return { row: 1, col: 1 };
  if (tileId >= 21 && tileId <= 29) return { row: 1, col: tileId - 19 };
  if (tileId === 30) return { row: 1, col: 11 };
  if (tileId >= 31 && tileId <= 39) return { row: tileId - 29, col: 11 };
  return { row: 1, col: 1 };
}

function getTileBg(tile: Tile): string {
  if (tile.type === 'corner') return 'linear-gradient(135deg, #f5e6c8 0%, #e8d5a8 100%)';
  if (tile.type === 'highway') return 'linear-gradient(180deg, #e5e7eb 0%, #d1d5db 100%)';
  if (tile.type === 'media') return 'linear-gradient(180deg, #f0abfc 0%, #d946ef 100%)';
  if (tile.type === 'tax') return 'linear-gradient(180deg, #fca5a5 0%, #ef4444 100%)';
  if (tile.type === 'chest') return 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 100%)';
  if (tile.type === 'chance') return 'linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%)';
  if (tile.colorGroup) {
    const base = COLOR_GROUP_HEX[tile.colorGroup];
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

// Determine tile orientation based on which side it's on
function getTileOrientation(tileId: number): 'bottom' | 'left' | 'top' | 'right' {
  if (tileId >= 0 && tileId <= 10) return 'bottom';
  if (tileId >= 11 && tileId <= 20) return 'left';
  if (tileId >= 21 && tileId <= 30) return 'top';
  return 'right';
}

function TileView({ tile }: { tile: Tile }) {
  const tiles = useGameStore(s => s.tiles);
  const players = useGameStore(s => s.players);
  const selectTile = useGameStore(s => s.selectTile);
  const isCorner = tile.type === 'corner';
  const bg = getTileBg(tile);
  const icon = getTileIcon(tile);
  const orientation = getTileOrientation(tile.id);
  const currentTile = tiles.find(t => t.id === tile.id);
  const owner = currentTile?.owner;
  const ownerPlayer = owner ? players.find(p => p.id === owner) : null;
  const houses = currentTile?.houses || 0;
  const hasColorStrip = tile.type === 'property' && tile.colorGroup;
  const playersOnTile = players.filter(p => p.position === tile.id && !p.isBankrupt);
  const isPlayerHere = playersOnTile.some(p => p.id === 'player');
  const isSelected = useGameStore(s => s.selectedTileId === tile.id);
  const selectedTileId = useGameStore(s => s.selectedTileId);
  const selectedTile = selectedTileId !== null ? BOARD_TILES.find(t => t.id === selectedTileId) : null;
  const isInSameGroup = selectedTile?.colorGroup && tile.colorGroup === selectedTile.colorGroup;
  const mortgagedTiles = useGameStore(s => s.mortgagedTiles);
  const isMortgaged = mortgagedTiles.includes(tile.id);

  const canBuild = useMemo(() => {
    const ct = tiles.find(t => t.id === tile.id);
    if (!ct || ct.owner !== 'player' || tile.type !== 'property' || !tile.colorGroup || !tile.housePrice) return false;
    if ((ct.houses || 0) >= 5) return false;
    const groupTiles = BOARD_TILES.filter(t => t.colorGroup === tile.colorGroup);
    return groupTiles.every(t => {
      const gt = tiles.find(st => st.id === t.id);
      return gt?.owner === 'player';
    });
  }, [tile, tiles]);

  // Side tiles (left/right) need rotated text for readability
  const isSideTile = orientation === 'left' || orientation === 'right';

  return (
    <div
      className={`relative w-full h-full border transition-all duration-200 group overflow-hidden ${
        isCorner
          ? 'rounded-lg border-amber-700/50 animate-corner-glow'
          : `border-white/15 hover:brightness-125 hover:z-30 cursor-pointer ${isMortgaged ? 'opacity-60' : ''} ${isInSameGroup && !isSelected ? 'ring-1 ring-yellow-400/40 z-10' : ''}`
      } ${isSelected ? 'ring-2 ring-yellow-400 z-20' : ''} ${isPlayerHere ? 'z-10' : ''}`}
      style={{
        background: bg,
        boxShadow: isCorner
          ? 'inset 0 0 20px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,230,200,0.15)'
          : `inset 0 0 10px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.4)${
            canBuild ? ', 0 0 8px rgba(74,222,128,0.4)' : ''
          }${ownerPlayer ? `, 0 0 6px ${COALITIONS[ownerPlayer.coalitionId]?.color}40` : ''}`,
      }}
      onClick={() => selectTile(tile.id === useGameStore.getState().selectedTileId ? null : tile.id)}
    >
      {hasColorStrip && !isSideTile && (
        <div className="absolute top-0 left-0 right-0 h-[25%] rounded-t-sm"
          style={{
            background: `linear-gradient(180deg, ${COLOR_GROUP_HEX[tile.colorGroup!]} 0%, ${COLOR_GROUP_HEX[tile.colorGroup!]}cc 100%)`,
            boxShadow: `0 1px 4px ${COLOR_GROUP_HEX[tile.colorGroup!]}40`,
          }}
        />
      )}
      {hasColorStrip && isSideTile && (
        <div className="absolute top-0 left-0 bottom-0 w-[25%] rounded-l-sm"
          style={{
            background: `linear-gradient(90deg, ${COLOR_GROUP_HEX[tile.colorGroup!]} 0%, ${COLOR_GROUP_HEX[tile.colorGroup!]}cc 100%)`,
            boxShadow: `0 1px 4px ${COLOR_GROUP_HEX[tile.colorGroup!]}40`,
          }}
        />
      )}

      {/* Bottom/Top tiles: horizontal layout */}
      {!isSideTile && (
        <div className={`relative w-full h-full flex flex-col items-center justify-center gap-0 px-[2px] ${hasColorStrip ? 'mt-[25%] h-[75%]' : ''}`}>
          <span className={isCorner ? 'text-lg sm:text-xl leading-none drop-shadow' : 'text-[9px] sm:text-xs leading-none'}>{icon}</span>
          <span
            className={`font-extrabold text-center leading-[1.05] w-full px-0.5 ${
              isCorner ? 'text-[8px] sm:text-[10px] text-amber-900' : 'text-[7px] sm:text-[9px] text-slate-900'
            }`}
            style={{
              textShadow: '0 0 2px rgba(255,255,255,0.3)',
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            title={tile.name}
          >
            {isCorner ? getCornerLabel(tile) : tile.name}
          </span>
          {tile.price && !isCorner && (
            <span className="text-[6px] sm:text-[7px] font-bold text-slate-800/80">RM{tile.price}</span>
          )}
          {isCorner && (
            <span className="text-[5px] sm:text-[7px] text-amber-800/70 font-medium truncate max-w-full">{tile.description?.substring(0, 30)}</span>
          )}
        </div>
      )}

      {/* Left/Right tiles: vertical layout with rotated content */}
      {isSideTile && (
        <div className={`relative w-full h-full flex flex-col items-center justify-center gap-0 py-[2px] ${hasColorStrip ? 'ml-[25%] w-[75%]' : ''}`}>
          <span className="text-[9px] sm:text-xs leading-none">{icon}</span>
          <span
            className="font-extrabold text-center leading-[1.05] text-[7px] sm:text-[9px] text-slate-900"
            style={{
              textShadow: '0 0 2px rgba(255,255,255,0.3)',
              writingMode: orientation === 'left' ? 'vertical-rl' : 'vertical-lr',
              textOrientation: 'mixed',
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            title={tile.name}
          >
            {tile.name}
          </span>
          {tile.price && (
            <span className="text-[6px] sm:text-[7px] font-bold text-slate-800/80">RM{tile.price}</span>
          )}
        </div>
      )}

      {/* Houses */}
      {houses > 0 && !isCorner && (
        <div className={`absolute flex gap-[1px] ${isSideTile ? 'bottom-1 left-1/2 -translate-x-1/2 flex-col' : 'bottom-0.5 left-1/2 -translate-x-1/2 flex-row'}`}>
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

      {/* Owner indicator */}
      {ownerPlayer && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`absolute w-2 h-2 rounded-full border border-white/50 shadow-sm ${
            isSideTile ? 'bottom-0.5 right-0.5' : 'bottom-0.5 right-0.5'
          }`}
          style={{ backgroundColor: COALITIONS[ownerPlayer.coalitionId]?.color }}
        />
      )}

      {/* Mortgage overlay */}
      {isMortgaged && (
        <div className="absolute inset-0 bg-orange-900/30 rounded-[inherit] flex items-center justify-center pointer-events-none z-10">
          <span className="text-[5px] sm:text-[6px] font-black text-orange-400/80 bg-orange-900/60 px-1 rounded">MORTGAGE</span>
        </div>
      )}

      {/* Player tokens */}
      {playersOnTile.length > 0 && (
        <div className={`absolute flex gap-[1px] z-20 ${
          isCorner
            ? '-top-1 -right-1 flex-col'
            : orientation === 'bottom'
              ? '-top-2 -right-0.5 flex-col'
              : orientation === 'top'
                ? '-bottom-2 -right-0.5 flex-col'
                : orientation === 'left'
                  ? '-right-2 -top-0.5 flex-row'
                  : '-left-2 -top-0.5 flex-row'
        }`}>
          {playersOnTile.map((p, idx) => (
            <motion.div
              key={p.id}
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 + idx * 0.3, delay: idx * 0.15 }}
              className="w-4 h-4 rounded-full border-2 border-white/80 shadow-lg flex items-center justify-center overflow-hidden bg-white"
              style={{
                boxShadow: `0 0 6px ${COALITIONS[p.coalitionId]?.color}60`,
              }}
            >
              <CoalitionLogo coalitionId={p.coalitionId} size={14} circular alt={p.name} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Color Group Ownership Legend ─── */
const COLOR_GROUPS = ['brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue'] as const;
type ColorGroupName = typeof COLOR_GROUPS[number];

function ColorGroupLegend() {
  const tiles = useGameStore(s => s.tiles);
  const players = useGameStore(s => s.players);

  return (
    <div className="flex flex-wrap items-center justify-center gap-[3px] mt-1.5">
      {COLOR_GROUPS.map(group => {
        const groupTiles = BOARD_TILES.filter(t => t.colorGroup === group);
        if (groupTiles.length === 0) return null;
        const ownedTiles = groupTiles.map(t => tiles.find(st => st.id === t.id)).filter(Boolean);
        const owners = [...new Set(ownedTiles.map(t => t!.owner).filter(Boolean))];
        const allSameOwner = owners.length === 1;
        const ownerPlayer = allSameOwner ? players.find(p => p.id === owners[0]) : null;
        const hex = COLOR_GROUP_HEX[group as ColorGroupName];

        return (
          <div
            key={group}
            className="flex items-center gap-[2px] px-1 py-[1px] rounded-sm border"
            style={{
              backgroundColor: ownerPlayer ? `${hex}30` : 'rgba(0,0,0,0.3)',
              borderColor: ownerPlayer ? `${COALITIONS[ownerPlayer.coalitionId]?.color}60` : 'rgba(255,255,255,0.08)',
            }}
            title={`${group}: ${ownedTiles.filter(t => t!.owner).length}/${groupTiles.length} owned`}
          >
            <div className="w-1.5 h-1.5 rounded-[1px]" style={{ backgroundColor: hex }} />
            {groupTiles.map(t => {
              const tileState = tiles.find(st => st.id === t.id);
              const ownerP = tileState?.owner ? players.find(p => p.id === tileState!.owner) : null;
              return (
                <div
                  key={t.id}
                  className="w-1.5 h-1.5 rounded-[1px] border border-white/20"
                  style={{ backgroundColor: ownerP ? COALITIONS[ownerP.coalitionId]?.color : 'rgba(100,116,139,0.3)' }}
                />
              );
            })}
            {ownerPlayer && (
              <div className="w-2.5 h-2.5 rounded-full overflow-hidden bg-white border border-white/30">
                <CoalitionLogo coalitionId={ownerPlayer.coalitionId} size={10} circular alt={ownerPlayer.name} />
              </div>
            )}
          </div>
        );
      })}
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
    <div
      className="w-full h-full relative overflow-hidden flex items-center justify-center"
      style={{
        /* Reserve horizontal space for dashboard sidebars on desktop.
           Left sidebar w-44 (11rem) + right sidebar w-52 (13rem) + gaps.
           This padding guarantees the board never sits behind the sidebars. */
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
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

      {/* Responsive padding wrapper — reserves space for dashboard sidebars + top/bottom bars.
          The board lives inside as a square (aspect-ratio:1) constrained by both max-width
          and max-height, so it ALWAYS fits and stays centered via flexbox. */}
      <div
        className="relative z-10 flex items-center justify-center w-full h-full"
        style={{
          /* Reserve vertical space for the dashboard top bar (dice/turn ~5rem) and
             bottom action bar (Baling Dadu button ~6rem) so corners aren't covered. */
          paddingTop: '5rem',
          paddingBottom: '7rem',
        }}
      >
        <style>{`
          [data-board-frame] {
            /* Mobile: full width with small margins, capped by height (leave room for top/bottom bars) */
            width: min(94vw, 68vh);
            height: min(94vw, 68vh);
          }
          @media (min-width: 768px) {
            [data-board-frame] {
              /* Desktop: reserve 30rem total for sidebars (left 11rem + right 13rem + gaps 6rem) */
              width: min(72vh, calc(100vw - 30rem));
              height: min(72vh, calc(100vw - 30rem));
            }
          }
        `}</style>
        <div data-board-frame style={{ aspectRatio: '1 / 1', position: 'relative' }}>
      <motion.div
        data-board-center
        initial={{ opacity: 0, scale: 0.85, rotateX: 15 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      >
        {/* Outer glow ring */}
        <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-amber-500/10 via-transparent to-emerald-500/10 blur-sm" />

        {/* Jalur Gemilang decorative border */}
        <div className="absolute -inset-1 rounded-xl overflow-hidden pointer-events-none">
          {['#CC0001','#FFFFFF','#002569','#FFFFFF','#CC0001','#FFFFFF','#002569','#FFFFFF','#CC0001','#FFFFFF','#002569','#FFFFFF','#CC0001','#FFFFFF'].map((c, i) => (
            <div key={i} className="absolute h-full" style={{
              left: `${(i / 14) * 100}%`,
              width: `${100 / 14}%`,
              backgroundColor: c,
              opacity: 0.12,
            }} />
          ))}
        </div>

        {/* Board base with wood-like gradient */}
        <div className="absolute inset-0 rounded-xl overflow-hidden animate-pulse-glow"
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

        {/* ===== CSS Grid Board Layout ===== */}
        {/* 11×11 grid: corners 1.6fr, edges 1fr each.
            CRITICAL: use minmax(0, 1fr) not 1fr — otherwise tile content
            (text/icons) forces columns to grow beyond the container,
            causing the grid to overflow and tiles to render off-board. */}
        <div
          className="absolute inset-1 grid rounded-lg overflow-hidden"
          style={{
            gridTemplateColumns: 'minmax(0, 1.6fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.6fr)',
            gridTemplateRows: 'minmax(0, 1.6fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.6fr)',
          }}
        >
          {/* Render all 40 tiles */}
          {BOARD_TILES.map(tile => {
            const pos = getGridPosition(tile.id);
            return (
              <div key={tile.id} style={{
                gridRow: pos.row,
                gridColumn: pos.col,
                position: 'relative',
                zIndex: tile.type === 'corner' ? 1 : 2,
                minWidth: 0,
                minHeight: 0,
                overflow: 'hidden',
              }}>
                <TileView tile={tile} />
              </div>
            );
          })}

          {/* Center area spans inner 9×9 */}
          <div
            className="rounded-lg bg-gradient-to-br from-[#0d2a18] to-[#153d22] border border-amber-700/20 overflow-hidden relative"
            style={{
              gridRow: '2 / 11',
              gridColumn: '2 / 11',
              boxShadow: 'inset 0 0 25px rgba(0,0,0,0.4), 0 0 20px rgba(0,0,0,0.2)',
            }}
          >
            {/* Rotating "Pilihan Raya" text along center border */}
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <defs>
                  <path id="centerTextPath" d="M 76,50 A 26,26 0 1,1 24,50 A 26,26 0 1,1 76,50" fill="none" />
                </defs>
                <text fill="rgba(245,158,11,0.15)" fontSize="4" fontWeight="900" letterSpacing="4">
                  <textPath href="#centerTextPath">
                    <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="30s" repeatCount="indefinite" />
                    PILIHAN RAYA &#xB7; DEWAN RAKYAT &#xB7; 2024 &#xB7;
                  </textPath>
                </text>
              </svg>
            </div>

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

              {/* Coalition logos */}
              <div className="flex items-center justify-center gap-1.5 md:gap-2">
                {Object.values(COALITIONS).map((c, i) => (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center shadow-md border border-white/20 overflow-hidden bg-white/95"
                    style={{
                      boxShadow: `0 0 8px ${c.color}30`,
                    }}
                  >
                    <CoalitionLogo coalitionId={c.id} size={20} alt={`${c.fullName} logo`} />
                  </motion.div>
                ))}
              </div>

              {/* Round badge */}
              <div className="mt-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="text-[7px] md:text-[8px] font-black tracking-wider text-amber-400/70">R{turnCount}</span>
              </div>

              {/* Current turn indicator */}
              {currentPlayer && (
                <motion.div key={currentPlayer.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 border border-white/5">
                  <div className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COALITIONS[currentPlayer.coalitionId]?.color, boxShadow: `0 0 6px ${COALITIONS[currentPlayer.coalitionId]?.color}` }} />
                  <span className="text-[8px] md:text-[10px] font-bold" style={{ color: COALITIONS[currentPlayer.coalitionId]?.color }}>
                    {currentPlayer.name}
                  </span>
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

              {/* Color group ownership legend */}
              <ColorGroupLegend />

              {/* Live player count */}
              <div className="flex items-center gap-2 mt-1 text-[6px] text-slate-600">
                <span>🗳️ {players.filter(p => !p.isBankrupt).length} Active</span>
                <span>•</span>
                <span>💰 {(players.reduce((s, p) => s + p.money, 0) / 1000).toFixed(1)}K Total</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Sparkle particles */}
        {[
          {x:'8%',y:'8%',d:0},{x:'92%',y:'8%',d:0.5},
          {x:'8%',y:'92%',d:1.2},{x:'92%',y:'92%',d:0.8},
          {x:'50%',y:'5%',d:2.0},{x:'50%',y:'95%',d:1.5},
          {x:'95%',y:'50%',d:2.5},{x:'5%',y:'50%',d:1.8},
        ].map((s, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full bg-yellow-300 pointer-events-none z-30"
            style={{
              left: s.x, top: s.y,
              animation: `sparkle-float ${2.5 + s.d}s ease-in-out ${s.d}s infinite`,
            }}
          />
        ))}
      </motion.div>
        </div>{/* /data-board-frame */}
      </div>{/* /flex centering wrapper */}
    </div>
  );
}