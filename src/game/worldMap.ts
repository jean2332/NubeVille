import { SeatPoint, ZoneId } from '../types/game';

export const TILE_SIZE = 32;
export const MAP_COLS = 56;
export const MAP_ROWS = 42;
export const WORLD_WIDTH = MAP_COLS * TILE_SIZE; // 1792
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE; // 1344

export interface RectBox {
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: 'wall' | 'table' | 'bookshelf' | 'counter' | 'water' | 'fence' | 'tree' | 'lamp';
}

export interface LampLight {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface GardenPlotCoord {
  index: number;
  tileX: number;
  tileY: number;
}

export const GARDEN_PLOTS: GardenPlotCoord[] = (() => {
  const plots: GardenPlotCoord[] = [];
  const startX = 42;
  const startY = 17;
  let idx = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      plots.push({
        index: idx++,
        tileX: startX + col * 2,
        tileY: startY + row * 2,
      });
    }
  }
  return plots;
})();

export const FISHING_SPOT = {
  x: 6.2 * TILE_SIZE,
  y: 30.5 * TILE_SIZE,
  radius: 56,
};

export const SEATS: SeatPoint[] = [
  // Cafetería Nube (Center)
  { id: 'cafe_t1_l', zone: 'cafe', x: 23.5 * TILE_SIZE, y: 20.5 * TILE_SIZE, label: 'Mesa Ventana', facing: 'right' },
  { id: 'cafe_t1_r', zone: 'cafe', x: 26.5 * TILE_SIZE, y: 20.5 * TILE_SIZE, label: 'Mesa Ventana', facing: 'left' },
  { id: 'cafe_t2_l', zone: 'cafe', x: 30.5 * TILE_SIZE, y: 20.5 * TILE_SIZE, label: 'Mesa Lámpara', facing: 'right' },
  { id: 'cafe_t2_r', zone: 'cafe', x: 33.5 * TILE_SIZE, y: 20.5 * TILE_SIZE, label: 'Mesa Lámpara', facing: 'left' },
  { id: 'cafe_t3_l', zone: 'cafe', x: 23.5 * TILE_SIZE, y: 24.0 * TILE_SIZE, label: 'Rincón Lofi', facing: 'right' },
  { id: 'cafe_t3_r', zone: 'cafe', x: 26.5 * TILE_SIZE, y: 24.0 * TILE_SIZE, label: 'Rincón Lofi', facing: 'left' },
  { id: 'cafe_t4_l', zone: 'cafe', x: 30.5 * TILE_SIZE, y: 24.0 * TILE_SIZE, label: 'Mesa Café', facing: 'right' },
  { id: 'cafe_t4_r', zone: 'cafe', x: 33.5 * TILE_SIZE, y: 24.0 * TILE_SIZE, label: 'Mesa Café', facing: 'left' },

  // Biblioteca Vela (North)
  { id: 'lib_d1_l', zone: 'library', x: 22.5 * TILE_SIZE, y: 8.5 * TILE_SIZE, label: 'Escritorio Silencioso', facing: 'right' },
  { id: 'lib_d1_r', zone: 'library', x: 25.5 * TILE_SIZE, y: 8.5 * TILE_SIZE, label: 'Escritorio Silencioso', facing: 'left' },
  { id: 'lib_d2_l', zone: 'library', x: 30.5 * TILE_SIZE, y: 8.5 * TILE_SIZE, label: 'Mesa de Velas', facing: 'right' },
  { id: 'lib_d2_r', zone: 'library', x: 33.5 * TILE_SIZE, y: 8.5 * TILE_SIZE, label: 'Mesa de Velas', facing: 'left' },
  { id: 'lib_d3_l', zone: 'library', x: 26.5 * TILE_SIZE, y: 11.2 * TILE_SIZE, label: 'Mesa Central', facing: 'right' },
  { id: 'lib_d3_r', zone: 'library', x: 29.5 * TILE_SIZE, y: 11.2 * TILE_SIZE, label: 'Mesa Central', facing: 'left' },

  // Muelle Lunar (South-West)
  { id: 'pier_b1', zone: 'pier', x: 13.5 * TILE_SIZE, y: 29.2 * TILE_SIZE, label: 'Banca del Muelle', facing: 'left' },

  // Jardín Comunitario (East)
  { id: 'garden_b1', zone: 'garden', x: 42.5 * TILE_SIZE, y: 15.2 * TILE_SIZE, label: 'Banca del Jardín', facing: 'right' },
  { id: 'garden_b2', zone: 'garden', x: 47.5 * TILE_SIZE, y: 26.2 * TILE_SIZE, label: 'Banca de Flores', facing: 'left' },
];

const tileRect = (tx: number, ty: number, tw: number, th: number, kind?: RectBox['kind']): RectBox => ({
  x: tx * TILE_SIZE,
  y: ty * TILE_SIZE,
  w: tw * TILE_SIZE,
  h: th * TILE_SIZE,
  kind,
});

// Colliders keep walkways wide and unobstructed while preventing walking through walls/tables/water
export const COLLIDERS: RectBox[] = [
  // World perimeter
  tileRect(0, 0, MAP_COLS, 1.5, 'wall'),
  tileRect(0, MAP_ROWS - 1, MAP_COLS, 1.5, 'wall'),
  tileRect(0, 0, 1.5, MAP_ROWS, 'wall'),
  tileRect(MAP_COLS - 1.5, 0, 1.5, MAP_ROWS, 'wall'),

  // Cafetería Nube walls (with North doorway x:26..30, South doorway x:26..30, West doorway y:20..23, East doorway y:20..23)
  tileRect(20, 15, 6.2, 2.1, 'wall'),
  tileRect(29.8, 15, 6.2, 2.1, 'wall'),
  tileRect(20, 26.2, 6.2, 0.8, 'wall'),
  tileRect(29.8, 26.2, 6.2, 0.8, 'wall'),
  tileRect(20, 15, 0.8, 5.0, 'wall'),
  tileRect(20, 23.0, 0.8, 4.0, 'wall'),
  tileRect(35.2, 15, 0.8, 5.0, 'wall'),
  tileRect(35.2, 23.0, 0.8, 4.0, 'wall'),

  // Espresso bar counter in Cafetería Nube
  tileRect(21.2, 17.5, 4.5, 1.3, 'counter'),
  // Cafetería 4 study tables (between seat pairs)
  tileRect(24.3, 19.9, 1.4, 1.2, 'table'),
  tileRect(31.3, 19.9, 1.4, 1.2, 'table'),
  tileRect(24.3, 23.4, 1.4, 1.2, 'table'),
  tileRect(31.3, 23.4, 1.4, 1.2, 'table'),

  // Biblioteca Vela walls & tall bookshelves (South entrance x:26..30)
  tileRect(19, 2.5, 18, 2.2, 'bookshelf'),
  tileRect(19, 2.5, 1.2, 10.5, 'bookshelf'),
  tileRect(35.8, 2.5, 1.2, 10.5, 'bookshelf'),
  tileRect(19, 12.4, 7.2, 0.7, 'wall'),
  tileRect(29.8, 12.4, 7.2, 0.7, 'wall'),
  // Biblioteca desks
  tileRect(23.3, 7.9, 1.4, 1.2, 'table'),
  tileRect(31.3, 7.9, 1.4, 1.2, 'table'),
  tileRect(27.3, 10.6, 1.4, 1.2, 'table'),

  // Muelle Lunar water bounds (keeping wooden pier x:5..17, y:29.3..31.8 walkable!)
  tileRect(1.5, 27.2, 16.5, 2.1, 'water'), // top water band
  tileRect(1.5, 31.8, 16.5, 8.5, 'water'), // bottom water band
  tileRect(1.5, 29.3, 3.6, 2.5, 'water'), // left end water past pier tip

  // Jardín Comunitario picket fence (West entrance y:19..23)
  tileRect(38.5, 13.5, 14.5, 0.6, 'fence'),
  tileRect(38.5, 28.0, 14.5, 0.6, 'fence'),
  tileRect(52.4, 13.5, 0.6, 15.1, 'fence'),
  tileRect(38.5, 13.5, 0.6, 5.5, 'fence'),
  tileRect(38.5, 23.0, 0.6, 5.6, 'fence'),
];

export const LAMPS: LampLight[] = [
  // Streetlamps along cobblestone paths
  { x: 25.5 * TILE_SIZE, y: 14.2 * TILE_SIZE, radius: 130, color: '#FFD27D' },
  { x: 30.5 * TILE_SIZE, y: 14.2 * TILE_SIZE, radius: 130, color: '#FFD27D' },
  { x: 18.8 * TILE_SIZE, y: 21.5 * TILE_SIZE, radius: 140, color: '#FFD27D' },
  { x: 37.2 * TILE_SIZE, y: 21.0 * TILE_SIZE, radius: 140, color: '#FFD27D' },
  { x: 28.0 * TILE_SIZE, y: 28.5 * TILE_SIZE, radius: 140, color: '#FFD27D' },
  // Cafetería table lamps
  { x: 25.0 * TILE_SIZE, y: 20.3 * TILE_SIZE, radius: 120, color: '#FFCF75' },
  { x: 32.0 * TILE_SIZE, y: 20.3 * TILE_SIZE, radius: 120, color: '#FFCF75' },
  { x: 25.0 * TILE_SIZE, y: 23.8 * TILE_SIZE, radius: 120, color: '#FFCF75' },
  { x: 32.0 * TILE_SIZE, y: 23.8 * TILE_SIZE, radius: 120, color: '#FFCF75' },
  // Biblioteca floating candles
  { x: 24.0 * TILE_SIZE, y: 6.5 * TILE_SIZE, radius: 130, color: '#FFE08A' },
  { x: 32.0 * TILE_SIZE, y: 6.5 * TILE_SIZE, radius: 130, color: '#FFE08A' },
  { x: 28.0 * TILE_SIZE, y: 9.2 * TILE_SIZE, radius: 130, color: '#FFE08A' },
  // Pier lanterns
  { x: 15.0 * TILE_SIZE, y: 29.0 * TILE_SIZE, radius: 125, color: '#F9C784' },
  { x: 6.2 * TILE_SIZE, y: 29.0 * TILE_SIZE, radius: 135, color: '#A5E6FF' },
  // Garden lanterns
  { x: 40.5 * TILE_SIZE, y: 15.5 * TILE_SIZE, radius: 125, color: '#FFE29A' },
  { x: 50.5 * TILE_SIZE, y: 26.0 * TILE_SIZE, radius: 125, color: '#FFE29A' },
];

export function detectZone(x: number, y: number): ZoneId {
  const tx = x / TILE_SIZE;
  const ty = y / TILE_SIZE;
  if (tx >= 19 && tx <= 37 && ty >= 2 && ty <= 13.5) return 'library';
  if (tx >= 20 && tx <= 36 && ty >= 15 && ty <= 27) return 'cafe';
  if (tx <= 19.5 && ty >= 23) return 'pier';
  if (tx >= 38 && ty >= 12.5 && ty <= 30) return 'garden';
  return 'plaza';
}

function circleIntersectsRect(cx: number, cy: number, r: number, box: RectBox): boolean {
  const closestX = Math.max(box.x, Math.min(cx, box.x + box.w));
  const closestY = Math.max(box.y, Math.min(cy, box.y + box.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

/**
 * Resolves movement with axis separation and corner-slide assist so clouds never snag on corners.
 */
export function moveWithCollision(
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius = 12,
): { x: number; y: number } {
  let nx = x + dx;
  let ny = y;

  const hitsX = (cx: number, cy: number) =>
    COLLIDERS.some((b) => circleIntersectsRect(cx, cy, radius, b));

  if (hitsX(nx, ny)) {
    // Try slight vertical nudge to slide smoothly around table/doorway corners
    let slid = false;
    for (const nudge of [-4, 4, -8, 8]) {
      if (!hitsX(nx, ny + nudge)) {
        ny += nudge * 0.45;
        slid = true;
        break;
      }
    }
    if (!slid) {
      nx = x;
    }
  }

  ny += dy;
  if (hitsX(nx, ny)) {
    let slid = false;
    for (const nudge of [-4, 4, -8, 8]) {
      if (!hitsX(nx + nudge, ny)) {
        nx += nudge * 0.45;
        slid = true;
        break;
      }
    }
    if (!slid) {
      ny = y;
    }
  }

  return {
    x: Math.max(TILE_SIZE * 2, Math.min(WORLD_WIDTH - TILE_SIZE * 2, nx)),
    y: Math.max(TILE_SIZE * 2, Math.min(WORLD_HEIGHT - TILE_SIZE * 2, ny)),
  };
}
