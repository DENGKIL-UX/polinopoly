'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ───────────────────────────────────────────────────────────────────
// SHADER MATERIALS for premium tiles
// Research: threejs-game-skills (ShaderMaterial/TSL patterns)
// ───────────────────────────────────────────────────────────────────

/** Iridescent holographic shader for Jawatan Menteri (government post) tiles */
export function useIridescentMaterial() {
  return useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color('#e0e7ff') },
        uColorB: { value: new THREE.Color('#c084fc') },
        uColorC: { value: new THREE.Color('#fbbf24') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.0);
          float shift = sin(uTime * 0.8 + fresnel * 4.0) * 0.5 + 0.5;
          vec3 col = mix(uColorA, uColorB, shift);
          col = mix(col, uColorC, fresnel * 0.6);
          col += fresnel * 0.4;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, []);
}

/** Shimmering gold shader for Cukai (tax) tiles */
export function useGoldShimmerMaterial() {
  return useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float wave = sin(vUv.x * 8.0 + uTime * 1.5) * 0.5 + 0.5;
          wave *= sin(vUv.y * 6.0 - uTime * 1.2) * 0.5 + 0.5;
          vec3 goldDark = vec3(0.72, 0.45, 0.05);
          vec3 goldBright = vec3(1.0, 0.85, 0.3);
          vec3 col = mix(goldDark, goldBright, wave);
          float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.0);
          col += fresnel * vec3(1.0, 0.9, 0.5);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, []);
}

/** Scrolling Jalur Gemilang pattern shader for the GO/Start corner */
export function useFlagScrollMaterial() {
  return useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        // Jalur Gemilang: 14 alternating red/white stripes + blue canton + crescent/star
        void main() {
          vec2 uv = vUv;
          uv.x += uTime * 0.15;
          float stripe = floor(uv.y * 14.0);
          vec3 stripeColor = mod(stripe, 2.0) < 0.5 ? vec3(0.8, 0.0, 0.0) : vec3(1.0);
          // Blue canton (top-left quarter)
          if (uv.x < 0.4 && uv.y > 0.5) {
            stripeColor = vec3(0.0, 0.145, 0.41);
            // Crescent
            vec2 c = uv - vec2(0.2, 0.75);
            float d = length(c);
            if (d < 0.12 && d > 0.08) stripeColor = vec3(1.0);
            // Star point
            if (length(uv - vec2(0.28, 0.75)) < 0.04) stripeColor = vec3(1.0, 0.85, 0.1);
          }
          gl_FragColor = vec4(stripeColor, 1.0);
        }
      `,
    });
  }, []);
}

/** Hook to animate shader uTime */
export function useShaderAnimation(materials: THREE.ShaderMaterial[]) {
  const ref = useRef(materials);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const m of ref.current) {
      if (m && m.uniforms.uTime) m.uniforms.uTime.value = t;
    }
  });
}

// ───────────────────────────────────────────────────────────────────
// 3D MINIATURES — tiny props that sit on top of special tiles
// ───────────────────────────────────────────────────────────────────

/** Tiny 3D building for property/party HQ tiles */
export function TileBuilding({ color = '#cbd5e1' }: { color?: string }) {
  return (
    <group position={[0, 0.12, 0]} scale={0.5}>
      {/* Base */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[0.5, 0.1, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Roof */}
      <mesh castShadow position={[0, 0.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.4, 0.2, 4]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Tiny train segment for infrastructure (highway) tiles */
export function TileTrain({ color = '#94a3b8' }: { color?: string }) {
  return (
    <group position={[0, 0.08, 0]} scale={0.45}>
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.2, 0.25]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Chimney */}
      <mesh castShadow position={[0.15, 0.18, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Wheels */}
      {[-0.18, 0.18].map((x, i) => (
        <mesh key={i} position={[x, -0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.27, 12]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** Gold coin stack for tax tiles */
export function TileCoinStack() {
  return (
    <group position={[0, 0.06, 0]} scale={0.4}>
      {[0, 0.08, 0.16].map((y, i) => (
        <mesh key={i} castShadow position={[0, y, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.06, 20]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} emissive="#f59e0b" emissiveIntensity={0.1} />
        </mesh>
      ))}
    </group>
  );
}

/** Keris (Malay dagger) standing upright for Jawatan Menteri tiles */
export function TileKeris() {
  return (
    <group position={[0, 0.1, 0]} scale={0.4} rotation={[0, 0, 0.15]}>
      {/* Blade */}
      <mesh castShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[0.04, 0.4, 0.08]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
      </mesh>
      {/* Handle */}
      <mesh castShadow position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.12, 8]} />
        <meshStandardMaterial color="#92400e" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Guard */}
      <mesh castShadow position={[0, 0.09, 0]}>
        <torusGeometry args={[0.07, 0.02, 8, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

/** Card stack for chest/chance tiles */
export function TileCardStack({ color = '#fbbf24' }: { color?: string }) {
  return (
    <group position={[0, 0.06, 0]} scale={0.4} rotation={[0, 0.3, 0]}>
      {[0, 0.03, 0.06].map((y, i) => (
        <mesh key={i} castShadow position={[0, y, 0]} rotation={[0, i * 0.2, 0]}>
          <boxGeometry args={[0.4, 0.02, 0.28]} />
          <meshStandardMaterial color={i === 1 ? '#fff' : color} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** TV/Media monitor for media tiles */
export function TileMonitor() {
  return (
    <group position={[0, 0.12, 0]} scale={0.4}>
      <mesh castShadow>
        <boxGeometry args={[0.45, 0.3, 0.05]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.4, 0.25]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
      {/* Stand */}
      <mesh castShadow position={[0, -0.12, 0]}>
        <boxGeometry args={[0.08, 0.06, 0.05]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}
