'use client';

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere, Cylinder, RoundedBox, Billboard, useTexture } from '@react-three/drei';
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

const FLOAT_AMPLITUDE = 0.1;
const FLOAT_SPEED = 2.0;
const GLOW_SPEED = 3.5;
const GLOW_MIN = 0.15;
const GLOW_MAX = 0.7;

// Movement animation
const HOP_DURATION = 0.22; // seconds per tile hop
const HOP_HEIGHT = 0.9; // arc height

// ───────────────────────────────────────────────────────────────────
// JAIL CAGE
// ───────────────────────────────────────────────────────────────────

function JailCage() {
  return (
    <group position={[0, 0.35, 0]}>
      <mesh>
        <torusGeometry args={[0.32, 0.02, 6, 16]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, -0.35, 0]}>
        <torusGeometry args={[0.32, 0.02, 6, 16]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * 0.32;
        const z = Math.sin(angle) * 0.32;
        return (
          <mesh key={i} position={[x, -0.175, z]}>
            <cylinderGeometry args={[0.015, 0.015, 0.7, 6]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.35} metalness={0.6} />
          </mesh>
        );
      })}
      <mesh position={[0.32, 0.0, 0]}>
        <boxGeometry args={[0.08, 0.1, 0.06]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0.32, 0.08, 0]}>
        <torusGeometry args={[0.03, 0.012, 6, 12]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────
// SHADOW — flat dark disc beneath each token
// ───────────────────────────────────────────────────────────────────

function TokenShadow({ y = 0.16 }: { y?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
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
// TOKEN LOGO — billboarded coalition logo floating above the token
// ───────────────────────────────────────────────────────────────────

function TokenLogo({ coalitionId }: { coalitionId: string }) {
  const coalition = COALITIONS[coalitionId];
  const logoPath = coalition?.logo;

  const texture = useTexture(logoPath || '/logo.svg', (tex) => {
    (tex as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
  });

  if (!logoPath) {
    // Independent — show emoji text
    return (
      <Text position={[0, 0.85, 0]} fontSize={0.3} anchorX="center" anchorY="middle">
        {coalition?.emblem || '🎖️'}
      </Text>
    );
  }

  return (
    <Billboard position={[0, 0.95, 0]}>
      {/* White rounded backing disc */}
      <mesh>
        <circleGeometry args={[0.26, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.05} />
      </mesh>
      {/* Logo texture */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[0.22, 32]} />
        <meshStandardMaterial
          map={texture}
          transparent
          roughness={0.5}
          metalness={0.05}
        />
      </mesh>
    </Billboard>
  );
}

// ───────────────────────────────────────────────────────────────────
// SINGLE TOKEN — with tile-to-tile hopping movement
// ───────────────────────────────────────────────────────────────────

interface SingleTokenProps {
  player: Player;
  isActive: boolean;
  indexOnTile: number;
}

function SingleToken({ player, isActive, indexOnTile }: SingleTokenProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const shadowRef = useRef<THREE.Group>(null!);
  const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const domeMatRef = useRef<THREE.MeshStandardMaterial>(null!);

  const coalition = COALITIONS[player.coalitionId];
  const color = coalition?.color ?? '#78716c';
  const emissiveColor = color;

  // ── Movement animation state ──
  // The token renders at `renderedTile`, lerping through a path of hops toward `player.position`.
  const pathRef = useRef<number[]>([]); // remaining tiles to hop through
  const hopProgress = useRef(0); // 0..1 for the current hop
  const renderedTile = useRef(player.position); // tile the token is currently sitting on / leaving
  const lastPlayerPos = useRef(player.position);

  // When player.position changes, build a forward path of hops.
  useEffect(() => {
    if (player.position === lastPlayerPos.current) return;
    const from = lastPlayerPos.current;
    const to = player.position;
    const steps = (to - from + 40) % 40; // forward distance
    const newPath: number[] = [];
    for (let i = 1; i <= steps; i++) {
      newPath.push((from + i) % 40);
    }
    if (newPath.length > 0) {
      pathRef.current = newPath;
      hopProgress.current = 0;
    }
    lastPlayerPos.current = player.position;
  }, [player.position]);

  const phaseOffset = player.name.charCodeAt(0) * 0.7 + indexOnTile * 1.1;

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    // ── Resolve current world position ──
    let currentTile: number;
    let hopY = 0;
    const path = pathRef.current;

    if (path.length > 0) {
      // Advance hop progress
      hopProgress.current += delta / HOP_DURATION;
      while (hopProgress.current >= 1 && path.length > 0) {
        hopProgress.current -= 1;
        renderedTile.current = path.shift()!;
      }
      if (path.length === 0) {
        hopProgress.current = 0;
        currentTile = renderedTile.current;
      } else {
        currentTile = renderedTile.current;
        const nextTile = path[0];
        const p = hopProgress.current; // 0..1
        const fromPos = getTilePosition(currentTile, BOARD_SIZE);
        const toPos = getTilePosition(nextTile, BOARD_SIZE);
        const x = fromPos.x + (toPos.x - fromPos.x) * p;
        const z = fromPos.z + (toPos.z - fromPos.z) * p;
        hopY = Math.sin(p * Math.PI) * HOP_HEIGHT;
        groupRef.current.position.x = x;
        groupRef.current.position.z = z;
        // face the direction of travel
        const dx = toPos.x - fromPos.x;
        const dz = toPos.z - fromPos.z;
        if (Math.abs(dx) + Math.abs(dz) > 0.0001) {
          const targetRot = Math.atan2(dx, dz);
          groupRef.current.rotation.y = THREE.MathUtils.lerp(
            groupRef.current.rotation.y,
            targetRot,
            Math.min(delta * 8, 1),
          );
        }
      }
    }

    if (path.length === 0) {
      // Idle — sit on the rendered tile
      const pos = getTilePosition(renderedTile.current, BOARD_SIZE);
      groupRef.current.position.x += (pos.x - groupRef.current.position.x) * Math.min(delta * 10, 1);
      groupRef.current.position.z += (pos.z - groupRef.current.position.z) * Math.min(delta * 10, 1);
      currentTile = renderedTile.current;
    }

    // Floating bob + hop arc
    const floatY = 0.25 + Math.sin(t * FLOAT_SPEED + phaseOffset) * FLOAT_AMPLITUDE;
    groupRef.current.position.y = floatY + hopY;

    // Shadow follows underneath (stays on ground, scales with hop height)
    if (shadowRef.current) {
      shadowRef.current.position.x = groupRef.current.position.x;
      shadowRef.current.position.z = groupRef.current.position.z;
      const shrink = 1 - Math.min(hopY / (HOP_HEIGHT * 1.4), 0.5);
      shadowRef.current.scale.setScalar(shrink);
    }

    // Emissive glow for active player
    const glow = isActive
      ? GLOW_MIN + (GLOW_MAX - GLOW_MIN) * (0.5 + 0.5 * Math.sin(t * GLOW_SPEED))
      : 0.04;
    if (bodyMatRef.current) bodyMatRef.current.emissiveIntensity = glow;
    if (domeMatRef.current) domeMatRef.current.emissiveIntensity = glow;
  });

  return (
    <>
      <group ref={shadowRef} position={[0, 0, 0]}>
        <TokenShadow y={0.16} />
      </group>
      <group ref={groupRef} position={[0, 0.25, 0]}>
        {/* Wide base disc */}
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

        {/* Tapered stem */}
        <Cylinder args={[0.1, 0.2, 0.25, 16]} position={[0, 0.165, 0]} castShadow>
          <meshStandardMaterial
            color={color}
            emissive={emissiveColor}
            emissiveIntensity={0.04}
            roughness={0.3}
            metalness={0.25}
          />
        </Cylinder>

        {/* Collar ring */}
        <Cylinder args={[0.18, 0.14, 0.06, 20]} position={[0, 0.32, 0]} castShadow>
          <meshStandardMaterial color={color} roughness={0.2} metalness={0.45} />
        </Cylinder>

        {/* Dome / bishop head */}
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

        {/* Tip */}
        <Sphere args={[0.06, 12, 12]} position={[0, 0.55, 0]} castShadow>
          <meshStandardMaterial
            color="#fef9c3"
            emissive={isActive ? '#fef08a' : '#000000'}
            emissiveIntensity={isActive ? 0.6 : 0}
            roughness={0.15}
            metalness={0.5}
          />
        </Sphere>

        {/* Coalition logo label — billboarded, always faces camera */}
        <Suspense fallback={null}>
          <TokenLogo coalitionId={player.coalitionId} />
        </Suspense>

        {/* Active player indicator ring */}
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

        {player.isInJail && <JailCage />}
      </group>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ───────────────────────────────────────────────────────────────────

export default function Token3D() {
  const players = useGameStore((s) => s.players);
  const turnOrder = useGameStore((s) => s.turnOrder);
  const currentTurnIndex = useGameStore((s) => s.currentTurnIndex);
  const phase = useGameStore((s) => s.phase);

  const activePlayerId =
    phase === 'playing' ||
    phase === 'rolling' ||
    phase === 'moving' ||
    phase === 'landed' ||
    phase === 'buying' ||
    phase === 'paying_rent' ||
    phase === 'card' ||
    phase === 'jail_decision'
      ? turnOrder[currentTurnIndex] ?? null
      : null;

  // Group players by tile position for stacking offsets — BUT only for idle tokens.
  // Moving tokens (renderedTile ≠ player.position mid-animation) are positioned by
  // their own useFrame, so we always render one group per non-bankrupt player.
  const idleGroups = useMemo(() => {
    const groups: Record<number, { player: Player; indexOnTile: number }[]> = {};
    for (const player of players) {
      if (player.isBankrupt) continue;
      const pos = player.position;
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push({ player, indexOnTile: groups[pos].length });
    }
    return groups;
  }, [players]);

  return (
    <group>
      {players
        .filter((p) => !p.isBankrupt)
        .map((player) => {
          // Use the idle-group index for stacking offset
          const tileGroup = idleGroups[player.position] || [];
          const idx = tileGroup.findIndex((e) => e.player.id === player.id);
          const indexOnTile = idx === -1 ? 0 : idx;
          const offset = TILE_OFFSETS[indexOnTile] ?? [0, 0];
          const isActive = player.id === activePlayerId;
          const tilePos = getTilePosition(player.position, BOARD_SIZE);

          return (
            <group
              key={player.id}
              position={[tilePos.x + offset[0], 0, tilePos.z + offset[1]]}
            >
              <SingleToken player={player} isActive={isActive} indexOnTile={indexOnTile} />
            </group>
          );
        })}
    </group>
  );
}
