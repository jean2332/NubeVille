import {
  CLOUD_EXPRESSIONS,
  CLOUD_TINTS,
  CloudAccessoryId,
  CloudExpressionId,
  CloudTintId,
} from '../types/game';

const SPRITE_URL = '/assets/aistudio/773a9726-db08-4c6c-9814-0871205b77b9_71ba92e9.jpg';
const TARGET_SIZE = 44; // Crisp 16-bit pixel grid per character frame

type SpriteCache = Record<CloudTintId, Record<CloudExpressionId, HTMLCanvasElement>>;

let cachedSprites: SpriteCache | null = null;
let loadingPromise: Promise<SpriteCache> | null = null;
const loadListeners = new Set<() => void>();

export function onSpritesReady(cb: () => void): () => void {
  if (cachedSprites) {
    cb();
    return () => {};
  }
  loadListeners.add(cb);
  ensureSpritesLoaded().catch(() => {});
  return () => {
    loadListeners.delete(cb);
  };
}

export function getCachedSprite(
  tint: CloudTintId,
  expression: CloudExpressionId,
): HTMLCanvasElement | null {
  if (!cachedSprites) return null;
  return cachedSprites[tint]?.[expression] ?? null;
}

function isNearWhite(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return r > 208 && g > 208 && b > 208 && max - min < 36;
}

function isDarkOutline(r: number, g: number, b: number): boolean {
  return r < 65 && g < 85 && b < 125;
}

function processCellToBaseCanvas(
  img: HTMLImageElement,
  col: number,
  row: number,
): HTMLCanvasElement {
  const cellW = Math.floor(img.width / 3);
  const cellH = Math.floor(img.height / 3);
  const sx = Math.floor((col * img.width) / 3);
  const sy = Math.floor((row * img.height) / 3);

  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = cellW;
  rawCanvas.height = cellH;
  const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true })!;
  rawCtx.drawImage(img, sx, sy, cellW, cellH, 0, 0, cellW, cellH);

  const imgData = rawCtx.getImageData(0, 0, cellW, cellH);
  const data = imgData.data;
  const total = cellW * cellH;
  const visited = new Uint8Array(total);
  const isBg = new Uint8Array(total);

  // BFS flood fill from all 4 borders to remove only exterior white background
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const tryEnqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= cellW || y >= cellH) return;
    const idx = y * cellW + x;
    if (visited[idx]) return;
    const p = idx * 4;
    if (isNearWhite(data[p], data[p + 1], data[p + 2])) {
      visited[idx] = 1;
      isBg[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < cellW; x++) {
    tryEnqueue(x, 0);
    tryEnqueue(x, cellH - 1);
  }
  for (let y = 0; y < cellH; y++) {
    tryEnqueue(0, y);
    tryEnqueue(cellW - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % cellW;
    const y = (idx - x) / cellW;
    tryEnqueue(x + 1, y);
    tryEnqueue(x - 1, y);
    tryEnqueue(x, y + 1);
    tryEnqueue(x, y - 1);
  }

  // Remove anti-aliased bright fringe touching transparent background
  for (let y = 1; y < cellH - 1; y++) {
    for (let x = 1; x < cellW - 1; x++) {
      const idx = y * cellW + x;
      if (isBg[idx]) continue;
      const p = idx * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const lum = (r + g + b) / 3;
      if (lum > 185 && Math.max(r, g, b) - Math.min(r, g, b) < 42) {
        if (
          isBg[idx - 1] ||
          isBg[idx + 1] ||
          isBg[idx - cellW] ||
          isBg[idx + cellW]
        ) {
          isBg[idx] = 1;
        }
      }
    }
  }

  let minX = cellW;
  let minY = cellH;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < cellH; y++) {
    for (let x = 0; x < cellW; x++) {
      const idx = y * cellW + x;
      const p = idx * 4;
      if (isBg[idx]) {
        data[p + 3] = 0;
      } else {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  rawCtx.putImageData(imgData, 0, 0);

  // Downsample with crisp center-point sampling onto a fixed pixel grid
  const outCanvas = document.createElement('canvas');
  outCanvas.width = TARGET_SIZE;
  outCanvas.height = TARGET_SIZE;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true })!;
  outCtx.imageSmoothingEnabled = false;

  if (maxX <= minX || maxY <= minY) return outCanvas;

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const pad = 2;
  const avail = TARGET_SIZE - pad * 2;
  const scale = Math.min(avail / cropW, avail / cropH);
  const drawW = Math.round(cropW * scale);
  const drawH = Math.round(cropH * scale);
  const destX = Math.floor((TARGET_SIZE - drawW) / 2);
  const destY = TARGET_SIZE - pad - drawH;

  outCtx.drawImage(
    rawCanvas,
    minX,
    minY,
    cropW,
    cropH,
    destX,
    destY,
    drawW,
    drawH,
  );

  // Crisp alpha threshold so 16-bit edges never look muddy
  const outImg = outCtx.getImageData(0, 0, TARGET_SIZE, TARGET_SIZE);
  const od = outImg.data;
  for (let i = 0; i < od.length; i += 4) {
    if (od[i + 3] < 130) {
      od[i + 3] = 0;
    } else {
      od[i + 3] = 255;
      // Snap near-outline murky pixels cleanly to deep navy
      if (isDarkOutline(od[i], od[i + 1], od[i + 2])) {
        od[i] = 15;
        od[i + 1] = 35;
        od[i + 2] = 74;
      }
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}

function createTintedVariant(
  baseCanvas: HTMLCanvasElement,
  tintId: CloudTintId,
): HTMLCanvasElement {
  if (tintId === 'classic') return baseCanvas;
  const tintMeta = CLOUD_TINTS.find((t) => t.id === tintId)!;
  const canvas = document.createElement('canvas');
  canvas.width = baseCanvas.width;
  canvas.height = baseCanvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(baseCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];

    // Identify white or soft-icy-blue cloud body pixels; keep green sprouts, pink cheeks/hearts, gold stars, dark navy outlines untouched
    const isNeutralOrIceBlue =
      b >= 195 &&
      r >= 165 &&
      g >= 180 &&
      r - b < 18 &&
      g - r < 24 &&
      b - r < 72;

    if (isNeutralOrIceBlue) {
      // Blend factor based on brightness (white highlight vs cool ice shadow)
      const lum = (r + g + b) / (3 * 255);
      const t = Math.max(0, Math.min(1, (lum - 0.78) / 0.22));
      d[i] = Math.round(tintMeta.shadeRgb[0] * (1 - t) + tintMeta.highlightRgb[0] * t);
      d[i + 1] = Math.round(tintMeta.shadeRgb[1] * (1 - t) + tintMeta.highlightRgb[1] * t);
      d[i + 2] = Math.round(tintMeta.shadeRgb[2] * (1 - t) + tintMeta.highlightRgb[2] * t);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export function ensureSpritesLoaded(): Promise<SpriteCache> {
  if (cachedSprites) return Promise.resolve(cachedSprites);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const baseGrid: HTMLCanvasElement[] = [];
      for (let idx = 0; idx < 9; idx++) {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        baseGrid.push(processCellToBaseCanvas(img, col, row));
      }

      const cache = {} as SpriteCache;
      for (const tint of CLOUD_TINTS) {
        cache[tint.id] = {} as Record<CloudExpressionId, HTMLCanvasElement>;
        for (const expr of CLOUD_EXPRESSIONS) {
          cache[tint.id][expr.id] = createTintedVariant(baseGrid[expr.index], tint.id);
        }
      }
      cachedSprites = cache;
      loadListeners.forEach((cb) => cb());
      loadListeners.clear();
      resolve(cache);
    };
    img.onerror = (err) => {
      loadingPromise = null;
      reject(err);
    };
    img.src = SPRITE_URL;
  });

  return loadingPromise;
}

/**
 * Draws crisp 16-bit pixel accessories on top of the cloud character.
 * Coordinate frame assumes sprite is drawn inside (dx, dy, size, size) with TARGET_SIZE=44 grid.
 */
export function drawCloudAccessory(
  ctx: CanvasRenderingContext2D,
  accessory: CloudAccessoryId,
  dx: number,
  dy: number,
  drawSize: number,
  bobOffset = 0,
): void {
  if (accessory === 'none') return;
  const px = drawSize / TARGET_SIZE;
  const p = (gx: number, gy: number, gw: number, gh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(dx + gx * px),
      Math.round(dy + (gy + bobOffset) * px),
      Math.max(1, Math.round(gw * px)),
      Math.max(1, Math.round(gh * px)),
    );
  };

  if (accessory === 'headphones') {
    // Cozy warm-amber/coral headband arching around top behind sprout
    p(9, 10, 26, 2, '#0F234A');
    p(10, 11, 24, 2, '#D9825B');
    p(7, 12, 4, 8, '#0F234A');
    p(33, 12, 4, 8, '#0F234A');
    // Left cushioned earcup
    p(4, 17, 6, 10, '#0F234A');
    p(5, 18, 4, 8, '#F4A261');
    p(6, 19, 2, 6, '#FFD6A5');
    // Right cushioned earcup
    p(34, 17, 6, 10, '#0F234A');
    p(35, 18, 4, 8, '#F4A261');
    p(36, 19, 2, 6, '#FFD6A5');
  } else if (accessory === 'scarf') {
    // Warm striped knitted scarf wrapped across lower chin/neck
    p(11, 31, 22, 5, '#0F234A');
    p(12, 32, 20, 3, '#E76F51');
    p(15, 32, 3, 3, '#F4A261');
    p(21, 32, 3, 3, '#F4A261');
    p(27, 32, 3, 3, '#F4A261');
    // Fluttering scarf tail on right side
    p(26, 35, 7, 6, '#0F234A');
    p(27, 35, 5, 5, '#E76F51');
    p(27, 37, 5, 2, '#F4A261');
  }
}

/**
 * Fallback crisp pixel-art cloud renderer used only during the initial few ms before image loads.
 */
export function drawFallbackCloud(
  ctx: CanvasRenderingContext2D,
  tint: CloudTintId,
  dx: number,
  dy: number,
  drawSize: number,
): void {
  const meta = CLOUD_TINTS.find((t) => t.id === tint) ?? CLOUD_TINTS[0];
  const fill = `rgb(${meta.highlightRgb.join(',')})`;
  const px = drawSize / 16;
  const r = (gx: number, gy: number, gw: number, gh: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(
      Math.round(dx + gx * px),
      Math.round(dy + gy * px),
      Math.max(1, Math.round(gw * px)),
      Math.max(1, Math.round(gh * px)),
    );
  };
  // Sprout
  r(5, 1, 3, 2, '#69C939');
  r(8, 1, 3, 2, '#8CE04B');
  // Navy outline
  r(3, 3, 10, 10, '#0F234A');
  r(2, 5, 12, 7, '#0F234A');
  // Body
  r(4, 4, 8, 8, fill);
  r(3, 6, 10, 5, fill);
  // Eyes & Blush
  r(5, 7, 1, 2, '#0F234A');
  r(10, 7, 1, 2, '#0F234A');
  r(4, 9, 2, 1, '#FF9EB5');
  r(10, 9, 2, 1, '#FF9EB5');
}
