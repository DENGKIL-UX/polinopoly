'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, Stars, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import Board3D from './Board3D';
import Token3D from './Token3D';
import Dice3D from './Dice3D';
import { useGameStore } from '@/lib/game-store';
import { getTilePosition } from '@/lib/game-data';

const BOARD_SIZE = 20;

/* ───────────────────────────────────────────────────────────────────
   CAMERA RIG — smoothly focuses the orbit target on the active
   player or the selected tile. Pauses auto-rotate while the user
   is dragging. (Inspired by itaylayzer/Monopoly property navigation.)
   ─────────────────────────────────────────────────────────────────── */
function CameraRig({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const players = useGameStore((s) => s.players);
  const turnOrder = useGameStore((s) => s.turnOrder);
  const currentTurnIndex = useGameStore((s) => s.currentTurnIndex);
  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const phase = useGameStore((s) => s.phase);

  const focusVec = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Determine the desired focus point
    let target: THREE.Vector3 | null = null;

    if (selectedTileId !== null) {
      const tp = getTilePosition(selectedTileId, BOARD_SIZE);
      target = focusVec.set(tp.x, 0, tp.z);
    } else {
      const activeId = turnOrder[currentTurnIndex];
      const activePlayer = activeId ? players.find((p) => p.id === activeId) : null;
      if (activePlayer && !activePlayer.isBankrupt) {
        const tp = getTilePosition(activePlayer.position, BOARD_SIZE);
        target = focusVec.set(tp.x, 0, tp.z);
      }
    }

    if (target) {
      controls.target.lerp(target, Math.min(delta * 2.2, 1));
      controls.update();
    }
  });

  return null;
}

/* ───────────────────────────────────────────────────────────────────
   GROUND — dark reflective floor that catches shadows & sells the
   "tabletop in space" vibe.
   ─────────────────────────────────────────────────────────────────── */
function Ground() {
  return (
    <>
      {/* Large dark floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]} receiveShadow>
        <circleGeometry args={[45, 64]} />
        <meshStandardMaterial
          color="#080a12"
          roughness={0.55}
          metalness={0.55}
        />
      </mesh>
      {/* Subtle radial glow under the board */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.31, 0]}>
        <circleGeometry args={[14, 48]} />
        <meshStandardMaterial
          color="#1a3a2a"
          transparent
          opacity={0.35}
          emissive="#1a3a2a"
          emissiveIntensity={0.15}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/* ───────────────────────────────────────────────────────────────────
   CLICK-DESELECT — clicking empty space clears the tile selection.
   ─────────────────────────────────────────────────────────────────── */
function ClickDeselect() {
  const selectTile = useGameStore((s) => s.selectTile);
  return (
    <mesh
      visible={false}
      position={[0, -0.3, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        // Only deselect if the background itself was clicked (not a tile)
        if ((e as any).object?.visible === false) {
          e.stopPropagation();
          selectTile(null);
        }
      }}
    >
      <circleGeometry args={[40, 32]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

/* ───────────────────────────────────────────────────────────────────
   SCENE CONTENT (inside Canvas)
   ─────────────────────────────────────────────────────────────────── */
function SceneContent({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const phase = useGameStore((s) => s.phase);
  // Slow the auto-rotate when something actionable is happening
  const busy =
    phase === 'rolling' ||
    phase === 'moving' ||
    phase === 'buying' ||
    phase === 'paying_rent' ||
    phase === 'card';

  return (
    <>
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 32, 75]} />

      <Stars radius={120} depth={60} count={2200} factor={4} fade speed={0.6} />

      {/* Key + fill lighting */}
      <ambientLight intensity={0.42} color="#fef3c7" />
      <directionalLight
        position={[16, 24, 14]}
        intensity={1.15}
        color="#fffaf0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={70}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0008}
      />
      <directionalLight position={[-14, 16, -10]} intensity={0.32} color="#dbeafe" />
      <pointLight position={[0, 9, 0]} intensity={0.4} color="#fef9ef" distance={22} decay={2} />
      {/* Coalition-coloured rim lights for drama */}
      <spotLight position={[12, 6, 12]} angle={0.6} penumbra={1} intensity={0.5} color="#f59e0b" />
      <spotLight position={[-12, 6, -12]} angle={0.6} penumbra={1} intensity={0.4} color="#10b981" />

      <Board3D />
      <Token3D />
      <Dice3D />

      <Ground />
      <ClickDeselect />

      {/* Soft blob shadow beneath the whole board */}
      <ContactShadows
        position={[0, -0.3, 0]}
        opacity={0.45}
        scale={34}
        blur={2.6}
        far={6}
        color="#000000"
      />

      <CameraRig controlsRef={controlsRef} />

      <Environment preset="night" />
    </>
  );
}

/* ───────────────────────────────────────────────────────────────────
   EXPORT
   ─────────────────────────────────────────────────────────────────── */
export default function GameScene() {
  const controlsRef = useRef<any>(null);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  }, []);

  const camera = useMemo(
    () => ({
      position: (isMobile ? [24, 26, 24] : [20, 24, 20]) as [number, number, number],
      fov: isMobile ? 52 : 46,
      near: 0.1,
      far: 220,
    }),
    [isMobile],
  );

  // Touch-friendly: disable right-click context menu on the canvas
  useEffect(() => {
    const handler = (e: Event) => e.preventDefault();
    window.addEventListener('contextmenu', handler);
    return () => window.removeEventListener('contextmenu', handler);
  }, []);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={camera}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => useGameStore.getState().selectTile(null)}
      >
        <SceneContent controlsRef={controlsRef} />
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2.15}
          minDistance={13}
          maxDistance={42}
          autoRotate
          autoRotateSpeed={0.35}
          enableDamping
          dampingFactor={0.08}
          makeDefault
        />
      </Canvas>
    </div>
  );
}
