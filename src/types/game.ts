export type GamePhase = 'TITLE' | 'PLAYING';

export type CloudExpressionId =
  | 'panic'
  | 'wink'
  | 'happy'
  | 'surprised'
  | 'inspired'
  | 'grumpy'
  | 'stressed'
  | 'exhausted'
  | 'nervous';

export interface ExpressionMeta {
  id: CloudExpressionId;
  index: number; // 0..8 in 3x3 sprite sheet
  label: string;
  shortLabel: string;
}

export const CLOUD_EXPRESSIONS: ExpressionMeta[] = [
  { id: 'panic', index: 0, label: 'Pánico / Llorando', shortLabel: 'Pánico' },
  { id: 'wink', index: 1, label: 'Traviesa guiñando', shortLabel: 'Traviesa' },
  { id: 'happy', index: 2, label: 'Feliz / Motivada', shortLabel: 'Feliz' },
  { id: 'surprised', index: 3, label: 'Sorprendida', shortLabel: 'Sorpresa' },
  { id: 'inspired', index: 4, label: 'Inspirada', shortLabel: 'Inspirada' },
  { id: 'grumpy', index: 5, label: 'Frustrada / Gruñona', shortLabel: 'Gruñona' },
  { id: 'stressed', index: 6, label: 'Estresada / Sudando', shortLabel: 'Estresada' },
  { id: 'exhausted', index: 7, label: 'Agotada con estrellitas', shortLabel: 'Agotada' },
  { id: 'nervous', index: 8, label: 'Nerviosa llorando', shortLabel: 'Nerviosa' },
];

export type CloudTintId = 'classic' | 'sky' | 'sunset' | 'lavender';

export interface CloudTintMeta {
  id: CloudTintId;
  label: string;
  swatch: string;
  highlightRgb: [number, number, number];
  shadeRgb: [number, number, number];
}

export const CLOUD_TINTS: CloudTintMeta[] = [
  {
    id: 'classic',
    label: 'Blanca clásica',
    swatch: '#F8FBFF',
    highlightRgb: [255, 255, 255],
    shadeRgb: [215, 234, 255],
  },
  {
    id: 'sky',
    label: 'Celeste cielo',
    swatch: '#BDE8FF',
    highlightRgb: [222, 245, 255],
    shadeRgb: [152, 214, 248],
  },
  {
    id: 'sunset',
    label: 'Rosita atardecer',
    swatch: '#FFD0E0',
    highlightRgb: [255, 234, 243],
    shadeRgb: [255, 186, 210],
  },
  {
    id: 'lavender',
    label: 'Lavanda',
    swatch: '#DFCFFF',
    highlightRgb: [242, 233, 255],
    shadeRgb: [204, 179, 250],
  },
];

export type CloudAccessoryId = 'none' | 'headphones' | 'scarf';

export interface AccessoryMeta {
  id: CloudAccessoryId;
  label: string;
}

export const CLOUD_ACCESSORIES: AccessoryMeta[] = [
  { id: 'none', label: 'Sin accesorio' },
  { id: 'headphones', label: 'Audífonos lofi' },
  { id: 'scarf', label: 'Bufanda cálida' },
];

export type ZoneId = 'plaza' | 'cafe' | 'library' | 'pier' | 'garden';

export const ZONE_LABELS: Record<ZoneId, string> = {
  plaza: 'Plaza Central',
  cafe: 'Cafetería Nube',
  library: 'Biblioteca Vela',
  pier: 'Muelle Lunar',
  garden: 'Jardín Comunitario',
};

export type StudyModeId = 'pomodoro_25' | 'pomodoro_50' | 'stopwatch';

export interface StudySessionState {
  isActive: boolean;
  isPaused: boolean;
  mode: StudyModeId;
  phase: 'focus' | 'break';
  elapsedSeconds: number;
  targetSeconds: number;
  subject: string;
  unclaimedFocusSeconds: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  tint: CloudTintId;
  accessory: CloudAccessoryId;
  expression: CloudExpressionId;
  roomCode: string;
}

export interface CloudActor {
  id: string;
  name: string;
  tint: CloudTintId;
  accessory: CloudAccessoryId;
  expression: CloudExpressionId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  isSitting: boolean;
  seatId: string | null;
  subject: string;
  isStudying: boolean;
  isBot?: boolean;
  isRemote?: boolean;
  walkPhase: number;
  lastUpdated: number;
}

export type CheerKind = 'heart' | 'star';

export interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  kind: 'heart' | 'star' | 'sparkle' | 'petal' | 'ripple';
  color: string;
  size: number;
}

export type FlowerSpecies = 'sunstar' | 'tulip' | 'moonbloom' | 'cloudlotus' | 'lavender';

export interface GardenFlower {
  plotIndex: number;
  species: FlowerSpecies;
  subject: string;
  plantedAt: number;
  ownerName: string;
}

export interface StudyRecord {
  id: string;
  subject: string;
  minutes: number;
  starsEarned: number;
  dateKey: string; // YYYY-MM-DD
  timestamp: number;
}

export interface ProgressData {
  stars: number;
  streakDays: number;
  lastStudyDate: string | null;
  records: StudyRecord[];
  gardenFlowers: GardenFlower[];
  fishCaught: number;
}

export interface AudioVolumes {
  muted: boolean;
  lofi: number;
  rain: number;
  cafe: number;
  bells: number;
}

export type InteractableType = 'seat' | 'fishing' | 'garden_board';

export interface SeatPoint {
  id: string;
  zone: ZoneId;
  x: number;
  y: number;
  label: string;
  facing: 'left' | 'right';
}

export interface FishingState {
  active: boolean;
  stage: 'idle' | 'casting' | 'waiting' | 'bite' | 'caught' | 'missed';
  timer: number;
  biteWindow: number;
  lastCatchName: string | null;
  lastCatchStars: number;
}
