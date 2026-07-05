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
  generateCardFaceTexture,
  generateCardBackTexture,
  createCardGeometry,
} from '@/components/game/CardTexture';
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

// Card dimensions (trading-card style — thick ExtrudeGeometry)
const CARD_LENGTH = 1.7;   // long edge along the board perimeter
const CARD_WIDTH = 1.0;    // short edge inward
const CARD_THICKNESS = 0.08;

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

/**
 * Returns the Euler rotation for flat text on the board.
 *
 * Classic Monopoly orients text outward on each of the 4 sides (4 players
 * sit around the board). But this is a DIGITAL game with ONE camera at the
 * southeast diagonal — orienting text 4 different ways means 2 sides are
 * always upside down to the camera.
 *
 * Solution: ALL tile text faces the SAME direction (top points north / -Z),
 * so it reads correctly from the camera looking down from the south. This
 * is the standard approach for digital board game adaptations.
 *
 *   -PI/2 X-rotation: lays the text flat on the felt, facing up.
 *   Y=0: top of text points -Z (north, away from south camera) → reads
 *        left-to-right, top-away, like reading a book on a table.
 */
function textRotationForTile(_id: number): [number, number, number] {
  // All tiles use the same rotation — readable from the single camera.
  return [-Math.PI / 2, 0, 0];
}

// ───────────────────────────────────────────────────────────────────
// CORNER TILE  (animated glow)
// ───────────────────────────────────────────────────────────────────

function CornerTile({ tile }: { tile: Tile }) {
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);
  const pos = getTilePosition(tile.id, BOARD_SIZE);

  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const selectTile = useGameStore((s) => s.selectTile);
  const isSelected = selectedTileId === tile.id;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectTile(isSelected ? null : tile.id);
  };

  // ── Mythic corner card (thick ExtrudeGeometry with canvas face texture) ──
  const cardGeometry = useMemo(
    () => createCardGeometry(CORNER_W, CORNER_D, CARD_THICKNESS),
    [],
  );
  const faceTexture = useMemo(() => generateCardFaceTexture(tile), [tile]);
  const backTexture = useMemo(() => generateCardBackTexture(), []);
  const edgeMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#0a0a0a',
        roughness: 0.3,
        metalness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
      }),
    [],
  );
  const faceMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: faceTexture,
        roughness: 0.25,
        metalness: 0.15,
        clearcoat: 0.9,
        clearcoatRoughness: 0.15,
        emissive: isSelected || hovered ? '#ffffff' : '#000000',
        emissiveIntensity: isSelected ? 0.15 : hovered ? 0.08 : 0,
        emissiveMap: faceTexture,
      }),
    [faceTexture, isSelected, hovered],
  );
  const backMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: backTexture,
        roughness: 0.4,
        metalness: 0.05,
      }),
    [backTexture],
  );
  // BoxGeometry material order: [+X, -X, +Y (top), -Y (bottom), +Z, -Z]
  const cardMaterials = useMemo(
    () => [edgeMaterial, edgeMaterial, faceMaterial, backMaterial, edgeMaterial, edgeMaterial],
    [edgeMaterial, faceMaterial, backMaterial],
  );

  // Gentle pulse + hover lift
  useFrame((_, delta) => {
    if (groupRef.current) {
      const targetY = hovered || isSelected ? 0.1 : 0.02;
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * Math.min(delta * 8, 1);
    }
  });

  // Corners always show face (they're mythic, never "owned")
  const cardRotation: [number, number, number] = [0, 0, pos.rotation];

  return (
    <group ref={groupRef} position={[pos.x, 0.02, pos.z]}>
      {/* Card base (thin box for thickness) */}
      <mesh
        rotation={[0, 0, pos.rotation]}
        position={[0, CARD_THICKNESS / 2, 0]}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[CORNER_W, CARD_THICKNESS, CORNER_D]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.5} metalness={0.1} transparent opacity={0.15} depthWrite={false} />
      </mesh>
      {/* Card face texture (semi-transparent so board image shows through) */}
      <mesh
        rotation={[-Math.PI / 2, 0, pos.rotation]}
        position={[0, CARD_THICKNESS + 0.002, 0]}
        receiveShadow
      >
        <planeGeometry args={[CORNER_W, CORNER_D]} />
        <meshBasicMaterial map={faceTexture} side={THREE.DoubleSide} toneMapped={false} transparent opacity={0.9} depthWrite={false} />
      </mesh>
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

  // Per-type material config. All tiles are FLAT (same thin height) like
  // real Monopoly — the color bar on the outer edge provides the visual identity.
  const typeConfig = useMemo(() => {
    switch (tile.type) {
      case 'property':
        return { height: TILE_H, roughness: 0.6, metalness: 0.1 };
      case 'highway':
        return { height: TILE_H, roughness: 0.5, metalness: 0.3 };
      case 'media':
        return { height: TILE_H, roughness: 0.5, metalness: 0.2 };
      case 'tax':
        return { height: TILE_H, roughness: 0.5, metalness: 0.3 };
      case 'chest':
        return { height: TILE_H, roughness: 0.6, metalness: 0.1 };
      case 'chance':
        return { height: TILE_H, roughness: 0.6, metalness: 0.1 };
      default:
        return { height: TILE_H, roughness: 0.6, metalness: 0.1 };
    }
  }, [tile.type]);

  const tileH = typeConfig.height;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectTile(isSelected ? null : tile.id);
  };

  // Hover / select — flat tiles lift slightly + emit glow (no big 3D pop)
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetY = hovered || isSelected ? 0.08 : 0.02;
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * Math.min(delta * 8, 1);
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

  // Property colour-strip — on the OUTER edge of the tile (classic Monopoly).
  // outX/outZ point outward, so the strip sits at +outX*offset (outer edge).
  const showStrip = tile.type === 'property' && !!tile.colorGroup;
  const stripDepth = EDGE_D * 0.28; // ~28% of tile depth (classic Monopoly ratio)
  const stripOffX = outX * (EDGE_D / 2 - stripDepth / 2);
  const stripOffZ = outZ * (EDGE_D / 2 - stripDepth / 2);
  const stripGeo: [number, number, number] = isAlongX
    ? [EDGE_W - 0.1, 0.04, stripDepth]
    : [stripDepth, 0.04, EDGE_W - 0.1];

  // Text offsets — classic Monopoly layout:
  // Color bar on OUTER edge, name in CENTER, price on INNER side (toward board center)
  const subOffX = -outX * 0.16;
  const subOffZ = -outZ * 0.16;
  const priceOffX = -outX * 0.3;
  const priceOffZ = -outZ * 0.3;

  const textY = 0.03; // flat on the felt, text hovers just above the surface

  // ── Trading-card textures (generated once per tile via canvas) ──
  const cardGeometry = useMemo(
    () => createCardGeometry(CARD_LENGTH, CARD_WIDTH, CARD_THICKNESS),
    [],
  );
  const faceTexture = useMemo(() => generateCardFaceTexture(tile), [tile]);
  const backTexture = useMemo(() => generateCardBackTexture(), []);
  const edgeMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#0a0a0a',
        roughness: 0.3,
        metalness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
      }),
    [],
  );
  const faceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: faceTexture,
        roughness: 0.4,
        metalness: 0.05,
      }),
    [faceTexture],
  );
  const backMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: backTexture,
        roughness: 0.4,
        metalness: 0.05,
      }),
    [backTexture],
  );
  // BoxGeometry material order: [+X, -X, +Y (top), -Y (bottom), +Z, -Z]
  // Card lies flat (rotation.x = -π/2) so +Y face points UP (visible).
  // faceMaterial on top, backMaterial on bottom, edgeMaterial on the 4 sides.
  const cardMaterials = useMemo(
    () => [edgeMaterial, edgeMaterial, faceMaterial, backMaterial, edgeMaterial, edgeMaterial],
    [edgeMaterial, faceMaterial, backMaterial],
  );

  // Card lies flat — BoxGeometry(length, thickness, width) with NO X-rotation
  // so the +Y face (large face with texture) points UP toward the camera.
  // Z-rotation orients the long edge along the board perimeter.
  const cardRotation: [number, number, number] = [0, 0, pos.rotation];

  return (
    <group ref={groupRef} position={[pos.x, 0.02, pos.z]}>
      {/* ── Card base (thin box for thickness) ── */}
      <mesh
        rotation={[0, 0, pos.rotation]}
        position={[0, CARD_THICKNESS / 2, 0]}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[CARD_LENGTH, CARD_THICKNESS, CARD_WIDTH]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.5} metalness={0.1} transparent opacity={0.15} depthWrite={false} />
      </mesh>
      {/* ── Card face texture (semi-transparent so board image shows through) ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, pos.rotation]}
        position={[0, CARD_THICKNESS + 0.002, 0]}
        receiveShadow
      >
        <planeGeometry args={[CARD_LENGTH, CARD_WIDTH]} />
        <meshBasicMaterial map={faceTexture} side={THREE.DoubleSide} toneMapped={false} transparent opacity={0.9} depthWrite={false} />
      </mesh>

      {/* ── Owner flag pole (rises when owned) ── */}
      {hasOwner && ownerColor && (
        <group
          position={[
            -outX * (EDGE_D / 2 - 0.15),
            0.02,
            -outZ * (EDGE_D / 2 - 0.15),
          ]}
        >
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.36, 8]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.7} />
          </mesh>
          <mesh position={[0.06, 0.28, 0]} castShadow>
            <planeGeometry args={[0.12, 0.08]} />
            <meshStandardMaterial
              color={ownerColor}
              emissive={ownerColor}
              emissiveIntensity={0.15}
              roughness={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0.37, 0]}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      )}

      {/* ── Cawangan (houses) — small cubes in party color ── */}
      {houseCount > 0 && hasOwner && ownerColor && (
        <group position={[-outX * 0.05, CARD_THICKNESS + 0.02, -outZ * 0.05]}>
          {Array.from({ length: Math.min(houseCount, 4) }).map((_, i) => {
            const hx = isAlongX ? (i - 1.5) * 0.22 : 0;
            const hz = isAlongX ? 0 : (i - 1.5) * 0.22;
            return (
              <mesh key={`h${i}`} position={[hx, 0.05, hz]} castShadow>
                <boxGeometry args={[0.13, 0.11, 0.13]} />
                <meshStandardMaterial
                  color={ownerColor}
                  emissive={ownerColor}
                  emissiveIntensity={0.2}
                />
              </mesh>
            );
          })}
          {/* Markas (hotel) = 5th level */}
          {houseCount >= 5 && (
            <mesh position={[0, 0.08, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.09, 0.16, 8]} />
              <meshStandardMaterial
                color={ownerColor}
                metalness={0.4}
                emissive={ownerColor}
                emissiveIntensity={0.25}
              />
            </mesh>
          )}
        </group>
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

  // Load the uploaded Malaysian political Monopoly board image as a texture
  const boardTexture = useTexture('/board-surface.jpg', (tex) => {
    (tex as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
  });

  return (
    <group>
      {/* ── Board surface with uploaded Malaysian political Monopoly image ──
          The image fills the entire felt area (tile loop + margin).
          The box sides + bottom keep the dark felt color. */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[feltSize, 0.2, feltSize]} />
        <meshStandardMaterial
          color={FELT_COLOR}
          roughness={0.92}
          metalness={0}
        />
      </mesh>
      {/* Board image on top of the felt — shows the full Malaysian political board art */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[feltSize, feltSize]} />
        <meshBasicMaterial map={boardTexture} toneMapped={false} />
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
// CARD DECK — stack of cards in the center (Kad Nasib / Kad SPR)
// ───────────────────────────────────────────────────────────────────

function CardDeck({ position, color, label }: { position: [number, number, number]; color: string; label: string }) {
  const deckRef = useRef<THREE.Group>(null!);
  const labelRef = useRef<THREE.Mesh>(null!);

  // Subtle hover/breathe
  useFrame(({ clock }) => {
    if (deckRef.current) {
      deckRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.2) * 0.02;
    }
  });

  return (
    <group ref={deckRef} position={position}>
      {/* Stack of 8 cards */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          position={[0, i * 0.008, 0]}
          rotation={[-Math.PI / 2, 0, (Math.random() - 0.5) * 0.08]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.9, 0.01, 1.4]} />
          <meshPhysicalMaterial
            color={color}
            roughness={0.35}
            metalness={0.2}
            clearcoat={0.5}
            emissive={color}
            emissiveIntensity={i === 7 ? 0.15 : 0.05}
          />
        </mesh>
      ))}
      {/* Gold rim on top card */}
      <mesh position={[0, 8 * 0.008 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.015, 8, 32]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} emissive="#f59e0b" emissiveIntensity={0.15} />
      </mesh>
      {/* Label */}
      <Text
        position={[0, 0.12, 0.85]}
        fontSize={0.18}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
        outlineWidth={0.01}
        outlineColor="#1e293b"
      >
        {label}
      </Text>
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
      {/* ── Board base (felt + wood frame + uploaded surface image) ── */}
      <Suspense fallback={null}>
        <BoardBase />
      </Suspense>

      {/* ── 3D Parliament building (shrunken to 25% — decorative token) ── */}
      <Suspense fallback={null}>
        <Parliament3D />
      </Suspense>

      {/* ── Kad Nasib (Chance) deck — orange, 10 o'clock ── */}
      <CardDeck position={[-3.5, 0.02, 3.5]} color="#c2410c" label="KAD NASIB" />

      {/* ── Kad SPR (Community Chest) deck — blue, 2 o'clock ── */}
      <CardDeck position={[3.5, 0.02, 3.5]} color="#1e40af" label="KAD SPR" />

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
