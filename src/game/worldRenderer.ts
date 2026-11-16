import {
  CloudActor,
  FishingState,
  FloatingParticle,
  FlowerSpecies,
  GardenFlower,
  SeatPoint,
} from '../types/game';
import {
  drawCloudAccessory,
  drawFallbackCloud,
  getCachedSprite,
} from './spriteSheet';
import {
  FISHING_SPOT,
  GARDEN_PLOTS,
  LAMPS,
  MAP_COLS,
  MAP_ROWS,
  SEATS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './worldMap';

export interface RenderWorldParams {
  ctx: CanvasRenderingContext2D;
  viewW: number;
  viewH: number;
  camX: number;
  camY: number;
  time: number;
  actors: CloudActor[];
  playerId: string;
  flowers: GardenFlower[];
  particles: FloatingParticle[];
  nearbySeat: SeatPoint | null;
  nearFishing: boolean;
  hoveredActorId: string | null;
  fishingState: FishingState;
  isTouchDevice: boolean;
}

function drawPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawFlowerSprite(
  ctx: CanvasRenderingContext2D,
  species: FlowerSpecies,
  cx: number,
  cy: number,
  time: number,
  seed: number,
) {
  const sway = Math.round(Math.sin(time * 2.1 + seed) * 1.5);
  // Stem & leaves
  drawPixelRect(ctx, cx - 1, cy - 10, 3, 12, '#4A9C4D');
  drawPixelRect(ctx, cx - 5, cy - 5, 4, 3, '#69C95A');
  drawPixelRect(ctx, cx + 2, cy - 7, 4, 3, '#69C95A');

  const fx = cx + sway;
  const fy = cy - 14;
  if (species === 'sunstar') {
    drawPixelRect(ctx, fx - 5, fy - 5, 11, 11, '#FFD166');
    drawPixelRect(ctx, fx - 7, fy - 2, 15, 5, '#FFE08A');
    drawPixelRect(ctx, fx - 2, fy - 7, 5, 15, '#FFE08A');
    drawPixelRect(ctx, fx - 2, fy - 2, 5, 5, '#D97724');
  } else if (species === 'tulip') {
    drawPixelRect(ctx, fx - 4, fy - 5, 9, 8, '#FF7AA2');
    drawPixelRect(ctx, fx - 4, fy - 7, 3, 3, '#FFA6C1');
    drawPixelRect(ctx, fx + 2, fy - 7, 3, 3, '#FFA6C1');
    drawPixelRect(ctx, fx - 1, fy - 4, 3, 5, '#FFD1DF');
  } else if (species === 'moonbloom') {
    drawPixelRect(ctx, fx - 5, fy - 5, 11, 11, '#8BE9FD');
    drawPixelRect(ctx, fx - 3, fy - 3, 7, 7, '#E0FBFF');
    drawPixelRect(ctx, fx - 1, fy - 1, 3, 3, '#FFE066');
  } else if (species === 'cloudlotus') {
    drawPixelRect(ctx, fx - 6, fy - 3, 13, 6, '#FFC8DD');
    drawPixelRect(ctx, fx - 4, fy - 6, 9, 7, '#FFF0F6');
    drawPixelRect(ctx, fx - 1, fy - 3, 3, 3, '#FFAFCC');
  } else {
    // lavender
    drawPixelRect(ctx, fx - 2, fy - 9, 5, 11, '#B388EB');
    drawPixelRect(ctx, fx - 4, fy - 6, 3, 3, '#D4B8FF');
    drawPixelRect(ctx, fx + 2, fy - 4, 3, 3, '#D4B8FF');
    drawPixelRect(ctx, fx - 1, fy - 11, 3, 3, '#EFE3FF');
  }
}

export function renderWorld({
  ctx,
  viewW,
  viewH,
  camX,
  camY,
  time,
  actors,
  playerId,
  flowers,
  particles,
  nearbySeat,
  nearFishing,
  hoveredActorId,
  fishingState,
  isTouchDevice,
}: RenderWorldParams): void {
  ctx.imageSmoothingEnabled = false;

  // 1. Twilight sky backdrop
  const skyGrad = ctx.createLinearGradient(0, 0, 0, viewH);
  skyGrad.addColorStop(0, '#191731');
  skyGrad.addColorStop(0.65, '#272047');
  skyGrad.addColorStop(1, '#392954');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, viewW, viewH);

  // Subtle parallax twinkling stars in sky margins
  for (let i = 0; i < 45; i++) {
    const sx = ((i * 197 + 43) % viewW);
    const sy = ((i * 113 + 29) % viewH);
    const alpha = 0.25 + 0.45 * Math.abs(Math.sin(time * 1.4 + i));
    ctx.fillStyle = `rgba(255, 244, 214, ${alpha.toFixed(2)})`;
    const sz = i % 4 === 0 ? 3 : 2;
    ctx.fillRect(sx, sy, sz, sz);
  }

  ctx.save();
  ctx.translate(Math.round(-camX), Math.round(-camY));

  // 2. Cloud-island grass base
  drawPixelRect(ctx, TILE_SIZE, TILE_SIZE, WORLD_WIDTH - TILE_SIZE * 2, WORLD_HEIGHT - TILE_SIZE * 2, '#343054');
  // Soft inner cloud meadow island plateau
  drawPixelRect(ctx, TILE_SIZE * 2, TILE_SIZE * 2, WORLD_WIDTH - TILE_SIZE * 4, WORLD_HEIGHT - TILE_SIZE * 4, '#3D485E');

  // Subtle checkered meadow tufts across outer grounds
  for (let ty = 2; ty < MAP_ROWS - 2; ty++) {
    for (let tx = 2; tx < MAP_COLS - 2; tx++) {
      if ((tx + ty) % 3 === 0 && (tx * 7 + ty * 13) % 5 === 0) {
        drawPixelRect(ctx, tx * TILE_SIZE + 8, ty * TILE_SIZE + 12, 4, 3, '#4B5B73');
        drawPixelRect(ctx, tx * TILE_SIZE + 14, ty * TILE_SIZE + 10, 3, 3, '#4B5B73');
      }
    }
  }

  // 3. Cobblestone Pathways linking all 4 zones
  const drawCobbleZone = (tx: number, ty: number, tw: number, th: number) => {
    drawPixelRect(ctx, tx * TILE_SIZE, ty * TILE_SIZE, tw * TILE_SIZE, th * TILE_SIZE, '#5D547C');
    for (let y = ty; y < ty + th; y++) {
      for (let x = tx; x < tx + tw; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        drawPixelRect(ctx, px + 2, py + 2, 13, 12, '#716794');
        drawPixelRect(ctx, px + 17, py + 4, 13, 11, '#685E8A');
        drawPixelRect(ctx, px + 3, py + 17, 12, 12, '#6A608C');
        drawPixelRect(ctx, px + 17, py + 18, 13, 12, '#756B99');
      }
    }
  };

  // North corridor to Biblioteca Vela
  drawCobbleZone(26, 12, 4, 5);
  // Central courtyard apron around Cafetería Nube
  drawCobbleZone(18, 19, 22, 4);
  // South-west path to Muelle Lunar
  drawCobbleZone(15, 21, 5, 10);
  drawCobbleZone(26, 26, 4, 4);

  // 4. ZONE 1: CAFETERÍA NUBE (Center x:20..36, y:15..27)
  drawPixelRect(ctx, 20 * TILE_SIZE, 15 * TILE_SIZE, 16 * TILE_SIZE, 12 * TILE_SIZE, '#5C3C31');
  // Wooden floorboards
  for (let y = 17; y < 27; y++) {
    for (let x = 20; x < 36; x++) {
      const shade = (x + y) % 2 === 0 ? '#6E493A' : '#654234';
      drawPixelRect(ctx, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE - 2, shade);
      drawPixelRect(ctx, x * TILE_SIZE, y * TILE_SIZE + TILE_SIZE - 2, TILE_SIZE, 2, '#4F3227');
    }
  }
  // Cozy pastel cafe rug
  drawPixelRect(ctx, 22 * TILE_SIZE, 19 * TILE_SIZE, 12 * TILE_SIZE, 6.5 * TILE_SIZE, '#4B5E6D');
  drawPixelRect(ctx, 22.2 * TILE_SIZE, 19.2 * TILE_SIZE, 11.6 * TILE_SIZE, 6.1 * TILE_SIZE, '#7895A8');
  drawPixelRect(ctx, 22.5 * TILE_SIZE, 19.5 * TILE_SIZE, 11.0 * TILE_SIZE, 5.5 * TILE_SIZE, '#95B4C7');

  // Cafetería top wall & animated rainy windows
  drawPixelRect(ctx, 20 * TILE_SIZE, 15 * TILE_SIZE, 16 * TILE_SIZE, 2.1 * TILE_SIZE, '#3D293B');
  drawPixelRect(ctx, 20 * TILE_SIZE, 16.9 * TILE_SIZE, 16 * TILE_SIZE, 0.2 * TILE_SIZE, '#9C6D58');
  // Re-open north doorway arch
  drawCobbleZone(26.2, 15, 3.6, 2.2);

  // 3 Raindrop-animated windows on back wall
  for (const wx of [21.5, 24.0, 31.2, 33.6]) {
    const px = wx * TILE_SIZE;
    const py = 15.3 * TILE_SIZE;
    drawPixelRect(ctx, px - 2, py - 2, 44, 38, '#241826');
    drawPixelRect(ctx, px, py, 40, 34, '#2C3D63');
    // Distant warm city glow behind rain
    drawPixelRect(ctx, px + 4, py + 22, 8, 12, '#404875');
    drawPixelRect(ctx, px + 18, py + 18, 10, 16, '#4B4B7D');
    drawPixelRect(ctx, px + 7, py + 25, 3, 3, '#FFD17A');
    drawPixelRect(ctx, px + 22, py + 22, 3, 3, '#FFD17A');
    // Animated falling rain streaks inside window
    for (let r = 0; r < 6; r++) {
      const rx = px + 5 + r * 6;
      const ry = py + ((Math.floor(time * 42) + r * 11) % 30);
      drawPixelRect(ctx, rx, ry, 2, 5, '#9BD7FF');
    }
    // Window mullion bars
    drawPixelRect(ctx, px + 19, py, 2, 34, '#593A32');
    drawPixelRect(ctx, px, py + 16, 40, 2, '#593A32');
  }

  // Side & bottom cafe walls
  drawPixelRect(ctx, 20 * TILE_SIZE, 17 * TILE_SIZE, 0.8 * TILE_SIZE, 3 * TILE_SIZE, '#4B322C');
  drawPixelRect(ctx, 20 * TILE_SIZE, 23 * TILE_SIZE, 0.8 * TILE_SIZE, 4 * TILE_SIZE, '#4B322C');
  drawPixelRect(ctx, 35.2 * TILE_SIZE, 17 * TILE_SIZE, 0.8 * TILE_SIZE, 3 * TILE_SIZE, '#4B322C');
  drawPixelRect(ctx, 35.2 * TILE_SIZE, 23 * TILE_SIZE, 0.8 * TILE_SIZE, 4 * TILE_SIZE, '#4B322C');
  drawPixelRect(ctx, 20 * TILE_SIZE, 26.2 * TILE_SIZE, 6.2 * TILE_SIZE, 0.8 * TILE_SIZE, '#4B322C');
  drawPixelRect(ctx, 29.8 * TILE_SIZE, 26.2 * TILE_SIZE, 6.2 * TILE_SIZE, 0.8 * TILE_SIZE, '#4B322C');

  // Espresso Bar Counter
  drawPixelRect(ctx, 21.2 * TILE_SIZE, 17.5 * TILE_SIZE, 4.5 * TILE_SIZE, 1.3 * TILE_SIZE, '#8E5B46');
  drawPixelRect(ctx, 21.2 * TILE_SIZE, 17.4 * TILE_SIZE, 4.5 * TILE_SIZE, 0.35 * TILE_SIZE, '#D9A78B');
  // Espresso machine + steaming coffee cup
  drawPixelRect(ctx, 21.7 * TILE_SIZE, 17.1 * TILE_SIZE, 26, 22, '#4A4E69');
  drawPixelRect(ctx, 21.8 * TILE_SIZE, 17.3 * TILE_SIZE, 18, 8, '#9A8C98');
  drawPixelRect(ctx, 23.6 * TILE_SIZE, 17.6 * TILE_SIZE, 10, 8, '#FFF4E6');
  // Rising steam pixels
  const steamOff = Math.floor(time * 4) % 8;
  drawPixelRect(ctx, 23.7 * TILE_SIZE, 17.1 * TILE_SIZE - steamOff, 3, 4, 'rgba(255,255,255,0.65)');
  drawPixelRect(ctx, 23.9 * TILE_SIZE, 16.9 * TILE_SIZE - ((steamOff + 4) % 8), 3, 4, 'rgba(255,255,255,0.45)');
  // Pastry tray
  drawPixelRect(ctx, 24.4 * TILE_SIZE, 17.55 * TILE_SIZE, 24, 12, '#F4C095');
  drawPixelRect(ctx, 24.6 * TILE_SIZE, 17.65 * TILE_SIZE, 7, 7, '#E07A5F');
  drawPixelRect(ctx, 24.95 * TILE_SIZE, 17.65 * TILE_SIZE, 7, 7, '#F2CC8F');

  // Zone sign: Cafetería Nube
  drawPixelRect(ctx, 29.8 * TILE_SIZE, 17.15 * TILE_SIZE, 118, 22, '#2B1F2E');
  drawPixelRect(ctx, 30.0 * TILE_SIZE, 17.25 * TILE_SIZE, 114, 18, '#4F3647');
  ctx.fillStyle = '#FFE4B8';
  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Cafetería Nube', 31.8 * TILE_SIZE, 17.65 * TILE_SIZE);

  // 5. ZONE 2: BIBLIOTECA VELA (North x:19..37, y:2.5..13)
  drawPixelRect(ctx, 19 * TILE_SIZE, 2.5 * TILE_SIZE, 18 * TILE_SIZE, 10.6 * TILE_SIZE, '#3B2B45');
  for (let y = 4; y < 13; y++) {
    for (let x = 20; x < 36; x++) {
      const shade = (x + y) % 2 === 0 ? '#4B3654' : '#44304D';
      drawPixelRect(ctx, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE - 2, shade);
    }
  }
  // Plush terracotta-rose reading rug
  drawPixelRect(ctx, 21.5 * TILE_SIZE, 6.8 * TILE_SIZE, 13 * TILE_SIZE, 5.2 * TILE_SIZE, '#7A4252');
  drawPixelRect(ctx, 21.8 * TILE_SIZE, 7.1 * TILE_SIZE, 12.4 * TILE_SIZE, 4.6 * TILE_SIZE, '#9E586B');
  drawPixelRect(ctx, 22.1 * TILE_SIZE, 7.4 * TILE_SIZE, 11.8 * TILE_SIZE, 4.0 * TILE_SIZE, '#B46A7D');

  // Tall colorful bookshelves along north & side walls
  const drawBookshelf = (bx: number, by: number, bw: number, bh: number) => {
    drawPixelRect(ctx, bx, by, bw, bh, '#3C2621');
    drawPixelRect(ctx, bx + 4, by + 4, bw - 8, bh - 8, '#5C3B31');
    const bookColors = ['#F28482', '#F6BD60', '#84A59D', '#B8B8FF', '#F5CAC3', '#90DBF4'];
    for (let row = 0; row < 2; row++) {
      const ry = by + 8 + row * 24;
      if (ry + 16 > by + bh) break;
      drawPixelRect(ctx, bx + 6, ry + 16, bw - 12, 3, '#3C2621');
      for (let x = bx + 8; x < bx + bw - 14; x += 8) {
        const c = bookColors[Math.floor((x + row * 17) / 8) % bookColors.length];
        drawPixelRect(ctx, x, ry, 6, 15, c);
      }
    }
  };
  drawBookshelf(19 * TILE_SIZE, 2.5 * TILE_SIZE, 18 * TILE_SIZE, 2.2 * TILE_SIZE);
  drawBookshelf(19 * TILE_SIZE, 4.7 * TILE_SIZE, 1.2 * TILE_SIZE, 8.0 * TILE_SIZE);
  drawBookshelf(35.8 * TILE_SIZE, 4.7 * TILE_SIZE, 1.2 * TILE_SIZE, 8.0 * TILE_SIZE);
  drawPixelRect(ctx, 19 * TILE_SIZE, 12.4 * TILE_SIZE, 7.2 * TILE_SIZE, 0.7 * TILE_SIZE, '#4B322C');
  drawPixelRect(ctx, 29.8 * TILE_SIZE, 12.4 * TILE_SIZE, 7.2 * TILE_SIZE, 0.7 * TILE_SIZE, '#4B322C');

  // Biblioteca Sign
  drawPixelRect(ctx, 26.2 * TILE_SIZE, 4.85 * TILE_SIZE, 116, 20, '#2B1F2E');
  ctx.fillStyle = '#FFE4B8';
  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Biblioteca Vela', 28.0 * TILE_SIZE, 5.28 * TILE_SIZE);

  // 6. ZONE 3: MUELLE LUNAR (South-West x:1.5..18, y:27..40)
  // Starry twilight cloud-water
  const waterGrad = ctx.createLinearGradient(0, 27 * TILE_SIZE, 0, 40 * TILE_SIZE);
  waterGrad.addColorStop(0, '#1D254B');
  waterGrad.addColorStop(1, '#121633');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(1.5 * TILE_SIZE, 27.2 * TILE_SIZE, 16.5 * TILE_SIZE, 13 * TILE_SIZE);

  // Shimmering water ripples & glowing moon reflection
  for (let i = 0; i < 24; i++) {
    const wx = (2.5 + ((i * 3.7) % 14)) * TILE_SIZE + Math.sin(time + i) * 6;
    const wy = (28 + ((i * 2.3) % 11)) * TILE_SIZE;
    drawPixelRect(ctx, wx, wy, 14, 2, 'rgba(165, 224, 255, 0.35)');
  }
  // Glowing Moon Reflection in water
  const moonX = 4.2 * TILE_SIZE;
  const moonY = 35.0 * TILE_SIZE;
  drawPixelRect(ctx, moonX - 18, moonY - 18, 36, 36, 'rgba(255, 240, 175, 0.16)');
  drawPixelRect(ctx, moonX - 11, moonY - 11, 22, 22, 'rgba(255, 244, 198, 0.36)');
  // Luminous swimming star-fish silhouettes in water
  for (let f = 0; f < 4; f++) {
    const fx = (4 + f * 3.2) * TILE_SIZE + Math.sin(time * 0.9 + f * 2) * 20;
    const fy = (33.5 + (f % 2) * 3.2) * TILE_SIZE + Math.cos(time * 1.1 + f) * 6;
    drawPixelRect(ctx, fx, fy, 8, 5, '#8BE9FD');
    drawPixelRect(ctx, fx - 3, fy + 1, 3, 3, '#A5F3FC');
  }

  // Wooden Pier Boardwalk (x:5..18, y:29.3..31.8)
  drawPixelRect(ctx, 5 * TILE_SIZE, 29.3 * TILE_SIZE, 13 * TILE_SIZE, 2.5 * TILE_SIZE, '#6B4837');
  for (let px = 5 * TILE_SIZE; px < 18 * TILE_SIZE; px += 12) {
    drawPixelRect(ctx, px, 29.3 * TILE_SIZE, 10, 2.5 * TILE_SIZE, '#845A45');
    drawPixelRect(ctx, px + 10, 29.3 * TILE_SIZE, 2, 2.5 * TILE_SIZE, '#523426');
  }
  // Pier support posts
  for (const postX of [5.2, 9.0, 13.0, 17.0]) {
    drawPixelRect(ctx, postX * TILE_SIZE, 29.0 * TILE_SIZE, 10, 14, '#472D22');
    drawPixelRect(ctx, postX * TILE_SIZE, 31.6 * TILE_SIZE, 10, 14, '#472D22');
  }
  // Fishing bobber & ripples if fishing!
  if (fishingState.active) {
    const bobX = 3.6 * TILE_SIZE;
    const bobY = 30.6 * TILE_SIZE + Math.sin(time * 4) * (fishingState.stage === 'bite' ? 4 : 1.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(FISHING_SPOT.x - 10, FISHING_SPOT.y - 16);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    const ringR = 6 + ((time * 18) % 14);
    ctx.strokeStyle = fishingState.stage === 'bite' ? '#FFE066' : 'rgba(165, 230, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(bobX, bobY, ringR, 0, Math.PI * 2);
    ctx.stroke();

    drawPixelRect(ctx, bobX - 4, bobY - 4, 8, 8, '#FF6B8B');
    drawPixelRect(ctx, bobX - 4, bobY, 8, 4, '#FFFFFF');
  }

  // Muelle Lunar Sign
  drawPixelRect(ctx, 13.0 * TILE_SIZE, 27.6 * TILE_SIZE, 104, 20, '#1D2242');
  ctx.fillStyle = '#BAE6FD';
  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Muelle Lunar', 14.6 * TILE_SIZE, 28.03 * TILE_SIZE);

  // 7. ZONE 4: JARDÍN COMUNITARIO (East x:38.5..53, y:13.5..28.5)
  drawPixelRect(ctx, 38.5 * TILE_SIZE, 13.5 * TILE_SIZE, 14.5 * TILE_SIZE, 15 * TILE_SIZE, '#436B5D');
  drawPixelRect(ctx, 39.2 * TILE_SIZE, 14.2 * TILE_SIZE, 13.1 * TILE_SIZE, 13.6 * TILE_SIZE, '#4E7D6C');
  // Stepping stones inside garden
  for (let sy = 19.5; sy <= 22; sy += 1.2) {
    drawPixelRect(ctx, 39.6 * TILE_SIZE, sy * TILE_SIZE, 24, 14, '#7E7699');
    drawPixelRect(ctx, 40.7 * TILE_SIZE, (sy + 0.4) * TILE_SIZE, 20, 12, '#8F87AB');
  }
  // Picket fences around garden
  const drawFenceBar = (fx: number, fy: number, fw: number, fh: number) => {
    drawPixelRect(ctx, fx, fy, fw, fh, '#9E7358');
    drawPixelRect(ctx, fx + 2, fy + 2, fw - 4, fh - 4, '#C49574');
  };
  drawFenceBar(38.5 * TILE_SIZE, 13.5 * TILE_SIZE, 14.5 * TILE_SIZE, 16);
  drawFenceBar(38.5 * TILE_SIZE, 28.0 * TILE_SIZE, 14.5 * TILE_SIZE, 16);
  drawFenceBar(52.4 * TILE_SIZE, 13.5 * TILE_SIZE, 16, 15.1 * TILE_SIZE);
  drawFenceBar(38.5 * TILE_SIZE, 13.5 * TILE_SIZE, 16, 5.5 * TILE_SIZE);
  drawFenceBar(38.5 * TILE_SIZE, 23.0 * TILE_SIZE, 16, 5.6 * TILE_SIZE);

  // Garden Sign
  drawPixelRect(ctx, 43.3 * TILE_SIZE, 14.1 * TILE_SIZE, 136, 20, '#274239');
  ctx.fillStyle = '#D9F99D';
  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Jardín Comunitario', 45.4 * TILE_SIZE, 14.53 * TILE_SIZE);

  // 16 Soil Plots + Bloomed Flowers
  const flowerByPlot = new Map<number, GardenFlower>();
  for (const f of flowers) {
    flowerByPlot.set(f.plotIndex, f);
  }
  for (const plot of GARDEN_PLOTS) {
    const px = plot.tileX * TILE_SIZE;
    const py = plot.tileY * TILE_SIZE;
    drawPixelRect(ctx, px, py, 36, 36, '#5A3A2E');
    drawPixelRect(ctx, px + 3, py + 3, 30, 30, '#744D3D');
    const flower = flowerByPlot.get(plot.index);
    if (flower) {
      drawFlowerSprite(ctx, flower.species, px + 18, py + 24, time, plot.index);
    } else {
      // Small soil sprout dot
      drawPixelRect(ctx, px + 16, py + 18, 4, 4, '#593A2C');
    }
  }

  // 8. Interactive Seats (chairs/benches) & Tables/Desks with Lamps
  for (const seat of SEATS) {
    const isNear = nearbySeat?.id === seat.id;
    const sx = seat.x - 13;
    const sy = seat.y - 10;
    if (seat.zone === 'pier' || seat.zone === 'garden') {
      // Cozy wooden bench
      drawPixelRect(ctx, sx - 6, sy, 38, 20, '#5A3A2C');
      drawPixelRect(ctx, sx - 4, sy + 2, 34, 14, '#9B6B4F');
      drawPixelRect(ctx, sx - 4, sy + 2, 34, 4, '#BC8A68');
    } else {
      // Cushioned stool
      drawPixelRect(ctx, sx, sy, 26, 20, '#452E28');
      drawPixelRect(ctx, sx + 2, sy + 2, 22, 14, seat.zone === 'library' ? '#C97B84' : '#E8B878');
    }
    if (isNear) {
      ctx.strokeStyle = '#FFE08A';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(sx - 2), Math.round(sy - 2), 30, 24);
    }
  }

  // Draw Cafetería tables + lamps
  for (const [tx, ty] of [
    [24.3, 19.9],
    [31.3, 19.9],
    [24.3, 23.4],
    [31.3, 23.4],
  ]) {
    const x = tx * TILE_SIZE;
    const y = ty * TILE_SIZE;
    drawPixelRect(ctx, x, y, 45, 38, '#533529');
    drawPixelRect(ctx, x + 2, y + 2, 41, 30, '#9E6B4F');
    drawPixelRect(ctx, x + 4, y + 4, 37, 24, '#B98262');
    // Tiny warm desk lamp
    drawPixelRect(ctx, x + 18, y + 6, 10, 12, '#FFE08A');
    drawPixelRect(ctx, x + 21, y + 18, 4, 6, '#5A3E36');
    // Tiny notebook/mug
    drawPixelRect(ctx, x + 8, y + 14, 10, 8, '#FFF8EE');
    drawPixelRect(ctx, x + 30, y + 16, 6, 6, '#F4A261');
  }

  // Draw Biblioteca reading desks + floating candles
  for (const [tx, ty] of [
    [23.3, 7.9],
    [31.3, 7.9],
    [27.3, 10.6],
  ]) {
    const x = tx * TILE_SIZE;
    const y = ty * TILE_SIZE;
    drawPixelRect(ctx, x, y, 45, 38, '#3B231E');
    drawPixelRect(ctx, x + 2, y + 2, 41, 30, '#784E3F');
    drawPixelRect(ctx, x + 6, y + 12, 14, 10, '#FFF6E8');
    drawPixelRect(ctx, x + 26, y + 10, 12, 10, '#A5D8FF');
  }

  // Floating candles in Biblioteca Vela
  for (const [cx, cy, phase] of [
    [24.0, 6.4, 0],
    [32.0, 6.4, 1.5],
    [28.0, 9.1, 3.0],
    [21.6, 10.6, 2.1],
    [34.4, 10.6, 4.2],
  ]) {
    const bob = Math.sin(time * 2.2 + phase) * 4;
    const x = cx * TILE_SIZE;
    const y = cy * TILE_SIZE + bob;
    drawPixelRect(ctx, x - 3, y, 6, 12, '#FFF3DC');
    drawPixelRect(ctx, x - 2, y - 5, 4, 5, '#FFCF56');
    drawPixelRect(ctx, x - 1, y - 7, 2, 3, '#FFF9D6');
  }

  // Streetlamp posts
  for (const [lx, ly] of [
    [25.5, 14.2],
    [30.5, 14.2],
    [18.8, 21.5],
    [37.2, 21.0],
    [28.0, 28.5],
    [15.0, 29.0],
    [6.2, 29.0],
    [40.5, 15.5],
    [50.5, 26.0],
  ]) {
    const x = lx * TILE_SIZE;
    const y = ly * TILE_SIZE;
    drawPixelRect(ctx, x - 2, y - 28, 4, 30, '#2A2742');
    drawPixelRect(ctx, x - 6, y - 34, 12, 8, '#FFE29A');
    drawPixelRect(ctx, x - 7, y - 36, 14, 3, '#1E1B33');
  }

  // 9. Depth-sorted Cloud Characters
  const sortedActors = [...actors].sort((a, b) => a.y - b.y);
  for (const actor of sortedActors) {
    const isMoving = Math.abs(actor.vx) > 2 || Math.abs(actor.vy) > 2;
    const walkBob = isMoving ? Math.abs(Math.sin(actor.walkPhase)) * 5 : Math.sin(time * 2.4 + actor.x) * 1.2;
    const sitDrop = actor.isSitting ? 4 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(15, 16, 40, 0.38)';
    ctx.beginPath();
    ctx.ellipse(
      Math.round(actor.x),
      Math.round(actor.y + 6 + sitDrop),
      15,
      6,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    const drawSize = 52;
    const dx = Math.round(actor.x - drawSize / 2);
    const dy = Math.round(actor.y - drawSize + 10 - walkBob + sitDrop);

    // Highlight hovered or cheered actor
    if (hoveredActorId === actor.id && actor.id !== playerId) {
      ctx.strokeStyle = '#FFD166';
      ctx.lineWidth = 2;
      ctx.strokeRect(dx + 4, dy + 4, drawSize - 8, drawSize - 6);
    }

    const sprite = getCachedSprite(actor.tint, actor.expression);
    ctx.save();
    if (actor.facing === 'left') {
      ctx.translate(Math.round(actor.x * 2), 0);
      ctx.scale(-1, 1);
    }
    if (sprite) {
      ctx.drawImage(sprite, dx, dy, drawSize, drawSize);
    } else {
      drawFallbackCloud(ctx, actor.tint, dx, dy, drawSize);
    }
    drawCloudAccessory(ctx, actor.accessory, dx, dy, drawSize, 0);
    ctx.restore();

    // Name tag cleanly below feet
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const nameY = Math.round(actor.y + 20 + sitDrop);
    ctx.fillStyle = 'rgba(20, 18, 42, 0.78)';
    const nw = ctx.measureText(actor.name).width + 10;
    ctx.fillRect(Math.round(actor.x - nw / 2), nameY - 10, Math.round(nw), 14);
    ctx.fillStyle = actor.id === playerId ? '#FFE699' : '#F3EEFF';
    ctx.fillText(actor.name, Math.round(actor.x), nameY + 1);

    // Subject bubble above head if studying or has a subject set
    if (actor.subject.trim().length > 0 && (actor.isStudying || actor.isSitting)) {
      const label = actor.isStudying ? `📖 ${actor.subject}` : actor.subject;
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      const bw = Math.min(132, ctx.measureText(label).width + 14);
      const bx = Math.round(actor.x - bw / 2);
      const by = Math.round(dy - 18);
      drawPixelRect(ctx, bx, by, bw, 17, '#1E1A36');
      drawPixelRect(ctx, bx + 1, by + 1, bw - 2, 15, '#FFF8EE');
      drawPixelRect(ctx, actor.x - 2, by + 16, 4, 3, '#FFF8EE');
      ctx.fillStyle = '#251D3A';
      ctx.fillText(label, Math.round(actor.x), by + 12, bw - 8);
    }
  }

  // 10. Warm Additive Lamp Glows (soft pools of light)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const lamp of LAMPS) {
    const pulse = 0.94 + 0.06 * Math.sin(time * 2.5 + lamp.x);
    const r = lamp.radius * pulse;
    const grad = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, r);
    grad.addColorStop(0, 'rgba(255, 214, 130, 0.22)');
    grad.addColorStop(0.55, 'rgba(255, 184, 108, 0.08)');
    grad.addColorStop(1, 'rgba(255, 184, 108, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(lamp.x - r, lamp.y - r, r * 2, r * 2);
  }
  ctx.restore();

  // 11. Floating Particles (Hearts, Stars, Sparkles, Petals)
  for (const pt of particles) {
    const alpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
    ctx.save();
    ctx.globalAlpha = alpha;
    const px = Math.round(pt.x);
    const py = Math.round(pt.y);
    if (pt.kind === 'heart') {
      const s = pt.size;
      ctx.fillStyle = pt.color;
      ctx.fillRect(px - s, py - s, s, s);
      ctx.fillRect(px + 1, py - s, s, s);
      ctx.fillRect(px - s, py, s * 2 + 1, s);
      ctx.fillRect(px - Math.floor(s * 0.5), py + s, s + 1, Math.max(2, s - 1));
    } else if (pt.kind === 'star') {
      const s = pt.size;
      ctx.fillStyle = pt.color;
      ctx.fillRect(px - 1, py - s, 3, s * 2 + 1);
      ctx.fillRect(px - s, py - 1, s * 2 + 1, 3);
    } else {
      ctx.fillStyle = pt.color;
      ctx.fillRect(px, py, pt.size, pt.size);
    }
    ctx.restore();
  }

  // 12. Context Interaction Hint right in world space
  if (nearbySeat) {
    const hintText = isTouchDevice ? 'Toca Acción para sentarte' : '[E] Sentarse';
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(hintText).width + 16;
    const hx = Math.round(nearbySeat.x - w / 2);
    const hy = Math.round(nearbySeat.y - 44);
    drawPixelRect(ctx, hx, hy, w, 20, '#1B1734');
    ctx.strokeStyle = '#FFD166';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hx, hy, w, 20);
    ctx.fillStyle = '#FFE49E';
    ctx.fillText(hintText, Math.round(nearbySeat.x), hy + 14);
  } else if (nearFishing && !fishingState.active) {
    const hintText = isTouchDevice ? 'Toca Acción para pescar' : '[E] Pescar estrellitas';
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(hintText).width + 16;
    const hx = Math.round(FISHING_SPOT.x - w / 2);
    const hy = Math.round(FISHING_SPOT.y - 48);
    drawPixelRect(ctx, hx, hy, w, 20, '#1B1734');
    ctx.strokeStyle = '#8BE9FD';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hx, hy, w, 20);
    ctx.fillStyle = '#BDF5FF';
    ctx.fillText(hintText, Math.round(FISHING_SPOT.x), hy + 14);
  }

  ctx.restore();
}
