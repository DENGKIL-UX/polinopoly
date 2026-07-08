'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';
import { useGameStore } from '@/lib/game-store';

// ───────────────────────────────────────────────────────────────────
// GAME MUSIC PLAYER — loops uploaded Monopoly board music
// Toggle on/off (default: On). Persists preference to localStorage.
// ───────────────────────────────────────────────────────────────────

const MUSIC_SRC = '/game-music.mp3';
const STORAGE_KEY = 'polinopoly-music-enabled';

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const phase = useGameStore((s) => s.phase);
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  });

  // Play/pause based on enabled state + game phase
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Only play music during the game (not lobby)
    const shouldPlay = enabled && phase !== 'lobby';

    if (shouldPlay) {
      audio.volume = 0.35;
      audio.play().then(() => {
        queueMicrotask(() => setIsPlaying(true));
      }).catch(() => {
        queueMicrotask(() => setIsPlaying(false));
      });
    } else {
      audio.pause();
      queueMicrotask(() => setIsPlaying(false));
    }
  }, [enabled, phase]);

  // Handle user interaction to bypass autoplay restrictions
  useEffect(() => {
    const handleInteraction = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (enabled && phase !== 'lobby' && audio.paused) {
        audio.volume = 0.35;
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };
    document.addEventListener('click', handleInteraction, { once: true });
    return () => document.removeEventListener('click', handleInteraction);
  }, [enabled, phase]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <>
      <audio
        ref={audioRef}
        src={MUSIC_SRC}
        loop
        preload="auto"
      />
      <button
        onClick={toggle}
        className="fixed bottom-3 left-3 z-[60] flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-900/80 border border-slate-600/40 backdrop-blur-md text-xs font-medium text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition-colors shadow-lg"
        title={enabled ? 'Mute music' : 'Play music'}
        aria-label={enabled ? 'Mute music' : 'Play music'}
      >
        {enabled ? (
          <Volume2 className={`h-3.5 w-3.5 ${isPlaying ? 'animate-pulse text-amber-400' : ''}`} />
        ) : (
          <VolumeX className="h-3.5 w-3.5" />
        )}
        <Music className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {enabled ? (isPlaying ? 'Music On' : 'Loading...') : 'Music Off'}
        </span>
      </button>
    </>
  );
}
