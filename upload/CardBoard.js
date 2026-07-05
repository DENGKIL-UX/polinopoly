/**
 * Pilihan Raya Monopoly - Card-Based 3D Board
 * Three.js Implementation v3.0
 * 
 * Transforms 40 flat tiles into thick, collectible trading cards
 * with Hearthstone/Magic-style visual language.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import TWEEN from '@tweenjs/tween.js';
import * as CANNON from 'cannon-es';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  board: {
    width: 14,
    height: 14,
    tileLength: 1.2,      // Long edge of tile (Monopoly: 1.75x ratio)
    tileWidth: 0.7,       // Short edge of tile
    tileThickness: 0.05,  // Card thickness
    bevelSize: 0.008,
    bevelThickness: 0.008,
    gap: 0.02,            // Gap between tiles
    centerSize: 10        // Inner empty area
  },
  colors: {
    boardFelt: 0x1a3d1a,
    boardFrame: 0x5c3a1e,
    gold: 0xD4AF37,
    groups: {
      brown: 0x8B4513,
      lightblue: 0x87CEEB,
      pink: 0xFF69B4,
      orange: 0xFFA500,
      red: 0xDC143C,
      yellow: 0xFFD700,
      green: 0x228B22,
      darkblue: 0x00008B,
      railroad: 0x696969,
      utility: 0xFFFFFF,
      tax: 0x8B0000,
      chance: 0xFF8C00,
      chest: 0x4169E1,
      corner: 0xFFD700
    }
  },
  parties: {
    PH: { color: 0xE30022, name: 'Pakatan Harapan' },
    PN: { color: 0x0000CD, name: 'Perikatan Nasional' },
    BN: { color: 0x000080, name: 'Barisan Nasional' },
    GPS: { color: 0xFF0000, name: 'Gabungan Parti Sarawak' },
    GRS: { color: 0x8B4513, name: 'Gabungan Rakyat Sabah' },
    IND: { color: 0x808080, name: 'Bebas' }
  },
  postprocessing: {
    bloom: { threshold: 0.2, strength: 0.4, radius: 0.5 },
    ssao: { kernelRadius: 16, minDistance: 0.005, maxDistance: 0.1 }
  }
};

// ============================================
// CARD TEXTURE GENERATOR (Offscreen Canvas)
// ============================================
class CardTextureGenerator {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 896; // 1:1.75 ratio
    this.ctx = this.canvas.getContext('2d');
  }

  generate(cardData) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const groupColor = CONFIG.colors.groups[cardData.colorGroup] || 0x333333;
    const hexColor = '#' + groupColor.toString(16).padStart(6, '0');

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Card background (dark base)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // Frame border
    const frameWidth = 24;
    ctx.strokeStyle = hexColor;
    ctx.lineWidth = frameWidth;
    ctx.strokeRect(frameWidth / 2, frameWidth / 2, w - frameWidth, h - frameWidth);

    // Inner frame glow for rare/mythic
    if (cardData.rarity === 'rare' || cardData.rarity === 'mythic') {
      ctx.shadowColor = hexColor;
      ctx.shadowBlur = 20;
      ctx.strokeRect(30, 30, w - 60, h - 60);
      ctx.shadowBlur = 0;
    }

    // Art panel (top 60%)
    const artHeight = Math.floor(h * 0.58);
    const artMargin = 40;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(artMargin, artMargin, w - artMargin * 2, artHeight);

    // Art placeholder gradient
    const grad = ctx.createLinearGradient(0, artMargin, 0, artMargin + artHeight);
    grad.addColorStop(0, hexColor + '40');
    grad.addColorStop(0.5, '#1a1a2e');
    grad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = grad;
    ctx.fillRect(artMargin, artMargin, w - artMargin * 2, artHeight);

    // Art description text (placeholder)
    ctx.fillStyle = '#666';
    ctx.font = 'italic 16px sans-serif';
    ctx.textAlign = 'center';
    const words = cardData.artDescription.split(' ');
    let y = artMargin + artHeight / 2 - 20;
    for (let i = 0; i < words.length; i += 4) {
      ctx.fillText(words.slice(i, i + 4).join(' '), w / 2, y);
      y += 22;
    }

    // Type line
    ctx.fillStyle = hexColor;
    ctx.fillRect(artMargin, artMargin + artHeight + 10, w - artMargin * 2, 36);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    const typeLabel = this.getTypeLabel(cardData.type);
    ctx.fillText(typeLabel.toUpperCase(), artMargin + 10, artMargin + artHeight + 35);

    // Rarity gem
    const rarityColors = {
      common: '#999',
      uncommon: '#2ecc71',
      rare: '#f1c40f',
      mythic: '#e74c3c'
    };
    ctx.fillStyle = rarityColors[cardData.rarity] || '#999';
    ctx.beginPath();
    ctx.moveTo(w - artMargin - 20, artMargin + artHeight + 15);
    ctx.lineTo(w - artMargin, artMargin + artHeight + 28);
    ctx.lineTo(w - artMargin - 20, artMargin + artHeight + 41);
    ctx.lineTo(w - artMargin - 40, artMargin + artHeight + 28);
    ctx.closePath();
    ctx.fill();

    // Card name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cardData.name.toUpperCase(), w / 2, artMargin + artHeight + 80);

    // Text box (rent table for properties)
    if (cardData.type === 'property' && cardData.rentTable) {
      const textBoxY = artMargin + artHeight + 100;
      ctx.fillStyle = '#2a2a3e';
      ctx.fillRect(artMargin, textBoxY, w - artMargin * 2, 180);

      ctx.fillStyle = '#ccc';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';

      const labels = ['Kosong', '1 Cawangan', '2 Cawangan', '3 Cawangan', '4 Cawangan', 'Markas'];
      cardData.rentTable.forEach((rent, i) => {
        const label = labels[i] || `Level ${i}`;
        const rentStr = `RM${rent}`;
        ctx.fillText(label, artMargin + 20, textBoxY + 28 + i * 26);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f1c40f';
        ctx.fillText(rentStr, w - artMargin - 20, textBoxY + 28 + i * 26);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ccc';
      });
    } else if (cardData.type === 'railroad') {
      const textBoxY = artMargin + artHeight + 100;
      ctx.fillStyle = '#2a2a3e';
      ctx.fillRect(artMargin, textBoxY, w - artMargin * 2, 100);
      ctx.fillStyle = '#ccc';
      ctx.font = '16px sans-serif';
      ctx.fillText('Sewa bergantung pada bilangan', artMargin + 20, textBoxY + 30);
      ctx.fillText('infrastruktur yang dimiliki.', artMargin + 20, textBoxY + 55);
    } else if (cardData.type === 'utility') {
      const textBoxY = artMargin + artHeight + 100;
      ctx.fillStyle = '#2a2a3e';
      ctx.fillRect(artMargin, textBoxY, w - artMargin * 2, 100);
      ctx.fillStyle = '#ccc';
      ctx.font = '16px sans-serif';
      ctx.fillText('Sewa = 4x / 10x ganda dadu', artMargin + 20, textBoxY + 30);
    }

    // Price at bottom right
    if (cardData.price > 0) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`RM${cardData.price}`, w - artMargin - 20, h - 30);
    }

    // Mortgage value
    if (cardData.mortgageValue) {
      ctx.fillStyle = '#888';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Hipotek: RM${cardData.mortgageValue}`, artMargin + 20, h - 30);
    }

    // Party affinity badge
    if (cardData.partyAffinity) {
      const partyColor = CONFIG.parties[cardData.partyAffinity]?.color || 0x888888;
      const pHex = '#' + partyColor.toString(16).padStart(6, '0');
      ctx.fillStyle = pHex;
      ctx.beginPath();
      ctx.arc(artMargin + 30, artMargin + 30, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cardData.partyAffinity, artMargin + 30, artMargin + 35);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    return texture;
  }

  generateCardBack() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Dark background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    // Jalur Gemilang pattern (simplified stripes)
    const stripeHeight = h / 14;
    const colors = ['#cc0000', '#ffffff', '#cc0000', '#ffffff', '#cc0000', '#ffffff', '#0000cc'];
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(0, i * stripeHeight, w, stripeHeight);
    }

    // Overlay pattern
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Center seal
    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PILIHAN', w / 2, h / 2 - 20);
    ctx.fillText('RAYA', w / 2, h / 2 + 40);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('SURUHANJAYA Pilihan Raya Malaysia', w / 2, h / 2 + 80);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    return texture;
  }

  getTypeLabel(type) {
    const labels = {
      property: 'Hak Milik',
      railroad: 'Infrastruktur',
      utility: 'Utiliti',
      tax: 'Cukai',
      chance: 'Kad Nasib',
      chest: 'Kad SPR',
      corner: 'Sudut'
    };
    return labels[type] || type;
  }
}

// ============================================
// HOLOGRAPHIC SHADER (Mythic Cards)
// ============================================
const HolographicVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const HolographicFragmentShader = `
  uniform float time;
  uniform vec3 baseColor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);

    // Rainbow shift based on view angle and time
    float noise = snoise(vUv * 8.0 + time * 0.3);
    vec3 rainbow = vec3(
      sin(noise * 6.28 + time) * 0.5 + 0.5,
      sin(noise * 6.28 + time + 2.09) * 0.5 + 0.5,
      sin(noise * 6.28 + time + 4.18) * 0.5 + 0.5
    );

    // Glint sweep
    float glint = smoothstep(0.3, 0.7, sin(vUv.x * 10.0 + time * 2.0) * 0.5 + 0.5);
    glint *= smoothstep(0.2, 0.8, vUv.y);

    vec3 finalColor = mix(baseColor * 0.3, rainbow, fresnel * 0.8);
    finalColor += vec3(glint * 0.5);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// ============================================
// CARD GEOMETRY FACTORY
// ============================================
class CardGeometryFactory {
  static createRoundedRectShape(width, height, radius) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;

    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + height - radius);
    shape.quadraticCurveTo(x, y + height, x + radius, y + height);
    shape.lineTo(x + width - radius, y + height);
    shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    shape.lineTo(x + width, y + radius);
    shape.quadraticCurveTo(x + width, y, x + width - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);

    return shape;
  }

  static createCardGeometry(length, width, thickness, bevelSize, bevelThickness) {
    const shape = this.createRoundedRectShape(length, width, 0.02);
    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: bevelThickness,
      bevelSize: bevelSize,
      bevelSegments: 4,
      curveSegments: 12
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }
}

// ============================================
// CARD TILE CLASS
// ============================================
class CardTile {
  constructor(scene, cardData, index, position, rotation) {
    this.scene = scene;
    this.data = cardData;
    this.index = index;
    this.state = 'UNOWNED'; // UNOWNED, OWNED, MONOPOLY, MORTGAGED, BUILDING
    this.owner = null;
    this.buildings = []; // Array of cawangan/markas meshes
    this.flagPole = null;
    this.isHovered = false;
    this.isSelected = false;

    this.textureGen = new CardTextureGenerator();
    this.baseGeometry = CardGeometryFactory.createCardGeometry(
      CONFIG.board.tileLength,
      CONFIG.board.tileWidth,
      CONFIG.board.tileThickness,
      CONFIG.board.bevelSize,
      CONFIG.board.bevelThickness
    );

    this.createMesh(position, rotation);
    this.createOwnershipGroup();
  }

  createMesh(position, rotation) {
    const groupColor = CONFIG.colors.groups[this.data.colorGroup] || 0x333333;

    // Base material (card edges and back)
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a1a,
      roughness: 0.3,
      metalness: 0.1,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2
    });

    // Face material
    let faceMaterial;
    if (this.data.rarity === 'mythic') {
      // Holographic shader for mythic cards
      faceMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          baseColor: { value: new THREE.Color(groupColor) }
        },
        vertexShader: HolographicVertexShader,
        fragmentShader: HolographicFragmentShader,
        side: THREE.FrontSide
      });
      this.isMythic = true;
    } else {
      const faceTexture = this.textureGen.generate(this.data);
      faceMaterial = new THREE.MeshPhysicalMaterial({
        map: faceTexture,
        roughness: 0.3,
        metalness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2
      });
      this.isMythic = false;
    }

    // Back material
    const backTexture = this.textureGen.generateCardBack();
    const backMaterial = new THREE.MeshPhysicalMaterial({
      map: backTexture,
      roughness: 0.4,
      metalness: 0.05
    });

    // Apply materials: faceMaterial to front face, backMaterial to back face
    // ExtrudeGeometry face index 0 = front, 1 = back
    const materials = [baseMaterial, baseMaterial, baseMaterial, baseMaterial, faceMaterial, backMaterial];

    this.mesh = new THREE.Mesh(this.baseGeometry, materials);
    this.mesh.position.copy(position);
    this.mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    this.mesh.userData = { tile: this };
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Store initial transform for animations
    this.basePosition = position.clone();
    this.baseRotation = rotation.clone();

    this.scene.add(this.mesh);
  }

  createOwnershipGroup() {
    this.ownershipGroup = new THREE.Group();
    this.ownershipGroup.position.copy(this.basePosition);
    this.scene.add(this.ownershipGroup);
  }

  // State transitions
  setState(newState, owner = null) {
    const oldState = this.state;
    this.state = newState;
    this.owner = owner;

    switch (newState) {
      case 'UNOWNED':
        this.clearBuildings();
        this.removeFlag();
        this.setEmissive(0x000000, 0);
        break;
      case 'OWNED':
        this.removeFlag();
        this.addFlag(owner);
        this.setEmissive(0x000000, 0);
        this.playFlipAnimation();
        break;
      case 'MONOPOLY':
        this.addFlag(owner);
        this.startPulseAnimation();
        break;
      case 'MORTGAGED':
        this.tiltCard(0.785); // 45 degrees
        this.addMortgageStamp();
        break;
      case 'BUILDING':
        // Handled by addBuilding()
        break;
    }
  }

  addFlag(party) {
    if (this.flagPole) return;

    const partyData = CONFIG.parties[party] || CONFIG.parties.IND;
    const color = new THREE.Color(partyData.color);

    // Flag pole
    const poleGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);

    // Flag
    const flagGeo = new THREE.PlaneGeometry(0.1, 0.06);
    const flagMat = new THREE.MeshStandardMaterial({
      color: color,
      side: THREE.DoubleSide,
      emissive: color,
      emissiveIntensity: 0.3
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.y = 0.09;

    // Flag wave animation (simple sine on vertices)
    flag.userData = { originalPositions: flag.geometry.attributes.position.clone() };

    this.flagPole = new THREE.Group();
    this.flagPole.add(pole);
    this.flagPole.add(flag);

    // Position at inner edge of tile
    const offset = this.getInnerEdgeOffset();
    this.flagPole.position.copy(this.basePosition).add(offset);
    this.flagPole.position.y += 0.02;

    this.scene.add(this.flagPole);

    // Animate flag rising
    this.flagPole.scale.set(0, 0, 0);
    new TWEEN.Tween(this.flagPole.scale)
      .to({ x: 1, y: 1, z: 1 }, 500)
      .easing(TWEEN.Easing.Elastic.Out)
      .start();
  }

  removeFlag() {
    if (!this.flagPole) return;
    new TWEEN.Tween(this.flagPole.scale)
      .to({ x: 0, y: 0, z: 0 }, 300)
      .easing(TWEEN.Easing.Back.In)
      .onComplete(() => {
        this.scene.remove(this.flagPole);
        this.flagPole = null;
      })
      .start();
  }

  addBuilding(level) {
    if (level > 4) {
      this.clearBuildings();
      this.addMarkas();
      return;
    }

    const partyData = CONFIG.parties[this.owner] || CONFIG.parties.IND;
    const color = new THREE.Color(partyData.color);

    // Cawangan (small cube)
    const cawGeo = new THREE.BoxGeometry(0.035, 0.08, 0.035);
    const cawMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.2 });

    const positions = this.getBuildingPositions(level);
    positions.forEach((pos, i) => {
      const caw = new THREE.Mesh(cawGeo, cawMat);
      caw.position.copy(this.basePosition).add(pos);
      caw.position.y += 0.04;
      caw.castShadow = true;

      // Pop-in animation
      caw.scale.set(0, 0, 0);
      new TWEEN.Tween(caw.scale)
        .to({ x: 1, y: 1, z: 1 }, 400)
        .delay(i * 100)
        .easing(TWEEN.Easing.Back.Out)
        .start();

      this.buildings.push(caw);
      this.scene.add(caw);
    });
  }

  addMarkas() {
    const partyData = CONFIG.parties[this.owner] || CONFIG.parties.IND;
    const color = new THREE.Color(partyData.color);

    // Markas (larger cylindrical HQ)
    const markGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8);
    const markMat = new THREE.MeshStandardMaterial({ 
      color: color, 
      metalness: 0.3,
      emissive: color,
      emissiveIntensity: 0.3
    });
    const markas = new THREE.Mesh(markGeo, markMat);

    const center = this.getBuildingPositions(1)[0];
    markas.position.copy(this.basePosition).add(center);
    markas.position.y += 0.07;
    markas.castShadow = true;

    // Party emblem on top
    const emblemGeo = new THREE.PlaneGeometry(0.06, 0.06);
    const emblemMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const emblem = new THREE.Mesh(emblemGeo, emblemMat);
    emblem.position.y = 0.061;
    emblem.rotation.x = -Math.PI / 2;
    markas.add(emblem);

    markas.scale.set(0, 0, 0);
    new TWEEN.Tween(markas.scale)
      .to({ x: 1, y: 1, z: 1 }, 600)
      .easing(TWEEN.Easing.Elastic.Out)
      .start();

    this.buildings.push(markas);
    this.scene.add(markas);
  }

  clearBuildings() {
    this.buildings.forEach(b => {
      new TWEEN.Tween(b.scale)
        .to({ x: 0, y: 0, z: 0 }, 300)
        .onComplete(() => this.scene.remove(b))
        .start();
    });
    this.buildings = [];
  }

  addMortgageStamp() {
    // Create a red stamp overlay on the card face
    // This would be done by regenerating the texture with a stamp
    // For now, we use emissive red pulse
    this.setEmissive(0xff0000, 0.3);
  }

  // Animations
  playFlipAnimation() {
    const targetRotation = this.baseRotation.clone();
    targetRotation.y += Math.PI; // Flip to show face

    new TWEEN.Tween(this.mesh.rotation)
      .to({ y: targetRotation.y }, 800)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start();

    // Particle burst
    this.spawnParticles(CONFIG.parties[this.owner]?.color || 0xffffff);
  }

  startPulseAnimation() {
    const baseColor = CONFIG.colors.groups[this.data.colorGroup] || 0xD4AF37;
    const color = new THREE.Color(baseColor);

    const pulse = { intensity: 0 };
    this.pulseTween = new TWEEN.Tween(pulse)
      .to({ intensity: 0.5 }, 1000)
      .yoyo(true)
      .repeat(Infinity)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .onUpdate(() => {
        this.setEmissive(baseColor, pulse.intensity);
      })
      .start();
  }

  stopPulseAnimation() {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
  }

  tiltCard(angle) {
    new TWEEN.Tween(this.mesh.rotation)
      .to({ x: this.baseRotation.x + angle }, 500)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();
  }

  setEmissive(color, intensity) {
    this.mesh.material.forEach((mat, i) => {
      if (mat.emissive) {
        mat.emissive.setHex(color);
        mat.emissiveIntensity = intensity;
      }
    });
  }

  spawnParticles(colorHex) {
    const particleCount = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = this.basePosition.x;
      positions[i * 3 + 1] = this.basePosition.y + 0.05;
      positions[i * 3 + 2] = this.basePosition.z;
      velocities.push({
        x: (Math.random() - 0.5) * 0.1,
        y: Math.random() * 0.15 + 0.05,
        z: (Math.random() - 0.5) * 0.1
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.03,
      transparent: true,
      opacity: 1
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    const anim = { t: 0 };
    new TWEEN.Tween(anim)
      .to({ t: 1 }, 1000)
      .onUpdate(() => {
        const pos = particles.geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
          pos[i * 3] += velocities[i].x;
          pos[i * 3 + 1] += velocities[i].y;
          pos[i * 3 + 2] += velocities[i].z;
          velocities[i].y -= 0.003; // gravity
        }
        particles.geometry.attributes.position.needsUpdate = true;
        material.opacity = 1 - anim.t;
      })
      .onComplete(() => {
        this.scene.remove(particles);
        geometry.dispose();
        material.dispose();
      })
      .start();
  }

  // Hover interaction
  onHoverEnter() {
    if (this.isHovered) return;
    this.isHovered = true;

    // Tilt toward camera (30 degrees up)
    new TWEEN.Tween(this.mesh.rotation)
      .to({ 
        x: this.baseRotation.x + 0.5,
        z: this.baseRotation.z 
      }, 300)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    // Lift slightly
    new TWEEN.Tween(this.mesh.position)
      .to({ y: this.basePosition.y + 0.15 }, 300)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    // Parallax: shift art texture slightly (simulated by moving mesh slightly)
    // In a real implementation, this would shift the UVs or the texture layer
  }

  onHoverExit() {
    if (!this.isHovered) return;
    this.isHovered = false;

    new TWEEN.Tween(this.mesh.rotation)
      .to({ 
        x: this.baseRotation.x,
        z: this.baseRotation.z 
      }, 300)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    new TWEEN.Tween(this.mesh.position)
      .to({ y: this.basePosition.y }, 300)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();
  }

  onClick() {
    if (this.isSelected) {
      this.deselect();
    } else {
      this.select();
    }
  }

  select() {
    this.isSelected = true;
    new TWEEN.Tween(this.mesh.position)
      .to({ y: this.basePosition.y + 0.5 }, 400)
      .easing(TWEEN.Easing.Back.Out)
      .start();

    new TWEEN.Tween(this.mesh.rotation)
      .to({ x: 0, y: 0, z: 0 }, 400)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    // Show action menu (would trigger UI event)
    window.dispatchEvent(new CustomEvent('tileSelected', { detail: this.data }));
  }

  deselect() {
    this.isSelected = false;
    new TWEEN.Tween(this.mesh.position)
      .to({ y: this.basePosition.y }, 400)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    new TWEEN.Tween(this.mesh.rotation)
      .to({ 
        x: this.baseRotation.x, 
        y: this.baseRotation.y, 
        z: this.baseRotation.z 
      }, 400)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();
  }

  // Helper: get position offset for inner edge (where flag goes)
  getInnerEdgeOffset() {
    // Based on which side of the board
    const idx = this.index;
    if (idx < 10) return new THREE.Vector3(0, 0, CONFIG.board.tileWidth / 2); // Bottom edge
    if (idx < 20) return new THREE.Vector3(-CONFIG.board.tileWidth / 2, 0, 0); // Left edge
    if (idx < 30) return new THREE.Vector3(0, 0, -CONFIG.board.tileWidth / 2); // Top edge
    return new THREE.Vector3(CONFIG.board.tileWidth / 2, 0, 0); // Right edge
  }

  // Helper: get building positions on card surface
  getBuildingPositions(count) {
    const offsets = [];
    const spacing = 0.15;

    if (count === 1) {
      offsets.push(new THREE.Vector3(0, 0, 0));
    } else if (count === 2) {
      offsets.push(new THREE.Vector3(-spacing / 2, 0, 0));
      offsets.push(new THREE.Vector3(spacing / 2, 0, 0));
    } else if (count === 3) {
      offsets.push(new THREE.Vector3(0, 0, spacing / 3));
      offsets.push(new THREE.Vector3(-spacing / 2, 0, -spacing / 3));
      offsets.push(new THREE.Vector3(spacing / 2, 0, -spacing / 3));
    } else if (count === 4) {
      offsets.push(new THREE.Vector3(-spacing / 2, 0, spacing / 3));
      offsets.push(new THREE.Vector3(spacing / 2, 0, spacing / 3));
      offsets.push(new THREE.Vector3(-spacing / 2, 0, -spacing / 3));
      offsets.push(new THREE.Vector3(spacing / 2, 0, -spacing / 3));
    }

    // Adjust based on board side
    const idx = this.index;
    const side = Math.floor(idx / 10);
    return offsets.map(o => {
      const v = o.clone();
      if (side === 0) { /* bottom - no rotation needed */ }
      else if (side === 1) { v.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); }
      else if (side === 2) { v.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); }
      else if (side === 3) { v.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2); }
      return v;
    });
  }

  update(time) {
    // Update mythic shader
    if (this.isMythic && this.mesh.material[4].uniforms) {
      this.mesh.material[4].uniforms.time.value = time;
    }

    // Animate flag wave
    if (this.flagPole) {
      const flag = this.flagPole.children[1];
      if (flag && flag.userData.originalPositions) {
        const positions = flag.geometry.attributes.position;
        const orig = flag.userData.originalPositions;
        for (let i = 0; i < positions.count; i++) {
          const x = orig.getX(i);
          const y = orig.getY(i);
          const z = orig.getZ(i);
          positions.setZ(i, z + Math.sin(x * 10 + time * 3) * 0.005);
        }
        positions.needsUpdate = true;
      }
    }
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.baseGeometry.dispose();
    this.mesh.material.forEach(m => m.dispose());
    this.clearBuildings();
    this.removeFlag();
    this.stopPulseAnimation();
  }
}

// ============================================
// CARD BOARD (Main Controller)
// ============================================
export class CardBoard {
  constructor(container, cardData) {
    this.container = container;
    this.cardData = cardData;
    this.tiles = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredTile = null;

    this.init();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.02);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 12, 12);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 25;

    // Lighting
    this.setupLighting();

    // Board surface
    this.createBoardSurface();

    // Cards
    this.createCards();

    // Center decks
    this.createCenterDecks();

    // Post-processing
    this.setupPostProcessing();

    // Events
    this.setupEvents();

    // Animation loop
    this.animate();
  }

  setupLighting() {
    // Ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);

    // Main directional (simulating overhead casino light)
    const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
    mainLight.position.set(5, 15, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    this.scene.add(mainLight);

    // Rim light (blue-tinted for cinematic feel)
    const rimLight = new THREE.SpotLight(0x4488ff, 2);
    rimLight.position.set(-10, 8, -10);
    rimLight.lookAt(0, 0, 0);
    this.scene.add(rimLight);

    // Warm fill from opposite side
    const fillLight = new THREE.PointLight(0xffaa44, 0.8);
    fillLight.position.set(10, 5, -5);
    this.scene.add(fillLight);

    // Center glow (subtle)
    const centerGlow = new THREE.PointLight(0xD4AF37, 0.5, 8);
    centerGlow.position.set(0, 3, 0);
    this.scene.add(centerGlow);
  }

  createBoardSurface() {
    const { width, height, centerSize } = CONFIG.board;

    // Main board (felt center)
    const boardGeo = new THREE.BoxGeometry(width, 0.1, height);
    const boardMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.boardFelt,
      roughness: 0.9,
      metalness: 0.0
    });
    this.boardMesh = new THREE.Mesh(boardGeo, boardMat);
    this.boardMesh.position.y = -0.06;
    this.boardMesh.receiveShadow = true;
    this.scene.add(this.boardMesh);

    // Wood frame (outer border)
    const frameThickness = 0.3;
    const frameGeo = new THREE.BoxGeometry(width + frameThickness, 0.15, height + frameThickness);
    const frameMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.boardFrame,
      roughness: 0.6,
      metalness: 0.1
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = -0.08;
    frame.receiveShadow = true;
    this.scene.add(frame);

    // Gold trim lines
    const trimGeo = new THREE.BoxGeometry(width + 0.02, 0.02, 0.02);
    const trimMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.gold,
      metalness: 0.9,
      roughness: 0.2,
      emissive: CONFIG.colors.gold,
      emissiveIntensity: 0.2
    });

    // Four trim edges
    const positions = [
      [0, -0.01, height / 2 + 0.01, width + 0.04, 0.02, 0.02],
      [0, -0.01, -height / 2 - 0.01, width + 0.04, 0.02, 0.02],
      [width / 2 + 0.01, -0.01, 0, 0.02, 0.02, height + 0.04],
      [-width / 2 - 0.01, -0.01, 0, 0.02, 0.02, height + 0.04]
    ];

    positions.forEach(([x, y, z, w, h, d]) => {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trimMat);
      trim.position.set(x, y, z);
      this.scene.add(trim);
    });
  }

  createCards() {
    const { tileLength, tileWidth, gap, centerSize } = CONFIG.board;
    const halfCenter = centerSize / 2;
    const halfLength = tileLength / 2;
    const halfWidth = tileWidth / 2;
    const totalLength = halfCenter + tileLength + gap;

    this.cardData.forEach((data, i) => {
      let position, rotation;

      if (i < 10) {
        // Bottom edge (left to right)
        const x = -halfCenter + halfLength + (i * (tileLength + gap));
        position = new THREE.Vector3(x - totalLength + halfLength, 0, halfCenter + halfWidth);
        rotation = new THREE.Euler(-Math.PI / 2, 0, 0);
      } else if (i < 20) {
        // Left edge (bottom to top)
        const z = halfCenter - halfLength - ((i - 10) * (tileLength + gap));
        position = new THREE.Vector3(-halfCenter - halfWidth, 0, z + totalLength - halfLength);
        rotation = new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2);
      } else if (i < 30) {
        // Top edge (right to left)
        const x = halfCenter - halfLength - ((i - 20) * (tileLength + gap));
        position = new THREE.Vector3(x + totalLength - halfLength, 0, -halfCenter - halfWidth);
        rotation = new THREE.Euler(-Math.PI / 2, 0, Math.PI);
      } else {
        // Right edge (top to bottom)
        const z = -halfCenter + halfLength + ((i - 30) * (tileLength + gap));
        position = new THREE.Vector3(halfCenter + halfWidth, 0, z - totalLength + halfLength);
        rotation = new THREE.Euler(-Math.PI / 2, 0, -Math.PI / 2);
      }

      const tile = new CardTile(this.scene, data, i, position, rotation);
      this.tiles.push(tile);
    });
  }

  createCenterDecks() {
    // "Kad Nasib" deck (Chance) - orange, at 10 o'clock
    this.chanceDeck = this.createDeck('KAD NASIB', 0xFF8C00, { x: -3, y: 0.02, z: 3 });

    // "Kad SPR" deck (Community Chest) - blue, at 2 o'clock
    this.chestDeck = this.createDeck('KAD SPR', 0x4169E1, { x: 3, y: 0.02, z: 3 });

    // Dice arena at 6 o'clock
    this.createDiceArena();
  }

  createDeck(name, color, position) {
    const group = new THREE.Group();
    group.position.set(position.x, position.y, position.z);

    // Stack of cards
    const cardGeo = CardGeometryFactory.createCardGeometry(0.5, 0.8, 0.02, 0.003, 0.003);
    const cardMat = new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.2,
      clearcoat: 0.5
    });

    for (let i = 0; i < 8; i++) {
      const card = new THREE.Mesh(cardGeo, cardMat);
      card.position.y = i * 0.003;
      card.rotation.x = -Math.PI / 2;
      card.rotation.z = (Math.random() - 0.5) * 0.1; // Slight randomness
      card.castShadow = true;
      group.add(card);
    }

    // Label
    // (In production, use TextGeometry or HTML overlay)

    this.scene.add(group);
    return group;
  }

  createDiceArena() {
    const arenaGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.02, 32);
    const arenaMat = new THREE.MeshStandardMaterial({
      color: 0x2a0a2a,
      roughness: 0.9,
      bumpScale: 0.02
    });
    const arena = new THREE.Mesh(arenaGeo, arenaMat);
    arena.position.set(0, 0.01, 3.5);
    arena.receiveShadow = true;
    this.scene.add(arena);

    // Arena rim
    const rimGeo = new THREE.TorusGeometry(0.8, 0.03, 8, 32);
    const rimMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.gold,
      metalness: 0.9,
      roughness: 0.2
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(0, 0.02, 3.5);
    rim.rotation.x = Math.PI / 2;
    this.scene.add(rim);
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // SSAO
    const ssaoPass = new SSAOPass(this.scene, this.camera);
    ssaoPass.kernelRadius = CONFIG.postprocessing.ssao.kernelRadius;
    ssaoPass.minDistance = CONFIG.postprocessing.ssao.minDistance;
    ssaoPass.maxDistance = CONFIG.postprocessing.ssao.maxDistance;
    this.composer.addPass(ssaoPass);

    // Bloom
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      CONFIG.postprocessing.bloom.strength,
      CONFIG.postprocessing.bloom.radius,
      CONFIG.postprocessing.bloom.threshold
    );
    this.composer.addPass(bloomPass);

    // Output
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setupEvents() {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.tiles.map(t => t.mesh)
    );

    if (intersects.length > 0) {
      const tile = intersects[0].object.userData.tile;
      if (tile && tile !== this.hoveredTile) {
        if (this.hoveredTile) this.hoveredTile.onHoverExit();
        this.hoveredTile = tile;
        tile.onHoverEnter();
        document.body.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredTile) {
        this.hoveredTile.onHoverExit();
        this.hoveredTile = null;
        document.body.style.cursor = 'default';
      }
    }
  }

  onClick(event) {
    if (this.hoveredTile) {
      this.hoveredTile.onClick();
    }
  }

  // Public API for game logic
  purchaseTile(tileIndex, playerParty) {
    const tile = this.tiles[tileIndex];
    if (tile && tile.state === 'UNOWNED') {
      tile.setState('OWNED', playerParty);
    }
  }

  buildOnTile(tileIndex, level) {
    const tile = this.tiles[tileIndex];
    if (tile && tile.state === 'OWNED') {
      tile.addBuilding(level);
      tile.setState('BUILDING', tile.owner);
    }
  }

  mortgageTile(tileIndex) {
    const tile = this.tiles[tileIndex];
    if (tile && tile.state === 'OWNED') {
      tile.setState('MORTGAGED', tile.owner);
    }
  }

  unmortgageTile(tileIndex) {
    const tile = this.tiles[tileIndex];
    if (tile && tile.state === 'MORTGAGED') {
      tile.setState('OWNED', tile.owner);
      // Reset rotation
      new TWEEN.Tween(tile.mesh.rotation)
        .to({ x: tile.baseRotation.x }, 500)
        .start();
    }
  }

  achieveMonopoly(tileIndices) {
    tileIndices.forEach(idx => {
      const tile = this.tiles[idx];
      if (tile) tile.setState('MONOPOLY', tile.owner);
    });
  }

  // Piece hopping animation
  hopPiece(piece, fromIndex, toIndex, onComplete) {
    const path = this.getTilePath(fromIndex, toIndex);
    let currentStep = 0;

    const hop = () => {
      if (currentStep >= path.length) {
        if (onComplete) onComplete();
        return;
      }

      const target = path[currentStep];
      const start = piece.position.clone();

      // Create arc curve
      const mid = new THREE.Vector3(
        (start.x + target.x) / 2,
        Math.max(start.y, target.y) + 0.3,
        (start.z + target.z) / 2
      );
      const curve = new THREE.QuadraticBezierCurve3(start, mid, target);

      const anim = { t: 0 };
      new TWEEN.Tween(anim)
        .to({ t: 1 }, 300)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          piece.position.copy(curve.getPoint(anim.t));
        })
        .onComplete(() => {
          currentStep++;
          // Play thud sound here
          hop();
        })
        .start();
    };

    hop();
  }

  getTilePath(fromIndex, toIndex) {
    const path = [];
    let current = fromIndex;
    while (current !== toIndex) {
      current = (current + 1) % 40;
      path.push(this.tiles[current].basePosition.clone().add(new THREE.Vector3(0, 0.1, 0)));
    }
    return path;
  }

  // Draw card from center deck
  drawCard(deckType) {
    const deck = deckType === 'chance' ? this.chanceDeck : this.chestDeck;
    const topCard = deck.children[deck.children.length - 1];
    if (!topCard) return;

    // Animate card draw
    const startPos = topCard.position.clone();
    const endPos = new THREE.Vector3(0, 2, 0);

    // Lift and flip
    new TWEEN.Tween(topCard.position)
      .to({ x: endPos.x, y: endPos.y, z: endPos.z }, 800)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    new TWEEN.Tween(topCard.rotation)
      .to({ x: 0, y: 0, z: 0 }, 800)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    // Return after delay
    setTimeout(() => {
      new TWEEN.Tween(topCard.position)
        .to({ x: startPos.x, y: startPos.y, z: startPos.z }, 600)
        .easing(TWEEN.Easing.Cubic.In)
        .start();

      new TWEEN.Tween(topCard.rotation)
        .to({ x: -Math.PI / 2, y: 0, z: (Math.random() - 0.5) * 0.1 }, 600)
        .start();
    }, 3000);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = performance.now() / 1000;
    TWEEN.update();
    this.controls.update();

    // Update all tiles (mythic shaders, flag waves)
    this.tiles.forEach(tile => tile.update(time));

    // Render
    this.composer.render();
  }

  dispose() {
    this.tiles.forEach(t => t.dispose());
    this.renderer.dispose();
    this.composer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

// ============================================
// DICE PHYSICS (cannon-es integration)
// ============================================
export class DicePhysics {
  constructor(scene) {
    this.scene = scene;
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0)
    });

    // Physics materials
    this.groundMat = new CANNON.Material();
    this.diceMat = new CANNON.Material();

    const contactMat = new CANNON.ContactMaterial(this.groundMat, this.diceMat, {
      friction: 0.3,
      restitution: 0.3
    });
    this.world.addContactMaterial(contactMat);

    // Ground
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: this.groundMat
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);

    this.dice = [];
  }

  createDie(position) {
    const size = 0.15;
    const halfExtents = new CANNON.Vec3(size / 2, size / 2, size / 2);

    // Physics body
    const body = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Box(halfExtents),
      material: this.diceMat
    });
    body.position.set(position.x, position.y, position.z);
    this.world.addBody(body);

    // Visual mesh
    const geometry = new THREE.BoxGeometry(size, size, size);
    // Create face textures with ketupat/songket motifs
    const materials = this.createDieFaceMaterials();
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    this.scene.add(mesh);

    const die = { body, mesh };
    this.dice.push(die);
    return die;
  }

  createDieFaceMaterials() {
    const materials = [];
    const faceColors = [0xffffff, 0xf0f0f0, 0xffffff, 0xf0f0f0, 0xffffff, 0xf0f0f0];

    for (let i = 0; i < 6; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#f5f5f0';
      ctx.fillRect(0, 0, 128, 128);

      // Songket pattern border
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, 112, 112);

      // Pips (dots) in ketupat arrangement
      const pips = this.getPipPositions(i + 1);
      ctx.fillStyle = '#1a1a1a';
      pips.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x * 128, y * 128, 8, 0, Math.PI * 2);
        ctx.fill();
      });

      const texture = new THREE.CanvasTexture(canvas);
      materials.push(new THREE.MeshStandardMaterial({ map: texture }));
    }

    return materials;
  }

  getPipPositions(face) {
    const positions = {
      1: [[0.5, 0.5]],
      2: [[0.25, 0.25], [0.75, 0.75]],
      3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
      4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
      5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
      6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]]
    };
    return positions[face] || positions[1];
  }

  roll(position, force) {
    const die = this.createDie(position);

    // Apply random impulse
    const impulse = new CANNON.Vec3(
      (Math.random() - 0.5) * force.x,
      force.y,
      (Math.random() - 0.5) * force.z
    );
    const point = new CANNON.Vec3(
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05
    );
    die.body.applyImpulse(impulse, point);

    // Apply random torque
    die.body.angularVelocity.set(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );

    return die;
  }

  update() {
    this.world.step(1 / 60);

    this.dice.forEach(die => {
      die.mesh.position.copy(die.body.position);
      die.mesh.quaternion.copy(die.body.quaternion);
    });
  }

  getTopFace(die) {
    const quaternion = die.mesh.quaternion;
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);

    // Determine which face is pointing up
    const faces = [
      new THREE.Vector3(0, 1, 0),   // 1 (top)
      new THREE.Vector3(0, -1, 0),  // 6 (bottom)
      new THREE.Vector3(1, 0, 0),   // 3 (right)
      new THREE.Vector3(-1, 0, 0),  // 4 (left)
      new THREE.Vector3(0, 0, 1),   // 2 (front)
      new THREE.Vector3(0, 0, -1)   // 5 (back)
    ];

    let maxDot = -1;
    let topFace = 1;
    faces.forEach((face, i) => {
      const dot = face.dot(up);
      if (dot > maxDot) {
        maxDot = dot;
        topFace = [1, 6, 3, 4, 2, 5][i];
      }
    });

    return topFace;
  }

  reset() {
    this.dice.forEach(die => {
      this.world.removeBody(die.body);
      this.scene.remove(die.mesh);
    });
    this.dice = [];
  }
}

// ============================================
// EXPORT USAGE EXAMPLE
// ============================================
/*
import { CardBoard, DicePhysics } from './CardBoard.js';
import cardData from './pilihan_raya_cards.json';

const container = document.getElementById('board-container');
const board = new CardBoard(container, cardData.cards);

// Game logic integration:
board.purchaseTile(1, 'PH');        // PH buys Perlis
board.buildOnTile(1, 1);            // Build 1 cawangan
board.buildOnTile(1, 4);            // Build 4 cawangan
board.buildOnTile(1, 5);            // Upgrade to markas
board.mortgageTile(1);              // Mortgage
board.unmortgageTile(1);             // Unmortgage
board.achieveMonopoly([1, 3]);      // Monopoly on brown group

// Dice:
const dice = new DicePhysics(board.scene);
const die1 = dice.roll({x: 0, y: 3, z: 3.5}, {x: 2, y: 5, z: 2});
const die2 = dice.roll({x: 0.3, y: 3, z: 3.5}, {x: -2, y: 5, z: -2});

// In animation loop:
// dice.update();
// if (die1.body.velocity.length() < 0.1) console.log(dice.getTopFace(die1));
*/
