// ============================================================
// Dewan Rakyat: Pilihan Raya Edition — Complete Game Data
// ============================================================

// --- Coalition Definitions ---
export interface Coalition {
  id: string;
  name: string;
  fullName: string;
  color: string;       // hex color for 3D meshes
  textColor: string;   // for overlays
  emblem: string;      // emoji
  slogan: string;
}

export const COALITIONS: Record<string, Coalition> = {
  PH: {
    id: 'PH',
    name: 'PH',
    fullName: 'Pakatan Harapan',
    color: '#2563eb',   // blue
    textColor: '#ffffff',
    emblem: '🟦',
    slogan: 'Hari ini untuk esok!',
  },
  PN: {
    id: 'PN',
    name: 'PN',
    fullName: 'Perikatan Nasional',
    color: '#16a34a',   // green
    textColor: '#ffffff',
    emblem: '🟩',
    slogan: 'Islam dan Bangsa!',
  },
  BN: {
    id: 'BN',
    name: 'BN',
    fullName: 'Barisan Nasional',
    color: '#ea580c',   // orange
    textColor: '#ffffff',
    emblem: '🟧',
    slogan: 'Bersatu, Teguh!',
  },
  GPS: {
    id: 'GPS',
    name: 'GPS',
    fullName: 'Gabungan Parti Sarawak',
    color: '#dc2626',   // red
    textColor: '#ffffff',
    emblem: '🟥',
    slogan: 'Sarawak First!',
  },
  GRS: {
    id: 'GRS',
    name: 'GRS',
    fullName: 'Gabungan Rakyat Sabah',
    color: '#eab308',   // yellow
    textColor: '#000000',
    emblem: '🟨',
    slogan: 'Sabah Maju Jaya!',
  },
  IND: {
    id: 'IND',
    name: 'IND',
    fullName: 'Independent',
    color: '#78716c',   // stone/gray
    textColor: '#ffffff',
    emblem: '⬜',
    slogan: 'Rakyat Hakim!',
  },
};

// --- Tile Type Enum ---
export type TileType =
  | 'corner'
  | 'property'
  | 'highway'
  | 'media'
  | 'tax'
  | 'chest'
  | 'chance';

// --- Property Color Groups ---
export type ColorGroup =
  | 'brown'      // Independents
  | 'lightblue'  // PH
  | 'pink'       // PN
  | 'orange'     // BN
  | 'red'        // GPS Sarawak
  | 'yellow'     // GRS Sabah
  | 'green'      // East Coast Bloc
  | 'darkblue';  // Federal Power

export const COLOR_GROUP_HEX: Record<ColorGroup, string> = {
  brown: '#78716c',
  lightblue: '#38bdf8',
  pink: '#f472b6',
  orange: '#fb923c',
  red: '#ef4444',
  yellow: '#facc15',
  green: '#4ade80',
  darkblue: '#3b82f6',
};

export const COLOR_GROUP_COALITION: Record<ColorGroup, string> = {
  brown: 'IND',
  lightblue: 'PH',
  pink: 'PN',
  orange: 'BN',
  red: 'GPS',
  yellow: 'GRS',
  green: 'PN',
  darkblue: 'PH',
};

// --- Tile Interface ---
export interface Tile {
  id: number;
  name: string;
  type: TileType;
  colorGroup?: ColorGroup;
  coalition?: string;
  price?: number;
  rent?: number[];
  // rent[0] = base, [1] = 1 house, [2] = 2 houses, [3] = 3 houses, [4] = 4 houses, [5] = hotel
  housePrice?: number;
  mortgageValue?: number;
  owner?: string;  // player id or coalition id
  houses?: number; // 0-5 (5 = hotel)
  description?: string;
}

// --- All 40 Tiles ---
export const BOARD_TILES: Tile[] = [
  // ---- BOTTOM ROW (right to left) ----
  { id: 0, name: 'Pilihan Raya', type: 'corner', description: 'GO — Collect RM200 in "campaign funds" from KWSP Bank!' },
  { id: 1, name: 'MUDA', type: 'property', colorGroup: 'brown', coalition: 'IND', price: 60, rent: [2, 10, 30, 90, 160, 250], housePrice: 50, mortgageValue: 30, description: 'Malaysian United Democratic Alliance' },
  { id: 2, name: 'Jawatan Menteri', type: 'chest', description: 'Community Chest — Draw a card!' },
  { id: 3, name: 'PSM', type: 'property', colorGroup: 'brown', coalition: 'IND', price: 60, rent: [4, 20, 60, 180, 320, 450], housePrice: 50, mortgageValue: 30, description: 'Parti Sosialis Malaysia' },
  { id: 4, name: 'Cukai SST/GST', type: 'tax', description: 'Pay RM200 in GST — or argue about it in Parliament!' },
  { id: 5, name: 'ECRL', type: 'highway', price: 200, rent: [25, 50, 100, 200], description: 'East Coast Rail Link — RM50 billion mega-project' },
  { id: 6, name: 'Amanah', type: 'property', colorGroup: 'lightblue', coalition: 'PH', price: 100, rent: [6, 30, 90, 270, 400, 550], housePrice: 50, mortgageValue: 50, description: 'Parti Amanah Negara' },
  { id: 7, name: 'Krisis Nasional', type: 'chance', description: 'Chance — The rakyat demand action!' },
  { id: 8, name: 'PKR', type: 'property', colorGroup: 'lightblue', coalition: 'PH', price: 100, rent: [6, 30, 90, 270, 400, 550], housePrice: 50, mortgageValue: 50, description: 'Parti Keadilan Rakyat' },
  { id: 9, name: 'DAP', type: 'property', colorGroup: 'lightblue', coalition: 'PH', price: 120, rent: [8, 40, 100, 300, 450, 600], housePrice: 50, mortgageValue: 60, description: 'Democratic Action Party' },

  // ---- RIGHT COLUMN (bottom to top) ----
  { id: 10, name: 'Tahanan SPR', type: 'corner', description: 'Jail — Just visiting, or serving time for corruption?' },
  { id: 11, name: 'Gerakan', type: 'property', colorGroup: 'pink', coalition: 'PN', price: 140, rent: [10, 50, 150, 450, 625, 750], housePrice: 100, mortgageValue: 70, description: 'Parti Gerakan Rakyat Malaysia' },
  { id: 12, name: 'RTM', type: 'media', price: 150, rent: [20, 48, 120, 360], description: 'Radio Televisyen Malaysia — State media monopoly' },
  { id: 13, name: 'Bersatu', type: 'property', colorGroup: 'pink', coalition: 'PN', price: 140, rent: [10, 50, 150, 450, 625, 750], housePrice: 100, mortgageValue: 70, description: 'Parti Pribumi Bersatu Malaysia' },
  { id: 14, name: 'PAS', type: 'property', colorGroup: 'pink', coalition: 'PN', price: 160, rent: [12, 60, 180, 500, 700, 900], housePrice: 100, mortgageValue: 80, description: 'Parti Islam Se-Malaysia' },
  { id: 15, name: 'MRT3', type: 'highway', price: 200, rent: [25, 50, 100, 200], description: 'MRT Circle Line — Another mega-project' },
  { id: 16, name: 'MIC', type: 'property', colorGroup: 'orange', coalition: 'BN', price: 180, rent: [14, 70, 200, 550, 750, 950], housePrice: 100, mortgageValue: 90, description: 'Malaysian Indian Congress' },
  { id: 17, name: 'Jawatan Menteri', type: 'chest', description: 'Community Chest — Draw a card!' },
  { id: 18, name: 'MCA', type: 'property', colorGroup: 'orange', coalition: 'BN', price: 180, rent: [14, 70, 200, 550, 750, 950], housePrice: 100, mortgageValue: 90, description: 'Malaysian Chinese Association' },
  { id: 19, name: 'UMNO', type: 'property', colorGroup: 'orange', coalition: 'BN', price: 200, rent: [16, 80, 220, 600, 800, 1000], housePrice: 100, mortgageValue: 100, description: 'United Malays National Organisation' },

  // ---- TOP ROW (left to right) ----
  { id: 20, name: 'Istana Negara', type: 'corner', description: 'Free Parking — Collect all taxes and fines here!' },
  { id: 21, name: 'PRS', type: 'property', colorGroup: 'red', coalition: 'GPS', price: 220, rent: [18, 90, 250, 700, 875, 1050], housePrice: 150, mortgageValue: 110, description: 'Parti Rakyat Sarawak' },
  { id: 22, name: 'Krisis Nasional', type: 'chance', description: 'Chance — The rakyat demand action!' },
  { id: 23, name: 'PDP', type: 'property', colorGroup: 'red', coalition: 'GPS', price: 220, rent: [18, 90, 250, 700, 875, 1050], housePrice: 150, mortgageValue: 110, description: 'Progressive Democratic Party' },
  { id: 24, name: 'SUPP', type: 'property', colorGroup: 'red', coalition: 'GPS', price: 240, rent: [20, 100, 300, 750, 925, 1100], housePrice: 150, mortgageValue: 120, description: 'Sarawak United Peoples\' Party' },
  { id: 25, name: 'Pan Borneo', type: 'highway', price: 200, rent: [25, 50, 100, 200], description: 'Pan-Borneo Highway — Connecting Sarawak & Sabah' },
  { id: 26, name: 'SAPP', type: 'property', colorGroup: 'yellow', coalition: 'GRS', price: 260, rent: [22, 110, 330, 800, 975, 1150], housePrice: 150, mortgageValue: 130, description: 'Sabah Progressive Party' },
  { id: 27, name: 'Astro/Media Prima', type: 'media', price: 150, rent: [20, 48, 120, 360], description: 'Private media empire — Control the narrative!' },
  { id: 28, name: 'STAR', type: 'property', colorGroup: 'yellow', coalition: 'GRS', price: 260, rent: [22, 110, 330, 800, 975, 1150], housePrice: 150, mortgageValue: 130, description: 'Sabah Heritage Party' },
  { id: 29, name: 'PBS', type: 'property', colorGroup: 'yellow', coalition: 'GRS', price: 280, rent: [24, 120, 360, 850, 1025, 1200], housePrice: 150, mortgageValue: 140, description: 'Parti Bersatu Sabah' },

  // ---- LEFT COLUMN (top to bottom) ----
  { id: 30, name: 'Disyorkan ke SPR', type: 'corner', description: 'Go to Jail! — SPR recommends investigation!' },
  { id: 31, name: 'PN Pahang', type: 'property', colorGroup: 'green', coalition: 'PN', price: 300, rent: [26, 130, 390, 900, 1100, 1275], housePrice: 200, mortgageValue: 150, description: 'Pahang PN stronghold' },
  { id: 32, name: 'PAS Terengganu', type: 'property', colorGroup: 'green', coalition: 'PN', price: 300, rent: [26, 130, 390, 900, 1100, 1275], housePrice: 200, mortgageValue: 150, description: 'Terengganu PAS fortress' },
  { id: 33, name: 'Jawatan Menteri', type: 'chest', description: 'Community Chest — Draw a card!' },
  { id: 34, name: 'PAS Kelantan', type: 'property', colorGroup: 'green', coalition: 'PN', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], housePrice: 200, mortgageValue: 160, description: 'Kelantan — PAS heartland since 1990!' },
  { id: 35, name: 'RTS Johor', type: 'highway', price: 200, rent: [25, 50, 100, 200], description: 'Rapid Transit System Singapore-Johor' },
  { id: 36, name: 'Krisis Nasional', type: 'chance', description: 'Chance — The rakyat demand action!' },
  { id: 37, name: 'Putrajaya', type: 'property', colorGroup: 'darkblue', coalition: 'PH', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], housePrice: 200, mortgageValue: 175, description: 'Federal administrative capital — Ultimate power!' },
  { id: 38, name: 'Luxury Tax', type: 'tax', description: 'Pay RM100 — Yacht maintenance is expensive, brader!' },
  { id: 39, name: 'Kuala Lumpur', type: 'property', colorGroup: 'darkblue', coalition: 'PH', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], housePrice: 200, mortgageValue: 200, description: 'The capital — Most expensive seat in the house!' },
];

// --- Card Decks ---
export interface GameCard {
  id: string;
  title: string;
  description: string;
  effect: {
    type: 'money' | 'move' | 'jail' | 'repair' | 'collect_all' | 'pay_all' | 'go_to';
    value: number;
    tileId?: number;
  };
}

export const JAWATAN_MENTERI_CARDS: GameCard[] = [
  {
    id: 'jm1', title: 'Kerajaan Pusat Grant', description: 'Federal government allocates RM50 for your constituency project.',
    effect: { type: 'money', value: 50 },
  },
  {
    id: 'jm2', title: 'Auditor General Report', description: 'AG finds mismanagement! Pay RM100 in penalties.',
    effect: { type: 'money', value: -100 },
  },
  {
    id: 'jm3', title: 'Election Promise Fulfilled', description: 'You actually kept a promise! Collect RM150 from each player.',
    effect: { type: 'collect_all', value: 150 },
  },
  {
    id: 'jm4', title: 'Jumpa Opposition Leader', description: 'Back to GO — time to start over, lah!',
    effect: { type: 'go_to', value: 0 },
  },
  {
    id: 'jm5', title: 'KWSP Bonus', description: 'EPF declares 6% dividend! Collect RM100.',
    effect: { type: 'money', value: 100 },
  },
  {
    id: 'jm6', title: 'MACC Investigation', description: 'MACC freezes your accounts! Go directly to Tahanan SPR.',
    effect: { type: 'jail', value: 0 },
  },
  {
    id: 'jm7', title: 'Petronas Dividend', description: 'Oil money flows! Collect RM200.',
    effect: { type: 'money', value: 200 },
  },
  {
    id: 'jm8', title: 'Koperasi Loan', description: 'Borrow RM50 from koperasi. You must pay it back... eventually.',
    effect: { type: 'money', value: 50 },
  },
  {
    id: 'jm9', title: 'Hospital Bill', description: 'Medical checkup at government hospital. Pay RM50.',
    effect: { type: 'money', value: -50 },
  },
  {
    id: 'jm10', title: 'Raya Angpow', description: 'Open house collection! Collect RM25 from every player.',
    effect: { type: 'collect_all', value: 25 },
  },
];

export const KRISIS_NASIONAL_CARDS: GameCard[] = [
  {
    id: 'kn1', title: 'Flood Season!', description: 'Monsoon floods hit your constituency! Pay RM75 for relief.',
    effect: { type: 'money', value: -75 },
  },
  {
    id: 'kn2', title: 'Cabinet Reshuffle', description: 'You got promoted! Move forward 3 spaces.',
    effect: { type: 'move', value: 3 },
  },
  {
    id: 'kn3', title: 'Haze Crisis', description: 'Indonesian haze! Pay RM50 for face masks and health costs.',
    effect: { type: 'money', value: -50 },
  },
  {
    id: 'kn4', title: 'Sharemarket Rally', description: 'KLCI surges! Collect RM150.',
    effect: { type: 'money', value: 150 },
  },
  {
    id: 'kn5', title: 'No-Confidence Motion', description: 'Back to Tahanan SPR — political crisis!',
    effect: { type: 'jail', value: 0 },
  },
  {
    id: 'kn6', title: 'CPO Price Boom', description: 'Palm oil hits RM5000/tonne! Collect RM100.',
    effect: { type: 'money', value: 100 },
  },
  {
    id: 'kn7', title: 'Go to Putrajaya', description: 'The PM summons you! Go directly to Putrajaya.',
    effect: { type: 'go_to', value: 37 },
  },
  {
    id: 'kn8', title: 'Road Protest', description: 'Toll hike backlash! Move back 3 spaces.',
    effect: { type: 'move', value: -3 },
  },
  {
    id: 'kn9', title: 'Currency Depreciation', description: 'Ringgit weakens! Pay RM50 to every player.',
    effect: { type: 'pay_all', value: 50 },
  },
  {
    id: 'kn10', title: 'Infrastructure Upgrade', description: 'New highway in your area! Collect RM200.',
    effect: { type: 'money', value: 200 },
  },
];

// --- Simulated Market Data ---
export interface MarketState {
  klci: number;
  klciChange: number;
  cpoPrice: number;
  cpoChange: number;
  ringgitUsd: number;
  ringgitChange: number;
  inflationMultiplier: number;
  federalRentBonus: number;
  timestamp: string;
}

export const DEFAULT_MARKET_STATE: MarketState = {
  klci: 1587.3,
  klciChange: -0.8,
  cpoPrice: 3950,
  cpoChange: 2.3,
  ringgitUsd: 4.47,
  ringgitChange: -0.2,
  inflationMultiplier: 1.0,
  federalRentBonus: 1.0,
  timestamp: new Date().toISOString(),
};

// --- AI Satirical Quote Bank (fallback when LLM unavailable) ---
export const FALLBACK_QUOTES: Record<string, string[]> = {
  PH: [
    'We promise change! ...just wait one more term, can or not?',
    'Ini janji manifesto! But budget tak cukup lah...',
    'Reformasi! But first, let me check my WhatsApp group.',
    'We are the government of the day! Until the next GE lah.',
    'Transparency is our policy! *hides file under table*',
  ],
  PN: [
    'Green wave coming! Surf\'s up, brader!',
    'We don\'t need federal funds! ...actually, yes we do.',
    'Hijau means progress! Also means we take your money.',
    'The rakyat chose us! ...in certain states only.',
    'We are the true opposition! ...except when we\'re not.',
  ],
  BN: [
    'We\'ve been ruling since Merdeka! Experience matters, ok?',
    'BN is back, baby! Like a bad headache that won\'t go away.',
    'Stability! That\'s our brand. Don\'t ask about progress.',
    'We have the machinery! ...the election one, not the factory.',
    'Sabah & Sarawak are our friends! When it\'s convenient.',
  ],
  GPS: [
    'Sarawak autonomous! Don\'t simply come and kaypoh.',
    'We support whoever gives us the most allocation!',
    'Sarawak First! Malaysia Second... maybe third.',
    'Our Chief Minister has been here since 1981! Experience!',
    'Don\'t play play with Sarawak, we have oil money!',
  ],
  GRS: [
    'Sabah for Sabahans! ...and anyone else who votes for us.',
    'We are the kingmakers! At least we tell ourselves that.',
    'GRS means Gabungan Rakyat Sabah! Or was it Gabungan Rakyat Sleepy?',
    'Sabah issues are federal issues! But don\'t expect federal action.',
    'Hijrah to GRS! Everyone is welcome, except during election.',
  ],
  IND: [
    'I am independent! Nobody tells me what to do! ...except my supporters.',
    'Fence-sitter? No lah, I sit on the roof!',
    'Independent means I can jump to any coalition! Flexibility!',
    'Don\'t label me! I am the rakyat\'s voice! *echo echo*',
    'I don\'t need a party! I have... um... myself.',
  ],
};

// Helper to get a random fallback quote for a coalition
export function getRandomQuote(coalitionId: string): string {
  const quotes = FALLBACK_QUOTES[coalitionId] || FALLBACK_QUOTES.IND;
  const idx = Math.floor(Math.random() * quotes.length);
  return quotes[idx] || '...no comment at this time.';
}

// --- Tile position helpers for the square loop ---
// Bottom row: tiles 0-10, right to left
// Right col: tiles 10-20, bottom to top  
// Top row: tiles 20-30, left to right
// Left col: tiles 30-40(=0), top to bottom
export function getTilePosition(tileId: number, boardSize = 20): { x: number; z: number; rotation: number } {
  const half = boardSize / 2;
  const tilesPerSide = 10;
  
  if (tileId === 0) return { x: half, z: half, rotation: 0 };
  if (tileId === 10) return { x: -half, z: half, rotation: Math.PI / 2 };
  if (tileId === 20) return { x: -half, z: -half, rotation: Math.PI };
  if (tileId === 30) return { x: half, z: -half, rotation: -Math.PI / 2 };

  // Bottom row: 1-9, right to left
  if (tileId >= 1 && tileId <= 9) {
    const t = tileId / tilesPerSide;
    return {
      x: half - t * boardSize,
      z: half,
      rotation: 0,
    };
  }
  // Right column: 11-19, bottom to top
  if (tileId >= 11 && tileId <= 19) {
    const t = (tileId - 10) / tilesPerSide;
    return {
      x: -half,
      z: half - t * boardSize,
      rotation: Math.PI / 2,
    };
  }
  // Top row: 21-29, left to right
  if (tileId >= 21 && tileId <= 29) {
    const t = (tileId - 20) / tilesPerSide;
    return {
      x: -half + t * boardSize,
      z: -half,
      rotation: Math.PI,
    };
  }
  // Left column: 31-39, top to bottom
  if (tileId >= 31 && tileId <= 39) {
    const t = (tileId - 30) / tilesPerSide;
    return {
      x: half,
      z: -half + t * boardSize,
      rotation: -Math.PI / 2,
    };
  }

  return { x: 0, z: 0, rotation: 0 };
}