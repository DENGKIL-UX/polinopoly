'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/lib/game-store';

// ───────────────────────────────────────────────────────────────────
// 3D DICE — tumbling physics-inspired animation
// Research source: elena-pan/Unity-Monopoly (3D dice in browser)
// ───────────────────────────────────────────────────────────────────

const DICE_SIZE = 1.4;
const PIP_RADIUS = 0.12;

// Pip layout on a 3×3 grid (offsets from face centre)
const PIP_GRID: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.2, 0.2], [0.2, -0.2]],
  3: [[-0.2, 0.2], [0, 0], [0.2, -0.2]],
  4: [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]],
  5: [[-0.2, 0.2], [0.2, 0.2], [0, 0], [-0.2, -0.2], [0.2, -0.2]],
  6: [[-0.2, 0.2], [0.2, 0.2], [-0.2, 0], [0.2, 0], [-0.2, -0.2], [0.2, -0.2]],
};

/**
 * Target Euler rotation (radians) that brings the requested value face-up (+Y).
 * Standard die: opposite faces sum to 7.
 *   +Y=1, -Y=6, +X=2, -X=5, +Z=3, -Z=4
 */
const FACE_ROTATION: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  6: [Math.PI, 0, 0],
  2: [0, 0, -Math.PI / 2],
  5: [0, 0, Math.PI / 2],
  3: [-Math.PI / 2, 0, 0],
  4: [Math.PI / 2, 0, 0],
};

interface DieProps {
  value: number | null;
  rolling: boolean;
  position: [number, number, number];
  spinSeed: number; // unique tumbling axis per die
}

function Die({ value, rolling, position, spinSeed }: DieProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const innerRef = useRef<THREE.Group>(null!);

  // Reusable target quaternions
  const tumbleAxis = useMemo(() => {
    const a = new THREE.Vector3(
      Math.sin(spinSeed * 1.3),
      Math.cos(spinSeed * 2.1),
      Math.sin(spinSeed * 0.7),
    ).normalize();
    return a;
  }, [spinSeed]);

  // Track settle progress
  const settleRef = useRef(0); // 0 = tumbling, 1 = settled
  const tumbleSpeed = useRef(0);

  useFrame((_, delta) => {
    const grp = groupRef.current;
    const inner = innerRef.current;
    if (!grp || !inner) return;

    if (rolling) {
      // Ramp up spin
      settleRef.current = 0;
      tumbleSpeed.current = Math.min(tumbleSpeed.current + delta * 6, 14);
      inner.rotateOnAxis(tumbleAxis, delta * tumbleSpeed.current);
      // bob the die up while rolling
      grp.position.y = position[1] + Math.abs(Math.sin(performance.now() / 120)) * 0.6;
      grp.rotation.z = Math.sin(performance.now() / 90) * 0.15;
    } else {
      // Decelerate and settle to the target face
      tumbleSpeed.current = Math.max(tumbleSpeed.current - delta * 8, 0);
      if (tumbleSpeed.current > 0.1) {
        inner.rotateOnAxis(tumbleAxis, delta * tumbleSpeed.current);
      } else if (value) {
        // Lerp inner rotation to the target face rotation
        const target = FACE_ROTATION[value];
        const targetQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(target[0], target[1], target[2]),
        );
        inner.quaternion.slerp(targetQuat, Math.min(delta * 6, 1));
      }
      // Ease position back down
      grp.position.y += (position[1] - grp.position.y) * Math.min(delta * 5, 1);
      grp.rotation.z += (0 - grp.rotation.z) * Math.min(delta * 5, 1);
    }
  });

  // Pips — one group per face, oriented outward
  const faces: { axis: [number, number, number]; value: number; rot: [number, number, number] }[] = [
    { axis: [0, 1, 0], value: 1, rot: [0, 0, 0] }, // +Y top
    { axis: [0, -1, 0], value: 6, rot: [Math.PI, 0, 0] }, // -Y bottom
    { axis: [1, 0, 0], value: 2, rot: [0, 0, -Math.PI / 2] }, // +X right
    { axis: [-1, 0, 0], value: 5, rot: [0, 0, Math.PI / 2] }, // -X left
    { axis: [0, 0, 1], value: 3, rot: [Math.PI / 2, 0, 0] }, // +Z front
    { axis: [0, 0, -1], value: 4, rot: [-Math.PI / 2, 0, 0] }, // -Z back
  ];

  return (
    <group ref={groupRef} position={position}>
      <group ref={innerRef}>
        <RoundedBox args={[DICE_SIZE, DICE_SIZE, DICE_SIZE]} radius={0.09} smoothness={5} castShadow>
          <meshStandardMaterial
            color="#fefefe"
            roughness={0.32}
            metalness={0.08}
            emissive="#fff7e6"
            emissiveIntensity={0.06}
          />
        </RoundedBox>

        {faces.map((f, fi) => {
          const pips = PIP_GRID[f.value];
          const surface = DICE_SIZE / 2 + 0.002;
          return (
            <group
              key={fi}
              position={[f.axis[0] * surface, f.axis[1] * surface, f.axis[2] * surface]}
              rotation={f.rot}
            >
              {pips.map((p, pi) => (
                <mesh key={pi} position={[p[0], 0, p[1]]} castShadow>
                  <sphereGeometry args={[PIP_RADIUS, 14, 14]} />
                  <meshStandardMaterial color="#1e1b2e" roughness={0.4} metalness={0.2} />
                </mesh>
              ))}
            </group>
          );
        })}
      </group>
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────
// DICE TRAY — two dice floating over the board centre
// ───────────────────────────────────────────────────────────────────

export default function Dice3D() {
  const diceValues = useGameStore((s) => s.diceValues);
  const phase = useGameStore((s) => s.phase);
  const rolling = phase === 'rolling';

  const v1 = diceValues?.[0] ?? 1;
  const v2 = diceValues?.[1] ?? 1;

  return (
    <group position={[0, 1.8, 0]}>
      <Die value={v1} rolling={rolling} position={[-1.1, 0, 0]} spinSeed={1.7} />
      <Die value={v2} rolling={rolling} position={[1.1, 0, 0]} spinSeed={4.2} />

      {/* Soft glow disc beneath the dice */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
        <circleGeometry args={[3.2, 48]} />
        <meshStandardMaterial
          color="#facc15"
          transparent
          opacity={rolling ? 0.22 : 0.1}
          emissive="#facc15"
          emissiveIntensity={rolling ? 0.5 : 0.15}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
