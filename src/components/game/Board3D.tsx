'use client';

import { useRef, useMemo, useState, Suspense, useEffect } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text, RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import {
  BOARD_TILES,
  COLOR_GROUP_HEX,
  COALITIONS,
  getTilePosition,
  type Tile,
} from '@/lib/game-data';
import { useGameStore } from '@/lib/game-store';
import {
  useIridescentMaterial,
  useGoldShimmerMaterial,
  useFlagScrollMaterial,
  useShaderAnimation,
  TileBuilding,
  TileTrain,
  TileCoinStack,
  TileKeris,
  TileCardStack,
  TileMonitor,
} from '@/components/game/Shader3D';
import { ParticleBurst, Shockwave, LightBeam, type ParticleType } from '@/components/game/Particle3D';
import { Parliament3D } from '@/components/game/Parliament3D';

// ───────────────────────────────────────────────────────────────────
// CONSTANTS
// ───────────────────────────────────────────────────────────────────

const BOARD_SIZE = 20;        // tile-loop span (corner-to-corner)
const HALF = BOARD_SIZE / 2;
const FELT_MARGIN = 3.2;      // extra felt around the tile loop so tiles & tokens stay ON the board

const TILE_H = 0.18; // tile thickness
const CORNER_W = 2.3;
const CORNER_D = 2.3;
const EDGE_W = 1.9; // width along the edge
const EDGE_D = 1.1; // depth perpendicular to edge (towards center)

const FELT_COLOR = '#1a472a';
const FELT_INNER = '#153d22';
const WOOD_COLOR = '#3d2817';
const WOOD_ACCENT = '#5c3d21';

const FRAME_W = 1.2;
const FRAME_H = 0.5;

// Tile type → base colour
const TYPE_COLORS: Record<string, string> = {
  corner: '#f5e6c8',
  highway: '#e5e7eb',
  media: '#f0abfc',
  tax: '#fca5a5',
  chest: '#fef3c7',
  chance: '#93c5fd',
};

// Short Malay sub-labels for special tiles
const SUB_LABELS: Record<number, string> = {
  0: 'UNDI — Kumpul RM200',
  10: 'LAWAT SAHAJA',
  20: 'PARKIR PERCUMA',
  30: 'SPR SIASAT!',
  2: 'Peti Khazanah',
  4: 'Cukai GST',
  7: 'Peluang!',
  17: 'Peti Khazanah',
  22: 'Peluang!',
  33: 'Peti Khazanah',
  36: 'Peluang!',
  38: 'Cukai Mewah',
};

// Corner-tile emoji icons
const CORNER_ICONS: Record<number, string> = {
  0: '\u{1F5F3}\u{FE0F}',   // ballot box
  10: '\u{1F512}',          // lock
  20: '\u{1F3F0}',           // castle
  30: '\u{26A0}\u{FE0F}',   // warning
};

// ───────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────────

function getTileColor(tile: Tile): string {
  if (tile.type === 'property' && tile.colorGroup) {
    return COLOR_GROUP_HEX[tile.colorGroup];
  }
  return TYPE_COLORS[tile.type] || '#e5e7eb';
}

/**
 * Returns outward-facing unit vector and whether the edge runs along X.
 * outX / outZ = direction from center → outside the board.
 */
function edgeInfo(id: number): {
  outX: number;
  outZ: number;
  isAlongX: boolean;
} {
  if (id >= 1 && id <= 9) return { outX: 0, outZ: 1, isAlongX: true };
  if (id >= 11 && id <= 19) return { outX: -1, outZ: 0, isAlongX: false };
  if (id >= 21 && id <= 29) return { outX: 0, outZ: -1, isAlongX: true };
  return { outX: 1, outZ: 0, isAlongX: false }; // 31-39
}

// ───────────────────────────────────────────────────────────────────
// CORNER TILE  (animated glow)
// ───────────────────────────────────────────────────────────────────

function CornerTile({ tile }: { tile: Tile }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);
  const pos = getTilePosition(tile.id, BOARD_SIZE);

  // Shader materials for premium corners
  const flagMat = useFlagScrollMaterial();
  const goldMat = useGoldShimmerMaterial();
  const iridescentMat = useIridescentMaterial();
  useShaderAnimation([flagMat, goldMat, iridescentMat]);

  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const selectTile = useGameStore((s) => s.selectTile);
  const isSelected = selectedTileId === tile.id;

  // Choose material per corner: GO=flag scroll, SPR/Go-to-Jail=gold, Jail=iridescent, Istana=gold
  const cornerMat = tile.id === 0 ? flagMat : (tile.id === 30 || tile.id === 20) ? goldMat : iridescentMat;
  const isShader = tile.id === 0 || tile.id === 30 || tile.id === 20 || tile.id === 10;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectTile(isSelected ? null : tile.id);
  };

  // Gentle emissive pulse + hover lift + tilt toward camera
  useFrame(({ clock, camera }, delta) => {
    if (!matRef.current) return;
    const t = clock.elapsedTime;
    const pulse = 0.12 + 0.08 * Math.sin(t * 1.5 + tile.id * 0.7);
    matRef.current.emissiveIntensity = isSelected ? 0.5 : hovered ? 0.32 : pulse;
    if (groupRef.current) {
      const targetY = TILE_H / 2 + (hovered || isSelected ? 0.25 : 0);
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * Math.min(delta * 8, 1);
      // Tilt toward camera on hover
      if (hovered || isSelected) {
        const dir = new THREE.Vector3().subVectors(camera.position, groupRef.current.position).normalize();
        const targetTiltX = dir.y * 0.15;
        const targetTiltZ = -dir.x * 0.1;
        groupRef.current.rotation.x += (targetTiltX - groupRef.current.rotation.x) * Math.min(delta * 5, 1);
        groupRef.current.rotation.z += (targetTiltZ - groupRef.current.rotation.z) * Math.min(delta * 5, 1);
      } else {
        groupRef.current.rotation.x *= 1 - Math.min(delta * 5, 1);
        groupRef.current.rotation.z *= 1 - Math.min(delta * 5, 1);
      }
    }
  });

  // Extruded height for corners
  const cornerH = TILE_H * 2.2;

  return (
    <group ref={groupRef} position={[pos.x, cornerH / 2, pos.z]}>
      {/* Base mesh — extruded with bevel for premium feel */}
      <RoundedBox
        args={[CORNER_W, cornerH, CORNER_D]}
        radius={0.1}
        smoothness={5}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        {isShader ? (
          <primitive object={cornerMat} attach="material" />
        ) : (
          <meshStandardMaterial
            ref={matRef}
            color={TYPE_COLORS.corner}
            roughness={0.3}
            metalness={0.15}
            emissive="#f5e6c8"
            emissiveIntensity={0.12}
          />
        )}
      </RoundedBox>

      {/* Icon */}
      <Text
        position={[0, cornerH / 2 + 0.09, -0.5]}
        fontSize={0.6}
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, pos.rotation, 0]}
      >
        {CORNER_ICONS[tile.id] ?? ''}
      </Text>

      {/* Name */}
      <Text
        position={[0, cornerH / 2 + 0.01, 0.2]}
        fontSize={0.3}
        color="#3d2817"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, pos.rotation, 0]}
        maxWidth={2.0}
        textAlign="center"
        outlineWidth={0.012}
        outlineColor="#ffffff"
      >
        {tile.name}
      </Text>

      {/* Sub-label (Malay) */}
      <Text
        position={[0, cornerH / 2 + 0.01, 0.62]}
        fontSize={0.17}
        color="#6b4226"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, pos.rotation, 0]}
        maxWidth={2.0}
        textAlign="center"
        outlineWidth={0.01}
        outlineColor="#ffffff"
      >
        {SUB_LABELS[tile.id] ?? ''}
      </Text>
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────
// EDGE TILE  (property / highway / media / tax / chest / chance)
// ───────────────────────────────────────────────────────────────────

function EdgeTile({ tile }: { tile: Tile }) {
  const pos = getTilePosition(tile.id, BOARD_SIZE);
  const tiles = useGameStore((s) => s.tiles);
  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const selectTile = useGameStore((s) => s.selectTile);
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null!);

  const tileState = tiles[tile.id];
  const isSelected = selectedTileId === tile.id;
  const color = getTileColor(tile);

  // Per-type extrusion height & material config
  const typeConfig = useMemo(() => {
    switch (tile.type) {
      case 'property':
        return { height: TILE_H * 1.4, roughness: 0.25, metalness: 0.15, clearcoat: true };
      case 'highway':
        return { height: TILE_H * 2.0, roughness: 0.2, metalness: 0.8, clearcoat: false };
      case 'media':
        return { height: TILE_H * 1.3, roughness: 0.2, metalness: 0.5, clearcoat: false };
      case 'tax':
        return { height: TILE_H * 1.6, roughness: 0.3, metalness: 0.9, clearcoat: false };
      case 'chest':
        return { height: TILE_H * 1.2, roughness: 0.4, metalness: 0.1, clearcoat: false };
      case 'chance':
        return { height: TILE_H * 1.2, roughness: 0.4, metalness: 0.1, clearcoat: false };
      default:
        return { height: TILE_H, roughness: 0.35, metalness: 0.1, clearcoat: false };
    }
  }, [tile.type]);

  const tileH = typeConfig.height;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectTile(isSelected ? null : tile.id);
  };

  // Hover / select lift + tilt toward camera
  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return;
    const targetY = tileH / 2 + (hovered || isSelected ? 0.3 : 0);
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * Math.min(delta * 8, 1);
    if (hovered || isSelected) {
      const dir = new THREE.Vector3().subVectors(camera.position, groupRef.current.position).normalize();
      const targetTiltX = dir.y * 0.12;
      const targetTiltZ = -dir.x * 0.08;
      groupRef.current.rotation.x += (targetTiltX - groupRef.current.rotation.x) * Math.min(delta * 5, 1);
      groupRef.current.rotation.z += (targetTiltZ - groupRef.current.rotation.z) * Math.min(delta * 5, 1);
    } else {
      groupRef.current.rotation.x *= 1 - Math.min(delta * 5, 1);
      groupRef.current.rotation.z *= 1 - Math.min(delta * 5, 1);
    }
  });

  const houseCount = tileState?.houses ?? 0;
  const hasOwner = !!tileState?.owner;

  // Owner coalition colour
  const ownerColor = useMemo(() => {
    if (hasOwner && tileState?.owner) {
      return COALITIONS[tileState.owner]?.color ?? '#78716c';
    }
    return null;
  }, [hasOwner, tileState?.owner]);

  // Edge geometry helpers
  const { outX, outZ, isAlongX } = edgeInfo(tile.id);

  // Property colour-strip positioning
  const showStrip = tile.type === 'property' && !!tile.colorGroup;
  const stripOffX = -outX * (EDGE_D / 2 - 0.08);
  const stripOffZ = -outZ * (EDGE_D / 2 - 0.08);
  const stripGeo: [number, number, number] = isAlongX
    ? [EDGE_W - 0.15, 0.06, 0.16]
    : [0.16, 0.06, EDGE_W - 0.15];

  // Text offsets (name at centre, sub towards centre, price towards edge)
  const subOffX = -outX * 0.16;
  const subOffZ = -outZ * 0.16;
  const priceOffX = outX * 0.25;
  const priceOffZ = outZ * 0.25;

  const textY = tileH + 0.01;

  // 3D miniature to place on the tile (toward center of board)
  const miniature = useMemo(() => {
    const mx = -outX * (EDGE_D / 2 - 0.2);
    const mz = -outZ * (EDGE_D / 2 - 0.2);
    switch (tile.type) {
      case 'highway':
        return <group position={[mx, tileH / 2, mz]}><TileTrain /></group>;
      case 'tax':
        return <group position={[mx, tileH / 2, mz]}><TileCoinStack /></group>;
      case 'chest':
      case 'chance':
        return <group position={[mx, tileH / 2, mz]}><TileCardStack color={tile.type === 'chest' ? '#fbbf24' : '#3b82f6'} /></group>;
      case 'media':
        return <group position={[mx, tileH / 2, mz]}><TileMonitor /></group>;
      default:
        return null;
    }
  }, [tile.type, outX, outZ, tileH, tile.id]);

  return (
    <group ref={groupRef} position={[pos.x, tileH / 2, pos.z]}>
      {/* ── Tile body — extruded with per-type material ── */}
      <RoundedBox
        args={[EDGE_W, tileH, EDGE_D]}
        radius={0.05}
        smoothness={4}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <meshStandardMaterial
          color={color}
          roughness={typeConfig.roughness}
          metalness={typeConfig.metalness}
          emissive={isSelected || hovered ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : hovered ? 0.32 : 0}
        />
      </RoundedBox>

      {/* ── 3D miniature on top ── */}
      {miniature}

      {/* ── Property colour strip ── */}
      {showStrip && (
        <mesh
          position={[stripOffX, tileH / 2 + 0.03, stripOffZ]}
          castShadow
        >
          <boxGeometry args={stripGeo} />
          <meshStandardMaterial
            color={COLOR_GROUP_HEX[tile.colorGroup!]}
            roughness={0.25}
            metalness={0.2}
          />
        </mesh>
      )}

      {/* ── Tile name ── */}
      <Text
        position={[0, textY, 0]}
        fontSize={0.26}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, pos.rotation, 0]}
        maxWidth={EDGE_W - 0.25}
        textAlign="center"
        outlineWidth={0.018}
        outlineColor="#ffffff"
      >
        {tile.name}
      </Text>

      {/* ── Malay / special sub-label ── */}
      {SUB_LABELS[tile.id] && (
        <Text
          position={[subOffX, textY, subOffZ]}
          fontSize={0.16}
          color="#334155"
          anchorX="center"
          anchorY="middle"
          rotation={[-Math.PI / 2, pos.rotation, 0]}
          maxWidth={EDGE_W - 0.3}
          textAlign="center"
          outlineWidth={0.012}
          outlineColor="#ffffff"
        >
          {SUB_LABELS[tile.id]}
        </Text>
      )}

      {/* ── Price label ── */}
      {tile.price != null && (
        <Text
          position={[priceOffX, textY - 0.004, priceOffZ]}
          fontSize={0.32}
          color="#0f172a"
          anchorX="center"
          anchorY="middle"
          rotation={[-Math.PI / 2, pos.rotation, 0]}
          outlineWidth={0.018}
          outlineColor="#fde68a"
        >
          {`RM${tile.price}`}
        </Text>
      )}

      {/* ── House indicators (green boxes / red hotel) ── */}
      {houseCount > 0 && (
        <group
          position={[
            -outX * 0.05,
            tileH + 0.04,
            -outZ * 0.05,
          ]}
        >
          {Array.from({ length: Math.min(houseCount, 4) }).map((_, i) => {
            // Distribute along the edge direction
            const hx = isAlongX
              ? (i - 1.5) * 0.22
              : 0;
            const hz = isAlongX
              ? 0
              : (i - 1.5) * 0.22;
            return (
              <mesh key={`h${i}`} position={[hx, 0.05, hz]} castShadow>
                <boxGeometry args={[0.13, 0.11, 0.13]} />
                <meshStandardMaterial
                  color="#22c55e"
                  emissive="#22c55e"
                  emissiveIntensity={0.15}
                />
              </mesh>
            );
          })}

          {/* Hotel = 5th "house" rendered as a larger red block */}
          {houseCount >= 5 && (
            <mesh position={[0, 0.08, 0]} castShadow>
              <boxGeometry args={[0.22, 0.18, 0.22]} />
              <meshStandardMaterial
                color="#dc2626"
                emissive="#dc2626"
                emissiveIntensity={0.2}
              />
            </mesh>
          )}
        </group>
      )}

      {/* ── Owner indicator sphere ── */}
      {hasOwner && ownerColor && (
        <mesh
          position={[
            (isAlongX ? EDGE_W / 2 - 0.22 : 0),
            tileH + 0.09,
            (isAlongX ? 0 : EDGE_W / 2 - 0.22),
          ]}
          castShadow
        >
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color={ownerColor}
            emissive={ownerColor}
            emissiveIntensity={0.3}
            roughness={0.3}
          />
        </mesh>
      )}
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────
// BOARD BASE + WOOD FRAME
// ───────────────────────────────────────────────────────────────────

function BoardBase() {
  const feltSize = BOARD_SIZE + FELT_MARGIN * 2;   // tile loop + margin on both sides
  const outer = feltSize + FRAME_W * 2 + 0.4;
  const frameEdge = feltSize / 2 + FRAME_W / 2 + 0.1;

  return (
    <group>
      {/* ── Green felt playing surface (large enough to contain all tiles & tokens) ── */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[feltSize, 0.2, feltSize]} />
        <meshStandardMaterial
          color={FELT_COLOR}
          roughness={0.92}
          metalness={0}
        />
      </mesh>

      {/* Inner felt accent (slightly darker centre patch) */}
      <mesh position={[0, 0.001, 0]} receiveShadow>
        <boxGeometry args={[BOARD_SIZE - 2, 0.003, BOARD_SIZE - 2]} />
        <meshStandardMaterial color={FELT_INNER} roughness={0.95} />
      </mesh>

      {/* ── CLASSIC MONOPOLY: White inner border trim ──
          The iconic white border separating the tile loop from the center.
          Raised slightly so it's visible above the felt. */}
      <mesh position={[0, 0.15, HALF]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOARD_SIZE, 0.5]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} emissive="#ffffff" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0, 0.15, -HALF]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOARD_SIZE, 0.5]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} emissive="#ffffff" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[HALF, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, BOARD_SIZE]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} emissive="#ffffff" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[-HALF, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, BOARD_SIZE]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} emissive="#ffffff" emissiveIntensity={0.05} />
      </mesh>

      {/* ── Wood frame — four bars ── */}
      {/* Bottom */}
      <mesh position={[0, 0, frameEdge]} castShadow receiveShadow>
        <boxGeometry args={[outer, FRAME_H, FRAME_W]} />
        <meshStandardMaterial color={WOOD_COLOR} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Top */}
      <mesh position={[0, 0, -frameEdge]} castShadow receiveShadow>
        <boxGeometry args={[outer, FRAME_H, FRAME_W]} />
        <meshStandardMaterial color={WOOD_COLOR} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Left */}
      <mesh position={[frameEdge, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[FRAME_W, FRAME_H, outer]} />
        <meshStandardMaterial color={WOOD_COLOR} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Right */}
      <mesh position={[-frameEdge, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[FRAME_W, FRAME_H, outer]} />
        <meshStandardMaterial color={WOOD_COLOR} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* ── CLASSIC MONOPOLY: Red trim on the inner edge of the wood frame ──
          The signature red border that frames the playing surface. */}
      <mesh position={[0, 0.02, frameEdge - FRAME_W / 2 + 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[outer, 0.25]} />
        <meshStandardMaterial color="#c8102e" roughness={0.4} metalness={0.2} emissive="#c8102e" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0, 0.02, -frameEdge + FRAME_W / 2 - 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[outer, 0.25]} />
        <meshStandardMaterial color="#c8102e" roughness={0.4} metalness={0.2} emissive="#c8102e" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[frameEdge - FRAME_W / 2 + 0.05, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.25, outer]} />
        <meshStandardMaterial color="#c8102e" roughness={0.4} metalness={0.2} emissive="#c8102e" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[-frameEdge + FRAME_W / 2 - 0.05, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.25, outer]} />
        <meshStandardMaterial color="#c8102e" roughness={0.4} metalness={0.2} emissive="#c8102e" emissiveIntensity={0.05} />
      </mesh>

      {/* ── Corner accents (lighter wood) ── */}
      {[
        [frameEdge, FRAME_H / 2 + 0.01, frameEdge],
        [-frameEdge, FRAME_H / 2 + 0.01, frameEdge],
        [frameEdge, FRAME_H / 2 + 0.01, -frameEdge],
        [-frameEdge, FRAME_H / 2 + 0.01, -frameEdge],
      ].map(([cx, cy, cz], i) => (
        <mesh key={`ca${i}`} position={[cx, cy, cz]}>
          <boxGeometry args={[FRAME_W + 0.1, 0.08, FRAME_W + 0.1]} />
          <meshStandardMaterial
            color={WOOD_ACCENT}
            roughness={0.55}
            metalness={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────
// JALUR GEMILANG FLAG — rendered as a textured plane waving gently
// ───────────────────────────────────────────────────────────────────

function FlagMesh({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!);
  const flagTex = useTexture('/logos/flag.svg', (tex) => {
    (tex as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
  });

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // Gentle wave rotation
    const t = clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.03;
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        child.rotation.y = Math.sin(t * 1.2 + i * 0.4) * 0.04;
      }
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Flag pole */}
      <mesh position={[-1.1, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 2.4, 12]} />
        <meshStandardMaterial color="#b8860b" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Pole top finial */}
      <mesh position={[-1.1, 1.25, 0]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#d4a843" roughness={0.2} metalness={0.7} />
      </mesh>
      {/* Flag plane */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <planeGeometry args={[2.0, 1.2, 16, 8]} />
        <meshStandardMaterial
          map={flagTex}
          roughness={0.5}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────
// CENTRE DECORATION
// ───────────────────────────────────────────────────────────────────

function CenterDecoration() {
  const glowRef = useRef<THREE.MeshStandardMaterial>(null!);

  // Subtle breathing glow on the title backing plane
  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    glowRef.current.emissiveIntensity =
      0.15 + 0.06 * Math.sin(clock.elapsedTime * 0.8);
  });

  return (
    <group position={[0, 0.02, 0]}>
      {/* ── Decorative gold rings ── */}
      <mesh>
        <torusGeometry args={[5.5, 0.05, 8, 64]} />
        <meshStandardMaterial
          color="#b8860b"
          roughness={0.35}
          metalness={0.45}
        />
      </mesh>
      <mesh>
        <torusGeometry args={[4.5, 0.04, 8, 64]} />
        <meshStandardMaterial
          color="#d4a843"
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      <mesh>
        <torusGeometry args={[3.5, 0.03, 8, 64]} />
        <meshStandardMaterial
          color="#d4a843"
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {/* ── Diagonal cross-lines ── */}
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[11, 0.008, 0.05]} />
        <meshStandardMaterial
          color="#d4a843"
          roughness={0.4}
          metalness={0.4}
        />
      </mesh>
      <mesh rotation={[0, -Math.PI / 4, 0]}>
        <boxGeometry args={[11, 0.008, 0.05]} />
        <meshStandardMaterial
          color="#d4a843"
          roughness={0.4}
          metalness={0.4}
        />
      </mesh>

      {/* ── Title backing plane (translucent) ── */}
      <mesh position={[0, 0.015, 1.5]}>
        <planeGeometry args={[6, 0.9]} />
        <meshStandardMaterial
          ref={glowRef}
          color="#1a472a"
          emissive="#d4a843"
          emissiveIntensity={0.15}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── "DEWAN RAKYAT" ── */}
      <Text
        position={[0, 0.035, 1.5]}
        fontSize={0.7}
        color="#d4a843"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
        letterSpacing={0.12}
      >
        DEWAN RAKYAT
      </Text>

      {/* ── "PILIHAN RAYA EDITION" ── */}
      <Text
        position={[0, 0.035, 0.55]}
        fontSize={0.32}
        color="#c9956b"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
        letterSpacing={0.08}
      >
        PILIHAN RAYA EDITION
      </Text>

      {/* ── Coalition emblem row ── */}
      <Text
        position={[0, 0.03, -0.5]}
        fontSize={0.24}
        color="#8b7355"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
        letterSpacing={0.15}
      >
        {'\u{1F7E6} \u{1F7E9} \u{1F7E7} \u{1F7E5} \u{1F7E8} \u2B1B'}
      </Text>

      {/* ── Satirical motto ── */}
      <Text
        position={[0, 0.025, -1.3]}
        fontSize={0.2}
        color="#7c6b5a"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
        maxWidth={6}
        textAlign="center"
      >
        &quot;Demokrasi Terjamin&hellip; Maybe&quot;
      </Text>

      {/* ── Copyright gag ── */}
      <Text
        position={[0, 0.02, -2.2]}
        fontSize={0.14}
        color="#6b5e50"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
        maxWidth={6}
        textAlign="center"
      >
        &copy; Suruhanjaya Pilihan Raya (Satirical Edition)
      </Text>
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────
// LANDING EFFECTS — watches player positions; spawns particles +
// shockwave + light beam when a player lands on a tile.
// ───────────────────────────────────────────────────────────────────

interface EffectInstance {
  id: number;
  tileId: number;
  type: ParticleType;
  color: string;
  ts: number;
}

function getEffectTypeForTile(tile: Tile | undefined): { type: ParticleType; color: string } {
  if (!tile) return { type: 'confetti', color: '#facc15' };
  switch (tile.type) {
    case 'property':
      return { type: 'confetti', color: tile.colorGroup ? COLOR_GROUP_HEX[tile.colorGroup] : '#facc15' };
    case 'highway':
      return { type: 'sparks', color: '#e5e7eb' };
    case 'media':
      return { type: 'sparks', color: '#f0abfc' };
    case 'tax':
      return { type: 'sparks', color: '#fbbf24' };
    case 'chest':
      return { type: 'confetti', color: '#fbbf24' };
    case 'chance':
      return { type: 'confetti', color: '#3b82f6' };
    case 'corner':
      if (tile.id === 10) return { type: 'smoke', color: '#6b7280' };
      if (tile.id === 30) return { type: 'smoke', color: '#ef4444' };
      return { type: 'confetti', color: '#facc15' };
    default:
      return { type: 'confetti', color: '#facc15' };
  }
}

function LandingEffects() {
  const players = useGameStore((s) => s.players);
  const phase = useGameStore((s) => s.phase);
  const prevPositions = useRef<Record<string, number>>({});
  const effectsRef = useRef<EffectInstance[]>([]);
  const effectIdRef = useRef(0);
  const [, forceUpdate] = useState(0);

  // Detect position changes during render (not in an effect)
  let hasNew = false;
  if (phase === 'landed' || phase === 'buying' || phase === 'paying_rent' || phase === 'card') {
    for (const p of players) {
      const prev = prevPositions.current[p.id];
      if (prev !== undefined && prev !== p.position && !p.isBankrupt) {
        const tile = BOARD_TILES[p.position];
        const { type, color } = getEffectTypeForTile(tile);
        effectsRef.current.push({
          id: effectIdRef.current++,
          tileId: p.position,
          type,
          color,
          ts: Date.now(),
        });
        hasNew = true;
      }
      prevPositions.current[p.id] = p.position;
    }
  }

  // Schedule cleanup + re-render via microtask (avoids setState-in-effect lint)
  if (hasNew) {
    const currentIds = effectsRef.current.slice(-6).map((e) => e.id);
    queueMicrotask(() => {
      setTimeout(() => {
        effectsRef.current = effectsRef.current.filter((e) => !currentIds.includes(e.id));
        forceUpdate((n) => n + 1);
      }, 2500);
    });
  }

  const effects = effectsRef.current;

  return (
    <group>
      {effects.map((e) => {
        const pos = getTilePosition(e.tileId, BOARD_SIZE);
        return (
          <group key={e.id}>
            <ParticleBurst
              position={[pos.x, 0.8, pos.z]}
              type={e.type}
              color={e.color}
              color2="#ffffff"
            />
            <Shockwave position={[pos.x, 0.15, pos.z]} color={e.color} duration={800} />
            <LightBeam position={[pos.x, 0.15, pos.z]} color={e.color} height={3} />
          </group>
        );
      })}
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ───────────────────────────────────────────────────────────────────

export default function Board3D() {
  const boardRef = useRef<THREE.Group>(null!);

  // Pre-compute tile positions (stable, never changes)
  const tilePositions = useMemo(
    () =>
      BOARD_TILES.map((tile) => ({
        tile,
        pos: getTilePosition(tile.id, BOARD_SIZE),
      })),
    [],
  );

  return (
    <group ref={boardRef} position={[0, 0, 0]}>
      {/* ── Board base (felt + wood frame) ── */}
      <BoardBase />

      {/* ── 3D Parliament building replaces the empty center ── */}
      <Suspense fallback={null}>
        <Parliament3D />
      </Suspense>

      {/* ── Jalur Gemilang flags at two corners of the inner area ── */}
      <Suspense fallback={null}>
        <FlagMesh position={[-6.5, 1.2, -6.5]} />
        <FlagMesh position={[6.5, 1.2, 6.5]} />
      </Suspense>

      {/* ── Landing effects (particles + shockwave + beam) ── */}
      <LandingEffects />

      {/* ── All 40 tiles ── */}
      <group>
        {tilePositions.map(({ tile }) =>
          tile.type === 'corner' ? (
            <CornerTile key={tile.id} tile={tile} />
          ) : (
            <EdgeTile key={tile.id} tile={tile} />
          ),
        )}
      </group>

      {/* ── Lighting (self-contained; move to parent scene if desired) ── */}
      <ambientLight intensity={0.45} color="#fef3c7" />

      <directionalLight
        position={[18, 22, 12]}
        intensity={0.85}
        color="#fffaf0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.001}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[-12, 16, -8]}
        intensity={0.25}
        color="#e0e7ff"
      />

      {/* Soft overhead point for the title glow */}
      <pointLight
        position={[0, 8, 0]}
        intensity={0.35}
        color="#fef9ef"
        distance={20}
        decay={2}
      />
    </group>
  );
}
