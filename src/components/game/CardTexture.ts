'use client';

import * as THREE from 'three';
import { BOARD_TILES, COLOR_GROUP_HEX, COALITIONS, type Tile } from '@/lib/game-data';

// ───────────────────────────────────────────────────────────────────
// CARD TEXTURE GENERATOR
// Draws each tile as a Hearthstone/Magic-style trading card face
// using an offscreen canvas (512×896, 1:1.75 ratio).
// Reference: CardBoard.js CardTextureGenerator
// ───────────────────────────────────────────────────────────────────

export interface CardVisualData {
  name: string;
  type: string;
  colorGroup?: string;
  price?: number;
  rent?: number[];
  mortgageValue?: number;
  description?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'mythic';
}

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#2ecc71',
  rare: '#f1c40f',
  mythic: '#e74c3c',
};

const TYPE_LABELS: Record<string, string> = {
  property: 'HAK MILIK',
  highway: 'INFRASTRUKTUR',
  media: 'UTILITI',
  tax: 'CUKAI',
  chest: 'KAD SPR',
  chance: 'KAD NASIB',
  corner: 'SUDUT',
};

const TYPE_COLORS: Record<string, string> = {
  property: '#1e293b',
  highway: '#475569',
  media: '#7c3aed',
  tax: '#7f1d1d',
  chest: '#1e40af',
  chance: '#c2410c',
  corner: '#78350f',
};

function rarityForTile(tile: Tile): 'common' | 'uncommon' | 'rare' | 'mythic' {
  if (tile.type === 'corner') return 'mythic';
  if (tile.colorGroup === 'darkblue') return 'rare';
  if (tile.colorGroup === 'green') return 'uncommon';
  return 'common';
}

/**
 * Generate a trading-card face texture for a tile.
 * Layout: dark base → color frame → art panel → type bar → rarity gem →
 *         name → rent text box → price → mortgage → party badge
 */
export function generateCardFaceTexture(tile: Tile): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 896;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  const groupHex = tile.colorGroup ? COLOR_GROUP_HEX[tile.colorGroup as keyof typeof COLOR_GROUP_HEX] : '#333333';
  const rarity = rarityForTile(tile);
  const rarityColor = RARITY_COLORS[rarity];

  // 1. Transparent base (clearRect ensures canvas is transparent — the board
  // image underneath shows through the card)
  ctx.clearRect(0, 0, w, h);

  // 2. Frame border REMOVED — no outline so the board image's own tile
  //    borders show through cleanly.

  // 3. Art panel — fully transparent (no background fill, only text)
  const artMargin = 40;
  const artH = Math.floor(h * 0.42);

  // Art description (italic placeholder text)
  if (tile.description) {
    ctx.fillStyle = '#6b7280';
    ctx.font = 'italic 15px sans-serif';
    ctx.textAlign = 'center';
    const words = tile.description.split(' ');
    let y = artMargin + artH / 2 - 10;
    for (let i = 0; i < words.length; i += 4) {
      ctx.fillText(words.slice(i, i + 4).join(' '), w / 2, y);
      y += 20;
    }
  }

  // 4. Type bar — text only, no background fill (transparent)
  const typeBarY = artMargin + artH + 10;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText((TYPE_LABELS[tile.type] || tile.type), artMargin + 12, typeBarY + 25);

  // 5. Rarity gem (top-right diamond)
  ctx.fillStyle = rarityColor;
  const gx = w - artMargin - 24;
  const gy = typeBarY + 18;
  ctx.beginPath();
  ctx.moveTo(gx, gy - 12);
  ctx.lineTo(gx + 14, gy);
  ctx.lineTo(gx, gy + 12);
  ctx.lineTo(gx - 14, gy);
  ctx.closePath();
  ctx.fill();

  // 6. Card name
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(tile.name.toUpperCase(), w / 2, typeBarY + 76);

  // 7. Text box (rent table for properties)
  const textBoxY = typeBarY + 96;
  if (tile.type === 'property' && tile.rent) {
    ctx.fillStyle = 'rgba(20, 20, 35, 0.0)';
    ctx.fillRect(artMargin, textBoxY, w - artMargin * 2, 200);
    const labels = ['Kosong', '1 Cawangan', '2 Cawangan', '3 Cawangan', '4 Cawangan', 'Markas'];
    ctx.font = '15px sans-serif';
    tile.rent.forEach((rent, i) => {
      const ry = textBoxY + 28 + i * 30;
      ctx.fillStyle = '#ccc';
      ctx.textAlign = 'left';
      ctx.fillText(labels[i] || `Level ${i}`, artMargin + 20, ry);
      ctx.fillStyle = '#f1c40f';
      ctx.textAlign = 'right';
      ctx.fillText(`RM${rent}`, w - artMargin - 20, ry);
    });
  } else if (tile.type === 'highway') {
    ctx.fillStyle = 'rgba(20, 20, 35, 0.0)';
    ctx.fillRect(artMargin, textBoxY, w - artMargin * 2, 100);
    ctx.fillStyle = '#ccc';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Sewa bergantung pada bilangan', artMargin + 20, textBoxY + 32);
    ctx.fillText('infrastruktur yang dimiliki.', artMargin + 20, textBoxY + 58);
  } else if (tile.type === 'media') {
    ctx.fillStyle = 'rgba(20, 20, 35, 0.0)';
    ctx.fillRect(artMargin, textBoxY, w - artMargin * 2, 100);
    ctx.fillStyle = '#ccc';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Sewa = 4x / 10x ganda dadu', artMargin + 20, textBoxY + 32);
  } else if (tile.description) {
    ctx.fillStyle = 'rgba(20, 20, 35, 0.0)';
    ctx.fillRect(artMargin, textBoxY, w - artMargin * 2, 80);
    ctx.fillStyle = '#ccc';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tile.description.substring(0, 60), w / 2, textBoxY + 45);
  }

  // 8. Price (bottom-right)
  if (tile.price && tile.price > 0) {
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`RM${tile.price}`, w - artMargin - 16, h - 28);
  }

  // 9. Mortgage value (bottom-left)
  if (tile.mortgageValue) {
    ctx.fillStyle = '#888';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Hipotek: RM${tile.mortgageValue}`, artMargin + 16, h - 28);
  }

  // 10. Party affinity badge (top-left circle) — from coalition mapping
  const coalitionId = tile.coalition;
  if (coalitionId && COALITIONS[coalitionId]) {
    const partyHex = COALITIONS[coalitionId].color;
    ctx.fillStyle = partyHex;
    ctx.beginPath();
    ctx.arc(artMargin + 28, artMargin + 28, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(coalitionId, artMargin + 28, artMargin + 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  texture.needsUpdate = true;
  // Force the texture to upload on next render
  texture.source.data = canvas;
  return texture;
}

/**
 * Generate the card back (shown when tile is unowned).
 * Jalur Gemilang stripes + dark overlay + gold border + "PILIHAN RAYA" text.
 */
export function generateCardBackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 896;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  // Transparent base — board image shows through the card back
  ctx.clearRect(0, 0, w, h);

  // Jalur Gemilang stripes (semi-transparent so board shows through)
  const stripeH = h / 14;
  const stripeColors = ['rgba(204,0,0,0.5)', 'rgba(255,255,255,0.4)'];
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = stripeColors[i % 2];
    ctx.fillRect(0, i * stripeH, w, stripeH);
  }

  // Light overlay for contrast
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, w, h);

  // Gold border REMOVED — no outlines so board image shows through cleanly.

  // Center text
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PILIHAN', w / 2, h / 2 - 20);
  ctx.fillText('RAYA', w / 2, h / 2 + 40);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('Suruhanjaya Pilihan Raya', w / 2, h / 2 + 80);
  ctx.fillText('Malaysia', w / 2, h / 2 + 102);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  texture.needsUpdate = true;
  // Force the texture to upload on next render
  texture.source.data = canvas;
  return texture;
}

// ───────────────────────────────────────────────────────────────────
// CARD GEOMETRY FACTORY — BoxGeometry with 6 face materials
// (BoxGeometry material order: [+X, -X, +Y, -Y, +Z, -Z])
// We use a box so the face texture maps cleanly to the top face and
// the back texture to the bottom face — reliable, no group-index issues.
// ───────────────────────────────────────────────────────────────────

export function createCardGeometry(length: number, width: number, thickness: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(length, thickness, width);
}
