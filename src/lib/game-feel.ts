'use client';

/**
 * Game Feel utilities — inspired by threejs-game-skills game-feel.md reference.
 *
 * Trauma-based screenshake, FOV punch, hitstop, squash-and-stretch, and
 * impact flash helpers. These are framework-agnostic and work with R3F.
 *
 * Usage: import the singleton `gameFeel` and call its methods from useFrame
 * or event handlers.
 */

import * as THREE from 'three';

// ─── Easing Functions ──────────────────────────────────────────────────────

export type Easing = (t: number) => number;

export const easeInQuad: Easing = (t) => t * t;
export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutBack: Easing = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeInOutCubic: Easing = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ─── Tween Manager ──────────────────────────────────────────────────────────

interface ActiveTween {
  elapsed: number;
  duration: number;
  easing: Easing;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

export class TweenManager {
  private readonly tweens: ActiveTween[] = [];

  tween(
    durationSec: number,
    onUpdate: (value: number) => void,
    easing: Easing = easeOutCubic,
    onComplete?: () => void,
  ): void {
    this.tweens.push({ elapsed: 0, duration: durationSec, easing, onUpdate, onComplete });
  }

  update(delta: number): void {
    for (let i = this.tweens.length - 1; i >= 0; i -= 1) {
      const t = this.tweens[i];
      t.elapsed += delta;
      const k = Math.min(t.elapsed / t.duration, 1);
      t.onUpdate(t.easing(k));
      if (t.elapsed >= t.duration) {
        t.onComplete?.();
        this.tweens.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.tweens.length = 0;
  }
}

// ─── Trauma-Based Screenshake ────────────────────────────────────────────────

const TRAUMA_MAX = 1;
const TRAUMA_DECAY = 1.4; // trauma units per second
const MAX_OFFSET = 0.35; // world units at full shake (reduced for board game)
const MAX_ROLL = 0.06; // radians at full shake (reduced for board game)

// Deterministic value noise in [-1, 1]; per-axis seed keeps axes independent.
function pseudoNoise(t: number, seed: number): number {
  const x = Math.sin(t * 12.9898 + seed * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

export class ShakeRig {
  private trauma = 0;
  private time = 0;
  private basePosition: THREE.Vector3 | null = null;
  private baseRotationZ = 0;

  addTrauma(amount: number): void {
    this.trauma = Math.min(TRAUMA_MAX, this.trauma + amount);
  }

  /** Call every frame AFTER camera rig has written the base transform. */
  update(delta: number, camera: THREE.PerspectiveCamera): void {
    this.time += delta;
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY * delta);
    if (this.trauma <= 0) return;
    const shake = this.trauma * this.trauma;
    const freq = this.time * 32;
    camera.position.x += MAX_OFFSET * shake * pseudoNoise(freq, 1);
    camera.position.y += MAX_OFFSET * shake * pseudoNoise(freq, 2);
    camera.rotation.z += MAX_ROLL * shake * pseudoNoise(freq, 3);
  }

  get currentTrauma(): number {
    return this.trauma;
  }
}

// ─── FOV Punch ────────────────────────────────────────────────────────────────

export class FovPunch {
  private baseFov: number;
  private fovPunch = 0;

  constructor(baseFov: number) {
    this.baseFov = baseFov;
  }

  punch(degrees: number): void {
    this.fovPunch = Math.min(10, this.fovPunch + degrees);
  }

  update(delta: number, camera: THREE.PerspectiveCamera): void {
    if (this.fovPunch <= 0.001) return;
    this.fovPunch *= Math.exp(-delta / 0.2);
    if (this.fovPunch < 0.001) this.fovPunch = 0;
    camera.fov = this.baseFov + this.fovPunch;
    camera.updateProjectionMatrix();
  }

  reset(fov: number): void {
    this.baseFov = fov;
    this.fovPunch = 0;
  }
}

// ─── Hitstop ────────────────────────────────────────────────────────────────

export class Hitstop {
  private hitstopRemaining = 0;
  private timeScale = 1;

  hitstop(durationMs: number, scale = 0.05): void {
    this.hitstopRemaining = Math.max(this.hitstopRemaining, durationMs / 1000);
    this.timeScale = scale;
  }

  update(delta: number): number {
    if (this.hitstopRemaining > 0) {
      this.hitstopRemaining -= delta; // decay in REAL time
      if (this.hitstopRemaining <= 0) this.timeScale = 1;
    }
    return delta * this.timeScale;
  }

  get isActive(): boolean {
    return this.hitstopRemaining > 0;
  }

  get gameTimeScale(): number {
    return this.timeScale;
  }
}

// ─── Reduced Motion Detection ─────────────────────────────────────────────────

/**
 * Check if the user prefers reduced motion. When true, screenshake and FOV
 * punch are suppressed. Flash overlays are kept but shortened.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// ─── Game Feel Orchestrator (Singleton) ──────────────────────────────────────

class GameFeel {
  readonly tweens = new TweenManager();
  readonly shakeRig = new ShakeRig();
  readonly fovPunch: FovPunch;
  readonly hitstop = new Hitstop();
  private _reducedMotion = false;

  constructor() {
    this.fovPunch = new FovPunch(42); // default, updated when camera mounts
    // Check reduced motion preference on construction
    this._reducedMotion = prefersReducedMotion();
    // Listen for changes (e.g. user toggles setting)
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener?.('change', (e) => { this._reducedMotion = e.matches; });
    }
  }

  get reducedMotion(): boolean {
    return this._reducedMotion;
  }

  /**
   * Update all game feel effects. Call from useFrame with the REAL delta
   * (not the hitstop-scaled delta).
   */
  update(delta: number, camera: THREE.PerspectiveCamera | null): void {
    this.tweens.update(delta);
    if (camera && !this._reducedMotion) {
      this.shakeRig.update(delta, camera);
      this.fovPunch.update(delta, camera);
    }
  }

  // ─── Event Helpers ────────────────────────────────────────────────────────

  /** Dice roll: light shake + FOV punch + whoosh feel */
  onDiceRoll(): void {
    if (this._reducedMotion) return;
    this.shakeRig.addTrauma(0.12);
    this.fovPunch.punch(3);
    rumble(100, 0.3, 0.15);
  }

  /** Property purchased: pickup pop + small shake */
  onPropertyBought(): void {
    if (this._reducedMotion) return;
    this.shakeRig.addTrauma(0.1);
    this.fovPunch.punch(2);
    rumble(120, 0.3, 0.15);
  }

  /** Rent paid: moderate shake + brief hitstop */
  onRentPaid(amount: number): void {
    if (this._reducedMotion) return;
    const trauma = Math.min(0.5, 0.15 + amount / 1000);
    this.shakeRig.addTrauma(trauma);
    if (amount > 200) {
      this.hitstop.hitstop(60, 0.1);
      rumble(180, 0.6, 0.3);
    }
  }

  /** Bankruptcy: heavy shake + long hitstop + FOV punch */
  onBankruptcy(): void {
    if (this._reducedMotion) { flashScreen('#ef4444', 0.3, 100); return; }
    this.shakeRig.addTrauma(0.7);
    this.hitstop.hitstop(90, 0.05);
    this.fovPunch.punch(8);
    rumble(250, 0.9, 0.5);
  }

  /** Monopoly completed: celebration shake + FOV punch */
  onMonopoly(): void {
    if (this._reducedMotion) return;
    this.shakeRig.addTrauma(0.3);
    this.fovPunch.punch(5);
    rumble(150, 0.4, 0.2);
  }

  /** Card drawn: light shake */
  onCardDrawn(): void {
    if (this._reducedMotion) return;
    this.shakeRig.addTrauma(0.08);
  }

  /** Jail: medium shake */
  onJail(): void {
    if (this._reducedMotion) return;
    this.shakeRig.addTrauma(0.25);
    this.fovPunch.punch(3);
  }

  reset(): void {
    this.tweens.clear();
    this.shakeRig.addTrauma(0);
    this.hitstop.hitstop(0);
    this.fovPunch.punch(0);
  }
}

// ─── Gamepad Rumble ───────────────────────────────────────────────────────────

/**
 * Trigger gamepad vibration if supported. Feature-detects vibrationActuator;
 * playEffect returns a promise that may reject on unsupported hardware.
 */
export function rumble(durationMs: number, strong = 0.6, weak = 0.3): void {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  const pads = navigator.getGamepads();
  for (const pad of pads) {
    const actuator = pad?.vibrationActuator;
    if (!actuator) continue;
    try {
      void actuator.playEffect('dual-rumble', {
        duration: durationMs,
        strongMagnitude: strong,
        weakMagnitude: weak,
      });
    } catch {
      // Swallow — unsupported hardware
    }
  }
}

export const gameFeel = new GameFeel();

// ─── Impact Flash Overlay (DOM-based) ─────────────────────────────────────────

/**
 * Creates a full-screen flash overlay div. Cheaper than a render-target flash
 * and never touches the 3D pipeline. Returns a cleanup function.
 */
export function flashScreen(color: string = '#ffffff', peakOpacity: number = 0.5, durationMs: number = 120): () => void {
  if (typeof document === 'undefined') return () => {};
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
    background: ${color};
    opacity: ${peakOpacity};
    transition: opacity ${durationMs}ms ease-out;
  `;
  document.body.appendChild(div);
  // Force reflow
  void div.offsetHeight;
  div.style.opacity = '0';
  const cleanup = () => {
    div.remove();
  };
  setTimeout(cleanup, durationMs + 50);
  return cleanup;
}

// ─── Squash-and-Stretch for Object3D ──────────────────────────────────────────

/**
 * Apply squash-and-stretch to a Three.js Object3D, then overshoot back.
 * Uses the TweenManager so it integrates with the frame loop.
 *
 * @param obj - The Object3D to deform
 * @param squashY - The Y scale at peak squash (< 1 = squash, > 1 = stretch)
 * @param durationSec - Duration of the effect
 */
export function squash(
  obj: THREE.Object3D,
  squashY: number = 0.85,
  durationSec: number = 0.18,
): void {
  const startXZ = 1 / Math.sqrt(squashY); // volume-preserving counter-scale
  gameFeel.tweens.tween(
    durationSec,
    (t) => {
      const y = squashY + (1 - squashY) * t;
      const xz = startXZ + (1 - startXZ) * t;
      obj.scale.set(xz, y, xz);
    },
    easeOutBack,
  );
}

/**
 * Pickup pop: scale up, rise, and fade. Then hide the object.
 */
export function pickupPop(
  mesh: THREE.Mesh,
  material: THREE.MeshStandardMaterial,
  onComplete?: () => void,
): void {
  const startY = mesh.position.y;
  if (material) material.transparent = true;
  gameFeel.tweens.tween(
    0.28,
    (t) => {
      mesh.scale.setScalar(1 + 0.6 * (1 - t));
      mesh.position.y = startY + t * 0.3;
      if (material) material.opacity = 1 - t;
    },
    easeOutCubic,
    () => {
      mesh.visible = false;
      onComplete?.();
    },
  );
}
