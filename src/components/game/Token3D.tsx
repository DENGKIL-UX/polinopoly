'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { COALITIONS, getTilePosition } from '@/lib/game-data';
import { useGameStore, type Player } from '@/lib/game-store';

// ───────────────────────────────────────────────────────────────────
// CONSTANTS
// ───────────────────────────────────────────────────────────────────

const BOARD_SIZE = 20;

/** Pre-computed offset positions so multiple tokens on one tile fan out nicely */
const TILE_OFFSETS: [number, number][] = [
  [0, 0],
  [0.4, 0.2],
  [-0.4, 0.2],
  [0.4, -0.2],
  [-0.4, -0.2],
  [0, 0.45],
  [0, -0.45],
];

const FLOAT_AMPLITUDE = 0.12;
const FLOAT_SPEED = 2.0;
const GLOW_SPEED = 3.5;
const GLOW_MIN = 0.15;
const GLOW_MAX = 0.7;

// ───────────────────────────────────────────────────────────────────
// JAIL CAGE — thin torus ring + vertical bars
// ───────────────────────────────────────────────────────────────────

function JailCage() {
  return (
    <group position={[0, 0.35, 0]}>
      {/* Top ring */}
      <mesh>
        <torusGeometry args={[0.32, 0.02, 6, 16]} />
        <meshStandardMaterial
          color="#94a3b8"
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Bottom ring */}
      <mesh position={[0, -0.35, 0]}>
        <torusGeometry args={[0.32, 0.02, 6, 16]} />
        <meshStandardMaterial
          color="#94a3b8"
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Vertical bars */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * 0.32;
        const z = Math.sin(angle) * 0.32;
        return (
          <mesh key={i} position={[x, -0.175, z]}>
            <cylinderGeometry args={[0.015, 0.015, 0.7, 6]} />
            <meshStandardMaterial
              color="#cbd5e1"
              roughness={0.35}
              metalness={0.6}
            />
          </mesh>
        );
      })}

      {/* Tiny padlock icon (simplified as a small box) */}
      <mesh position={[0.32, 0.0, 0]}>
        <boxGeometry args={[0.08, 0.1, 0.06]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      <mesh position={[0.32, 0.08, 0]}>
        <torusGeometry args={[0.03, 0.012, 6, 12]} />
        <meshStandardMaterial
          color="#475569"
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────
// SHADOW — flat dark disc beneath each token
// ───────────────────────────────────────────────────────────────────

function TokenShadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]} receiveShadow>
      <circleGeometry args={[0.35, 24]} />
      <meshStandardMaterial
        color="#000000"
        transparent
        opacity={0.25}
        roughness={1}
        metalness={0}
        depthWrite={false}
      />
    </mesh>
  );
}

// ───────────────────────────────────────────────────────────────────
// SINGLE TOKEN PIECE  (bishop/chess-piece silhouette)
// ───────────────────────────────────────────────────────────────────

interface SingleTokenProps {
  player: Player;
  isActive: boolean;
  indexOnTile: number;
}

function SingleToken({ player, isActive, indexOnTile }: SingleTokenProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const domeMatRef = useRef<THREE.MeshStandardMaterial>(null!);

  const coalition = COALITIONS[player.coalitionId];
  const color = coalition?.color ?? '#78716c';
  const emissiveColor = color;

  // Unique phase offset per player so they don't bob in sync
  const phaseOffset = player.name.charCodeAt(0) * 0.7 + indexOnTile * 1.1;

  // ── Per-frame: floating + glow ──
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    // Floating animation
    groupRef.current.position.y =
      0.25 + Math.sin(t * FLOAT_SPEED + phaseOffset) * FLOAT_AMPLITUDE;

    // Emissive glow for active player
    if (bodyMatRef.current) {
      const glow = isActive
        ? GLOW_MIN + (GLOW_MAX - GLOW_MIN) * (0.5 + 0.5 * Math.sin(t * GLOW_SPEED))
        : 0.04;
      bodyMatRef.current.emissiveIntensity = glow;
    }
    if (domeMatRef.current) {
      const glow = isActive
        ? GLOW_MIN + (GLOW_MAX - GLOW_MIN) * (0.5 + 0.5 * Math.sin(t * GLOW_SPEED))
        : 0.04;
      domeMatRef.current.emissiveIntensity = glow;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.25, 0]}>
      {/* ── Wide base disc ── */}
      <Cylinder args={[0.3, 0.32, 0.08, 24]} castShadow>
        <meshStandardMaterial
          ref={bodyMatRef}
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={0.04}
          roughness={0.25}
          metalness={0.3}
        />
      </Cylinder>

      {/* ── Tapered stem (narrow cylinder) ── */}
      <Cylinder
        args={[0.1, 0.2, 0.25, 16]}
        position={[0, 0.165, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={0.04}
          roughness={0.3}
          metalness={0.25}
        />
      </Cylinder>

      {/* ── Collar ring ── */}
      <Cylinder
        args={[0.18, 0.14, 0.06, 20]}
        position={[0, 0.32, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.45}
        />
      </Cylinder>

      {/* ── Dome / bishop head ── */}
      <Sphere
        args={[0.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
        position={[0, 0.35, 0]}
        castShadow
      >
        <meshStandardMaterial
          ref={domeMatRef}
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={0.04}
          roughness={0.2}
          metalness={0.35}
        />
      </Sphere>

      {/* ── Tip (small sphere on top for the bishop point) ── */}
      <Sphere args={[0.06, 12, 12]} position={[0, 0.55, 0]} castShadow>
        <meshStandardMaterial
          color="#fef9c3"
          emissive={isActive ? '#fef08a' : '#000000'}
          emissiveIntensity={isActive ? 0.6 : 0}
          roughness={0.15}
          metalness={0.5}
        />
      </Sphere>

      {/* ── Player emoji label ── */}
      <Text
        position={[0, 0.85, 0]}
        fontSize={0.3}
        anchorX="center"
        anchorY="middle"
        // Billboard so it always faces the camera
        rotation={[0, 0, 0]}
      >
        {player.avatarEmoji || '\u{1F396}\u{FE0F}'}
      </Text>

      {/* ── Active player indicator ring ── */}
      {isActive && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.33, 0.38, 32]} />
          <meshStandardMaterial
            color="#facc15"
            emissive="#facc15"
            emissiveIntensity={0.8}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* ── Jail cage ── */}
      {player.isInJail && <JailCage />}
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────
// MAIN EXPORT — renders all player tokens
// ───────────────────────────────────────────────────────────────────

export default function Token3D() {
  const players = useGameStore((s) => s.players);
  const turnOrder = useGameStore((s) => s.turnOrder);
  const currentTurnIndex = useGameStore((s) => s.currentTurnIndex);
  const phase = useGameStore((s) => s.phase);

  // Determine active player id (only during play phases)
  const activePlayerId =
    phase === 'playing' || phase === 'rolling' || phase === 'moving' || phase === 'landed' || phase === 'buying' || phase === 'paying_rent' || phase === 'card' || phase === 'jail_decision'
      ? turnOrder[currentTurnIndex] ?? null
      : null;

  // Group players by tile position for stacking offsets
  const playerGroups = useMemo(() => {
    const groups: Record<number, { player: Player; indexOnTile: number }[]> = {};
    for (const player of players) {
      if (player.isBankrupt) continue; // skip bankrupt players
      const pos = player.position;
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push({ player, indexOnTile: groups[pos].length });
    }
    return groups;
  }, [players]);

  return (
    <group>
      {Object.entries(playerGroups).map(([_pos, entries]) => {
        const tileId = Number(_pos);
        const tilePos = getTilePosition(tileId, BOARD_SIZE);

        return entries.map(({ player, indexOnTile }) => {
          const offset = TILE_OFFSETS[indexOnTile] ?? [0, 0];
          const isActive = player.id === activePlayerId;

          return (
            <group
              key={player.id}
              position={[
                tilePos.x + offset[0],
                0,
                tilePos.z + offset[1],
              ]}
            >
              <TokenShadow />
              <SingleToken
                player={player}
                isActive={isActive}
                indexOnTile={indexOnTile}
              />
            </group>
          );
        });
      })}
    </group>
  );
}