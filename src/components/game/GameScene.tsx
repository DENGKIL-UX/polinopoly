'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, ContactShadows, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { RotateCw } from 'lucide-react';
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

    // Default: keep the board centered so all 40 tiles stay visible & readable.
    // Only pull focus toward a tile when the user explicitly selects one.
    let target: THREE.Vector3;

    if (selectedTileId !== null) {
      const tp = getTilePosition(selectedTileId, BOARD_SIZE);
      target = focusVec.set(tp.x, 0, tp.z);
    } else {
      // Stay centered on the board
      target = focusVec.set(0, 0, 0);
    }

    controls.target.lerp(target, Math.min(delta * 2.5, 1));
    controls.update();
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

      {/* Key + fill lighting — soft and even so tile text stays readable.
          High ambient + gentle directional; removed the harsh colored spot
          lights and overhead point light that caused glare/bloom washout. */}
      <ambientLight intensity={0.85} color="#fef3c7" />
      <directionalLight
        position={[16, 28, 14]}
        intensity={0.6}
        color="#fffaf0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={80}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0008}
      />
      <directionalLight position={[-14, 20, -10]} intensity={0.35} color="#dbeafe" />

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

      {/* Environment preset removed — was fetching dikhololo_night_1k.hdr from
          CDN which fails offline. Using hemisphere light for ambient fill instead. */}
      <hemisphereLight args={['#fef3c7', '#1a3d2a', 0.4]} />

      {/* ── Post-processing: Bloom + Vignette + ACES tone mapping ──
          Bloom kept subtle (low intensity, high threshold) so only the
          brightest emissive elements (light beams, particle sparks) glow —
          NOT the tile text/surfaces which must stay crisp and readable. */}
      <EffectComposer multisampling={4}>
        <Bloom
          intensity={0.35}
          luminanceThreshold={0.7}
          luminanceSmoothing={0.3}
          mipmapBlur
          radius={0.5}
        />
        <Vignette eskil={false} offset={0.3} darkness={0.5} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}

/* ───────────────────────────────────────────────────────────────────
   EXPORT
   ─────────────────────────────────────────────────────────────────── */
export default function GameScene() {
  const controlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(false);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  }, []);

  const camera = useMemo(
    () => ({
      // Nearly top-down so flat tile text isn't foreshortened and stays readable
      position: (isMobile ? [16, 34, 16] : [13, 33, 13]) as [number, number, number],
      fov: isMobile ? 52 : 42,
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
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.95,
        }}
        onPointerMissed={() => useGameStore.getState().selectTile(null)}
      >
        <SceneContent controlsRef={controlsRef} />
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2.4}
          minDistance={16}
          maxDistance={48}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          enableDamping
          dampingFactor={0.08}
          makeDefault
        />
      </Canvas>

      {/* Auto-rotate toggle button (default Off) */}
      <button
        onClick={() => setAutoRotate((v) => !v)}
        className="absolute bottom-3 right-3 z-[60] flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-900/80 border border-slate-600/40 backdrop-blur-md text-xs font-medium text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition-colors shadow-lg"
        title={autoRotate ? 'Stop auto-rotate' : 'Start auto-rotate'}
      >
        <RotateCw className={`h-3.5 w-3.5 ${autoRotate ? 'animate-spin text-amber-400' : ''}`} style={autoRotate ? { animationDuration: '2s' } : {}} />
        <span className="hidden sm:inline">{autoRotate ? 'Rotate On' : 'Rotate Off'}</span>
      </button>
    </div>
  );
}
