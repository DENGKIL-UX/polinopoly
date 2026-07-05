'use client';

import { useState } from 'react';
import { COALITIONS } from '@/lib/game-data';

interface CoalitionLogoProps {
  coalitionId: string;
  size?: number;
  className?: string;
  /** Show on a coloured circular background (good for avatars) */
  circular?: boolean;
  /** Add a subtle ring/border */
  ring?: boolean;
  alt?: string;
}

/**
 * Renders the official coalition logo image with a graceful emoji fallback.
 * Used across lobby, dashboard, 2D board, and token labels.
 */
export function CoalitionLogo({
  coalitionId,
  size = 24,
  className = '',
  circular = false,
  ring = false,
  alt,
}: CoalitionLogoProps) {
  const coalition = COALITIONS[coalitionId];
  const [errored, setErrored] = useState(false);

  if (!coalition) return null;

  const showImage = coalition.logo && !errored;

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    backgroundColor: circular ? `${coalition.color}20` : 'transparent',
    borderRadius: circular ? '50%' : '0',
  };

  if (ring) {
    containerStyle.boxShadow = `0 0 0 2px ${coalition.color}40, 0 0 8px ${coalition.color}30`;
  }

  if (showImage) {
    return (
      <span
        className={`inline-flex items-center justify-center overflow-hidden ${className}`}
        style={containerStyle}
        role="img"
        aria-label={alt || coalition.fullName}
      >
        <img
          src={coalition.logo}
          alt={alt || coalition.fullName}
          width={size}
          height={size}
          className="object-contain"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
          }}
          onError={() => setErrored(true)}
          draggable={false}
        />
      </span>
    );
  }

  // Fallback to emoji / coloured disc
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        ...containerStyle,
        backgroundColor: coalition.color,
        fontSize: size * 0.55,
        lineHeight: 1,
      }}
      role="img"
      aria-label={alt || coalition.fullName}
    >
      {coalition.emblem || coalition.name}
    </span>
  );
}

export default CoalitionLogo;
