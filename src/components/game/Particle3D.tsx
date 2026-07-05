'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ───────────────────────────────────────────────────────────────────
// LIGHTWEIGHT PARTICLE SYSTEM — confetti, sparks, smoke bursts
// (Custom implementation; avoids the three.quarks bundle overhead.)
// ───────────────────────────────────────────────────────────────────

export type ParticleType = 'confetti' | 'sparks' | 'smoke' | 'claim';

interface ParticleBurstProps {
  position: [number, number, number];
  type: ParticleType;
  color?: string;
  color2?: string;
  autoStart?: boolean;
}

const PARTICLE_CONFIG: Record<ParticleType, {
  count: number;
  speed: number;
  spread: number;
  gravity: number;
  lifeMs: number;
  size: number;
  rise: boolean;
}> = {
  confetti: { count: 40, speed: 4, spread: 1, gravity: -6, lifeMs: 1500, size: 0.09, rise: false },
  sparks:   { count: 30, speed: 5, spread: 0.6, gravity: -3, lifeMs: 800, size: 0.06, rise: false },
  smoke:    { count: 20, speed: 1.5, spread: 0.8, gravity: 1.5, lifeMs: 2000, size: 0.18, rise: true },
  claim:    { count: 25, speed: 3, spread: 0.5, gravity: -2, lifeMs: 1200, size: 0.1, rise: true },
};

interface BurstInstance {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  startMs: number;
  life: number;
  size: number;
}

let nextId = 0;

export function ParticleBurst({ position, type, color = '#facc15', color2, autoStart = true }: ParticleBurstProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const idRef = useRef(nextId++);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const cfg = PARTICLE_CONFIG[type];

  const instances = useMemo<BurstInstance[]>(() => {
    const arr: BurstInstance[] = [];
    const c1 = new THREE.Color(color);
    const c2 = new THREE.Color(color2 || color);
    for (let i = 0; i < cfg.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const upBias = cfg.rise ? Math.random() : Math.random() * 0.7 + 0.3;
      const r = Math.random() * cfg.spread;
      arr.push({
        pos: new THREE.Vector3(position[0], position[1], position[2]),
        vel: new THREE.Vector3(
          Math.cos(angle) * cfg.speed * (0.5 + Math.random() * 0.5),
          cfg.speed * upBias,
          Math.sin(angle) * cfg.speed * (0.5 + Math.random() * 0.5),
        ),
        color: c1.clone().lerp(c2, Math.random()),
        startMs: performance.now() + (autoStart ? 0 : 99999),
        life: cfg.lifeMs,
        size: cfg.size * (0.7 + Math.random() * 0.6),
      });
    }
    return arr;
  }, [type, color, color2, cfg.count, cfg.spread, cfg.speed, position[0], position[1], position[2]]);

  const geometry = useMemo(() => {
    if (type === 'confetti') return new THREE.PlaneGeometry(1, 1);
    if (type === 'smoke') return new THREE.SphereGeometry(0.5, 8, 6);
    return new THREE.SphereGeometry(0.5, 6, 4);
  }, [type]);

  const material = useMemo(() => {
    if (type === 'smoke') {
      return new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
    }
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
  }, [type]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = performance.now();
    let visible = 0;
    for (let i = 0; i < instances.length; i++) {
      const p = instances[i];
      const elapsed = now - p.startMs;
      if (elapsed < 0 || elapsed > p.life) {
        dummy.scale.setScalar(0);
        dummy.position.set(9999, 9999, 9999);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const t = elapsed / 1000;
      // Physics integration
      p.pos.x = position[0] + p.vel.x * t;
      p.pos.y = position[1] + p.vel.y * t + 0.5 * cfg.gravity * t * t;
      p.pos.z = position[2] + p.vel.z * t;
      const lifeRatio = elapsed / p.life;
      const scale = p.size * (1 - lifeRatio * 0.5);
      const opacity = type === 'smoke' ? 0.4 * (1 - lifeRatio) : 1 - lifeRatio;
      dummy.position.copy(p.pos);
      if (type === 'confetti') {
        dummy.rotation.set(t * 6, t * 8, t * 4);
      }
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      tmpColor.copy(p.color);
      tmpColor.multiplyScalar(opacity);
      mesh.setColorAt(i, tmpColor);
      visible++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = instances.length;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, cfg.count]}
      frustumCulled={false}
    />
  );
}

// ───────────────────────────────────────────────────────────────────
// LANDING SHOCKWAVE — expanding ring on the tile surface
// ───────────────────────────────────────────────────────────────────

export function Shockwave({ position, color = '#facc15', duration = 800 }: {
  position: [number, number, number];
  color?: string;
  duration?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const startRef = useRef(performance.now());

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const elapsed = performance.now() - startRef.current;
    const t = elapsed / duration;
    if (t > 1) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const scale = 0.5 + t * 3.5;
    mesh.scale.setScalar(scale);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = (1 - t) * 0.8;
  });

  return (
    <mesh ref={ref} position={[position[0], position[1] + 0.02, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.5, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

// ───────────────────────────────────────────────────────────────────
// VERTICAL LIGHT BEAM — shoots up from a landed tile
// ───────────────────────────────────────────────────────────────────

export function LightBeam({ position, color = '#facc15', height = 4 }: {
  position: [number, number, number];
  color?: string;
  height?: number;
}) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);
  const startRef = useRef(performance.now());

  useFrame(() => {
    if (!matRef.current) return;
    const elapsed = performance.now() - startRef.current;
    const t = (elapsed % 1200) / 1200;
    matRef.current.opacity = 0.15 + Math.sin(t * Math.PI * 2) * 0.1;
  });

  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]}>
      <cylinderGeometry args={[0.35, 0.6, height, 16, 1, true]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
