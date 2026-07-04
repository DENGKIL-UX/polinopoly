'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars, Float } from '@react-three/drei';
import { useMemo } from 'react';
import Board3D from './Board3D';
import Token3D from './Token3D';

function useIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export default function GameScene() {
  const isMobile = useIsMobile();

  const camera = useMemo(
    () => ({
      position: isMobile ? [22, 28, 22] as const : [18, 22, 18] as const,
      fov: isMobile ? 50 : 45,
      near: 0.1 as const,
      far: 200 as const,
    }),
    [isMobile],
  );

  return (
    <div className="w-full h-full">
      <Canvas
        camera={camera}
        shadows
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a0a0a']} />
        <fog attach="fog" args={['#0a0a0a', 30, 80]} />

        <Stars radius={100} depth={50} count={3000} factor={4} />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[15, 25, 15]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        <Board3D />
        <Token3D />

        <OrbitControls
          enablePan={false}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={12}
          maxDistance={40}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}