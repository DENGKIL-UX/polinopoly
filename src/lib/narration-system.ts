'use client';

import { useState, useCallback, useRef } from 'react';
import { NARRATIONS, type Narration } from '@/lib/narrations';

// ───────────────────────────────────────────────────────────────────
// NARRATION SYSTEM — political soap opera pop-ups during AI turns
// Randomly displays Malaysian political satire narrations based on
// the current game event (buy, skip, jail, penalty, etc.)
// ───────────────────────────────────────────────────────────────────

export type NarrationCategory =
  | 'ai_thinking'
  | 'buy'
  | 'skip'
  | 'penalty'
  | 'jail'
  | 'rent'
  | 'monopoly'
  | 'auction'
  | 'card'
  | 'pass_go'
  | 'general';

let narrationId = 0;

/**
 * Get a random narration for a given category.
 * Falls back to 'general' if no entries found for the category.
 */
export function getRandomNarration(category: NarrationCategory): Narration | null {
  const pool = NARRATIONS.filter((n) => n.category === category);
  if (pool.length === 0) {
    const general = NARRATIONS.filter((n) => n.category === 'general');
    if (general.length === 0) return null;
    return general[Math.floor(Math.random() * general.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Hook for managing narration pop-ups in the UI.
 * Returns the current narration and a function to trigger a new one.
 */
export function useNarration() {
  const [currentNarration, setCurrentNarration] = useState<Narration | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCategoryRef = useRef<string>('');

  const showNarration = useCallback((category: NarrationCategory, customText?: string) => {
    // Don't show the same category twice in a row (variety)
    if (lastCategoryRef.current === category && Math.random() < 0.4) {
      // 40% chance to skip if same category as last time
      return;
    }
    lastCategoryRef.current = category;

    const narration = customText
      ? { id: ++narrationId, text: customText, category }
      : getRandomNarration(category);

    if (!narration) return;

    setCurrentNarration(narration);
    setIsVisible(true);

    // Clear any existing timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Auto-hide after 4 seconds
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 4500);
  }, []);

  const hideNarration = useCallback(() => {
    setIsVisible(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { currentNarration, isVisible, showNarration, hideNarration };
}
