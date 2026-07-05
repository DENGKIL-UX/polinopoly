'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/lib/game-store';

// ───────────────────────────────────────────────────────────────────
// 3D PARLIAMENT BUILDING (Dewan Rakyat) — low-poly centerpiece
// Replaces the empty center area. Pulses when a Jawatan Menteri
// tile is landed on.
// ───────────────────────────────────────────────────────────────────

export function Parliament3D() {
  const groupRef = useRef<THREE.Group>(null!);
  const domeMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const beamMatRef = useRef<THREE.MeshBasicMaterial>(null!);

  const phase = useGameStore((s) => s.phase);
  const lastLog = useGameStore((s) => s.gameLog[s.gameLog.length - 1]);
  // Pulse when a government-post tile (JPM) or card is drawn
  const pulseRef = useRef(0);
  const lastLogId = useRef('');

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    // Slow rotation
    groupRef.current.rotation.y = t * 0.08;

    // Detect new "Jawatan Menteri" log entry → pulse
    if (lastLog && lastLog.id !== lastLogId.current) {
      lastLogId.current = lastLog.id;
      if (lastLog.message?.includes('Jawatan') || lastLog.message?.includes('Peti Khazanah') || lastLog.type === 'card') {
        pulseRef.current = 1;
      }
    }
    pulseRef.current = Math.max(0, pulseRef.current - delta * 0.8);

    // Emissive pulse
    const pulse = pulseRef.current;
    const baseGlow = 0.08 + Math.sin(t * 0.8) * 0.04;
    if (domeMatRef.current) {
      domeMatRef.current.emissiveIntensity = baseGlow + pulse * 0.6;
    }
    if (beamMatRef.current) {
      beamMatRef.current.opacity = 0.1 + pulse * 0.4 + Math.sin(t * 2) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.05, 0]} scale={0.45}>
      {/* ── Main platform base ── */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.2, 3.4, 0.1, 8]} />
        <meshStandardMaterial color="#6b7280" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* ── Steps around the base ── */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[3.6, 3.7, 0.04, 8]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.7} />
      </mesh>

      {/* ── Building body (octagonal drum) ── */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.2, 2.4, 0.8, 8]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* ── Columns around the drum ── */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const x = Math.cos(angle) * 2.3;
        const z = Math.sin(angle) * 2.3;
        return (
          <mesh key={i} position={[x, 0.5, z]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.9, 12]} />
            <meshStandardMaterial color="#f3f4f6" roughness={0.4} metalness={0.05} />
          </mesh>
        );
      })}

      {/* ── Upper tier ── */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[1.8, 2.0, 0.4, 8]} />
        <meshStandardMaterial color="#d1d5db" roughness={0.5} />
      </mesh>

      {/* ── Dome (the iconic Malaysian Parliament dome) ── */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[1.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          ref={domeMatRef}
          color="#3b82f6"
          roughness={0.2}
          metalness={0.6}
          emissive="#1d4ed8"
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* ── Dome ribs (gold) ── */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[0, 1.6, 0]} rotation={[0, angle, 0]}>
            <torusGeometry args={[1.4, 0.025, 6, 16, Math.PI / 2]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} />
          </mesh>
        );
      })}

      {/* ── Spire on top ── */}
      <mesh position={[0, 3.0, 0]} castShadow>
        <coneGeometry args={[0.08, 0.8, 8]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, 2.55, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} emissive="#f59e0b" emissiveIntensity={0.2} />
      </mesh>

      {/* ── Vertical light beam from the dome ── */}
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.3, 0.1, 3, 16, 1, true]} />
        <meshBasicMaterial
          ref={beamMatRef}
          color="#fbbf24"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* ── "DEWAN RAKYAT" label on the building base ── */}
      <Text
        position={[0, 0.15, 3.3]}
        fontSize={0.22}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#1e293b"
      >
        DEWAN RAKYAT
      </Text>

      {/* ── Decorative gold ring on the ground ── */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.7, 3.85, 64]} />
        <meshStandardMaterial
          color="#fbbf24"
          metalness={0.8}
          roughness={0.2}
          emissive="#f59e0b"
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}
