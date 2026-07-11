'use client';

/**
 * Web Audio API sound effects system for Dewan Rakyat: Pilihan Raya Edition.
 *
 * All sounds are generated programmatically via oscillators and noise buffers —
 * zero external audio files, zero new dependencies.
 *
 * IMPORTANT: This module is client-only. The singleton guards against SSR by
 * lazily creating the AudioContext on first play().
 */

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

/** Create a short noise buffer (white noise) of the given duration. */
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

/** Schedule a sine/triangle/etc. tone and return the oscillator for chaining. */
function tone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startAt: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.25,
): OscillatorNode {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(volume, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
  return osc;
}

// ---------------------------------------------------------------------------
// SoundManager
// ---------------------------------------------------------------------------

class SoundManager {
  private ctx: AudioContext | null = null;
  private _muted = false;
  private _volume = 0.6;

  // -- Lazy AudioContext (must be created after user gesture) ----------------

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Returns a random pitch multiplier in [0.94, 1.06] (±6%).
   * Used to avoid the "machine-gun" effect of identical repeated samples.
   * Inspired by threejs-game-skills game-feel.md audio coupling.
   */
  private pitchVariance(): number {
    return 1 + (Math.random() - 0.5) * 0.12;
  }

  // -- Volume / mute --------------------------------------------------------

  get volume(): number {
    return this._volume;
  }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
  }

  get muted(): boolean {
    return this._muted;
  }
  set muted(m: boolean) {
    this._muted = m;
  }

  /** Returns a destination node that respects master volume & mute. */
  private dest(ctx: AudioContext): AudioNode {
    if (this._muted) {
      // Route into a dead-end gain node at zero
      const silent = ctx.createGain();
      silent.gain.setValueAtTime(0, ctx.currentTime);
      silent.connect(ctx.destination);
      return silent;
    }
    const master = ctx.createGain();
    master.gain.setValueAtTime(this._volume, ctx.currentTime);
    master.connect(ctx.destination);
    return master;
  }

  // -- Sound effects -------------------------------------------------------

  /** Rapid clicking / rolling — short noise bursts simulating dice. */
  playDiceRoll(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;

    // 8 rapid noise bursts over ~200 ms
    const burstCount = 8;
    const burstDuration = 0.025;
    const gap = 0.22 / burstCount;
    const pitch = this.pitchVariance();

    for (let i = 0; i < burstCount; i++) {
      const src = ctx.createBufferSource();
      src.buffer = createNoiseBuffer(ctx, burstDuration);
      src.playbackRate.value = pitch; // pitch variance per roll
      const g = ctx.createGain();
      const t = now + i * gap;
      // Each burst slightly louder then quieter towards the end
      const vol = (i < burstCount / 2 ? 0.35 + i * 0.05 : 0.55 - (i - burstCount / 2) * 0.08) * 0.5;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + burstDuration);

      // Band-pass filter for a more "wooden" click
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2000 + i * 200, t);
      bp.Q.setValueAtTime(1.5, t);

      src.connect(bp);
      bp.connect(g);
      g.connect(out);
      src.start(t);
      src.stop(t + burstDuration + 0.01);
    }
  }

  /** Pleasant "ka-ching" — two quick ascending notes. */
  playBuy(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;
    const pitch = this.pitchVariance();

    // First note — E5 (659 Hz) with pitch variance
    tone(ctx, out, 659 * pitch, now, 0.1, 'sine', 0.3);
    // Second note — G5 (784 Hz) slightly delayed, brighter
    tone(ctx, out, 784 * pitch, now + 0.08, 0.15, 'triangle', 0.35);

    // Add a subtle shimmer (high harmonic)
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1568 * pitch, now + 0.06); // G6
    g.gain.setValueAtTime(0.08, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(g);
    g.connect(out);
    osc.start(now + 0.06);
    osc.stop(now + 0.3);
  }

  /** Low descending "wah wah" sad trombone — two descending tones. */
  playRent(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;
    const pitch = this.pitchVariance();

    // First descending tone: Bb3 → Ab3
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(233 * pitch, now); // Bb3
    osc1.frequency.linearRampToValueAtTime(208 * pitch, now + 0.2); // Ab3
    g1.gain.setValueAtTime(0.18, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(g1);
    g1.connect(out);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second descending tone: G3 → F3
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(196 * pitch, now + 0.18); // G3
    osc2.frequency.linearRampToValueAtTime(175 * pitch, now + 0.38); // F3
    g2.gain.setValueAtTime(0.18, now + 0.18);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(g2);
    g2.connect(out);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.55);
  }

  /** Whoosh / swoosh — filtered noise sweep. */
  playCardDraw(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.3);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(300, now);
    bp.frequency.exponentialRampToValueAtTime(4000, now + 0.12);
    bp.frequency.exponentialRampToValueAtTime(600, now + 0.3);
    bp.Q.setValueAtTime(2, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.4, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(now);
    src.stop(now + 0.35);
  }

  /** Heavy door slam — low frequency thud. */
  playJail(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;

    // Low thud via oscillator
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.3);

    // Noise burst for the "slam" texture
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.08);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.35, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, now);
    noise.connect(lp);
    lp.connect(ng);
    ng.connect(out);
    noise.start(now);
    noise.stop(now + 0.1);

    // Rattle — secondary noise burst
    const rattle = ctx.createBufferSource();
    rattle.buffer = createNoiseBuffer(ctx, 0.15);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.15, now + 0.05);
    rg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(800, now);
    rattle.connect(hp);
    hp.connect(rg);
    rg.connect(out);
    rattle.start(now + 0.05);
    rattle.stop(now + 0.25);
  }

  /** Happy ascending arpeggio C-E-G. */
  playPassGo(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;

    // C5 = 523 Hz
    tone(ctx, out, 523, now, 0.12, 'triangle', 0.3);
    // E5 = 659 Hz
    tone(ctx, out, 659, now + 0.1, 0.12, 'triangle', 0.3);
    // G5 = 784 Hz
    tone(ctx, out, 784, now + 0.2, 0.18, 'triangle', 0.35);

    // Shimmer on top
    const shimmer = ctx.createOscillator();
    const sg = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(1047, now + 0.18); // C6
    sg.gain.setValueAtTime(0.06, now + 0.18);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    shimmer.connect(sg);
    sg.connect(out);
    shimmer.start(now + 0.18);
    shimmer.stop(now + 0.45);
  }

  /** Triumphant fanfare — ascending chord. */
  playGameOver(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;

    // Build-up chord: C4, E4, G4
    const freqs = [262, 330, 392];
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f * 1.5, now + 0.15); // slide up
      osc.frequency.setValueAtTime(f * 1.5, now + 0.15);
      g.gain.setValueAtTime(0.15, now);
      g.gain.linearRampToValueAtTime(0.25, now + 0.15);
      g.gain.setValueAtTime(0.25, now + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(g);
      g.connect(out);
      osc.start(now);
      osc.stop(now + 0.6);
    });

    // Final triumphant octave hit
    const final = ctx.createOscillator();
    const fg = ctx.createGain();
    final.type = 'square';
    final.frequency.setValueAtTime(523, now + 0.15); // C5
    fg.gain.setValueAtTime(0.12, now + 0.15);
    fg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    // Soften the square wave
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(2000, now + 0.15);
    final.connect(lpf);
    lpf.connect(fg);
    fg.connect(out);
    final.start(now + 0.15);
    final.stop(now + 0.55);
  }

  /** Soft click / tap. */
  playEndTurn(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;

    // Very short noise tap
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.04);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3000, now);
    bp.Q.setValueAtTime(3, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(now);
    src.stop(now + 0.06);
  }

  /** Construction hammer — two quick thuds. */
  playBuildHouse(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;

    // Thud helper
    const thud = (startTime: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, startTime);
      osc.frequency.exponentialRampToValueAtTime(60, startTime + 0.08);
      g.gain.setValueAtTime(0.4, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
      osc.connect(g);
      g.connect(out);
      osc.start(startTime);
      osc.stop(startTime + 0.12);

      // Noise texture for impact
      const n = ctx.createBufferSource();
      n.buffer = createNoiseBuffer(ctx, 0.04);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.25, startTime);
      ng.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(800, startTime);
      n.connect(lp);
      lp.connect(ng);
      ng.connect(out);
      n.start(startTime);
      n.stop(startTime + 0.06);
    };

    thud(now);
    thud(now + 0.12);
  }

  /** Cash register — quick high-pitched beep. */
  playSellProperty(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;

    // High beep: E6 (1319 Hz)
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1319, now);
    g.gain.setValueAtTime(0.12, now);
    g.gain.setValueAtTime(0.12, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, now);
    osc.connect(lp);
    lp.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.15);

    // Quick double beep
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1568, now + 0.1); // G6
    g2.gain.setValueAtTime(0.12, now + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    const lp2 = ctx.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.setValueAtTime(3000, now + 0.1);
    osc2.connect(lp2);
    lp2.connect(g2);
    g2.connect(out);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.25);
  }

  /** Auctioneer gavel — sharp crack. */
  playAuction(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;

    // Sharp transient — very short noise burst
    const crack = ctx.createBufferSource();
    crack.buffer = createNoiseBuffer(ctx, 0.06);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.5, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(1200, now);
    crack.connect(hp);
    hp.connect(cg);
    cg.connect(out);
    crack.start(now);
    crack.stop(now + 0.08);

    // Resonant ring
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /** Dramatic descending tone — bankruptcy. */
  playBankruptcy(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;

    // Long descending slide
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.8); // A1
    g.gain.setValueAtTime(0.15, now);
    g.gain.setValueAtTime(0.15, now + 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1500, now);
    lp.frequency.exponentialRampToValueAtTime(200, now + 0.8);
    osc.connect(lp);
    lp.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.85);

    // Dissonant chord sting at the beginning
    const dissonance: [number, OscillatorType][] = [
      [466, 'square'],  // Bb4
      [494, 'square'],  // B4 (minor 2nd clash)
      [523, 'square'],  // C5
    ];
    dissonance.forEach(([f, t]) => {
      const d = ctx.createOscillator();
      const dg = ctx.createGain();
      d.type = t;
      d.frequency.setValueAtTime(f, now);
      d.frequency.exponentialRampToValueAtTime(f * 0.25, now + 0.6);
      dg.gain.setValueAtTime(0.06, now);
      dg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      const dlp = ctx.createBiquadFilter();
      dlp.type = 'lowpass';
      dlp.frequency.setValueAtTime(1200, now);
      dlp.frequency.exponentialRampToValueAtTime(300, now + 0.5);
      d.connect(dlp);
      dlp.connect(dg);
      dg.connect(out);
      d.start(now);
      d.stop(now + 0.55);
    });
  }

  // -- New sounds for added features ----------------------------------------

  playMortgage(): void {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(this._volume * 0.2, now);
    out.connect(ctx.destination);
    // Descending "wah wah" — mortgage is bad
    tone(ctx, out, 440, now, 0.15, 'sawtooth', 0.15);
    tone(ctx, out, 349, now + 0.12, 0.15, 'sawtooth', 0.12);
    tone(ctx, out, 261, now + 0.24, 0.3, 'sawtooth', 0.1);
  }

  playUnmortgage(): void {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(this._volume * 0.25, now);
    out.connect(ctx.destination);
    // Ascending "ding ding ding" — recovering property
    tone(ctx, out, 523, now, 0.15, 'sine', 0.2);
    tone(ctx, out, 659, now + 0.12, 0.15, 'sine', 0.2);
    tone(ctx, out, 784, now + 0.24, 0.25, 'sine', 0.2);
  }

  playAchievement(): void {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(this._volume * 0.3, now);
    out.connect(ctx.destination);
    // Triumphant 4-note fanfare
    tone(ctx, out, 523, now, 0.12, 'square', 0.1);
    tone(ctx, out, 659, now + 0.1, 0.12, 'square', 0.1);
    tone(ctx, out, 784, now + 0.2, 0.12, 'square', 0.1);
    tone(ctx, out, 1047, now + 0.3, 0.4, 'square', 0.12);
  }

  playTradeComplete(): void {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(this._volume * 0.2, now);
    out.connect(ctx.destination);
    // Exchange sound: two tones going opposite directions
    tone(ctx, out, 440, now, 0.2, 'sine', 0.15);
    tone(ctx, out, 880, now + 0.15, 0.2, 'sine', 0.15);
    tone(ctx, out, 660, now + 0.3, 0.15, 'triangle', 0.1);
  }

  playSave(): void {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(this._volume * 0.15, now);
    out.connect(ctx.destination);
    // Soft "blip" — save confirmation
    tone(ctx, out, 880, now, 0.08, 'sine', 0.12);
    tone(ctx, out, 1100, now + 0.06, 0.12, 'sine', 0.1);
  }

  playSpeedChange(): void {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(this._volume * 0.15, now);
    out.connect(ctx.destination);
    // Quick "whoosh"
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.15);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.08, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(2000, now);
    noise.connect(hpf);
    hpf.connect(nGain);
    nGain.connect(out);
    noise.start(now);
    noise.stop(now + 0.2);
  }

  /** Trade proposal — two-note chime (rising then falling, like a doorbell). */
  playTradeProposal(): void {
    const ctx = this.ensureCtx();
    const out = this.dest(ctx);
    const now = ctx.currentTime;
    const pitch = this.pitchVariance();

    // Rising note — G5 (784 Hz)
    tone(ctx, out, 784 * pitch, now, 0.12, 'sine', 0.25);
    // Falling note — C6 (1047 Hz) slightly delayed
    tone(ctx, out, 1047 * pitch, now + 0.1, 0.18, 'sine', 0.25);
    // Soft shimmer
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1568 * pitch, now + 0.08);
    g.gain.setValueAtTime(0.06, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g);
    g.connect(out);
    osc.start(now + 0.08);
    osc.stop(now + 0.32);
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const soundManager = new SoundManager();

// ---------------------------------------------------------------------------
// React hook: useSoundEnabled
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'dewan-rakyat-sound-enabled';

/**
 * Returns `[soundEnabled, toggleSound]`.
 * Persists the user's preference to localStorage.
 * When toggled, also updates the singleton's `muted` property.
 */
export function useSoundEnabled(): [boolean, () => void] {
  const [enabled, setEnabled] = useState<boolean>(() => {
    // SSR guard — default to true on server
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    // Default to enabled if no preference stored
    return stored === null ? true : stored === 'true';
  });

  // Sync to singleton + localStorage on change
  useEffect(() => {
    soundManager.muted = !enabled;
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  return [enabled, toggle];
}