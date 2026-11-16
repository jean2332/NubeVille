import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Sparkles, X } from 'lucide-react';
import { lofiAudio } from './audio/lofiAudio';
import { FishingOverlay } from './components/FishingOverlay';
import { FriendsDrawer } from './components/FriendsDrawer';
import { GameHud } from './components/GameHud';
import { MobileControls } from './components/MobileControls';
import { ProgressModal } from './components/ProgressModal';
import { StudyCard } from './components/StudyCard';
import { TitleScreen } from './components/TitleScreen';
import { CheerMessage, LocalBroadcastTransport, StudyRoomTransport } from './game/networkSync';
import { ensureSpritesLoaded } from './game/spriteSheet';
import {
  FISHING_SPOT,
  SEATS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  detectZone,
  moveWithCollision,
} from './game/worldMap';
import { renderWorld } from './game/worldRenderer';
import {
  AudioVolumes,
  CLOUD_EXPRESSIONS,
  CheerKind,
  CloudAccessoryId,
  CloudActor,
  CloudExpressionId,
  CloudTintId,
  FishingState,
  FloatingParticle,
  GamePhase,
  PlayerProfile,
  ProgressData,
  SeatPoint,
  StudyModeId,
  StudySessionState,
  ZoneId,
} from './types/game';
import {
  loadProgress,
  loadSavedProfile,
  recordCompletedStudy,
  saveProfilePrefs,
  saveProgress,
} from './utils/storage';

const MOVE_SPEED = 168; // px/sec

const INITIAL_BOTS: CloudActor[] = [
  {
    id: 'bot_mochi',
    name: 'Mochi',
    tint: 'sky',
    accessory: 'headphones',
    expression: 'happy',
    x: SEATS[0].x,
    y: SEATS[0].y,
    vx: 0,
    vy: 0,
    facing: SEATS[0].facing,
    isSitting: true,
    seatId: SEATS[0].id,
    subject: 'Matemáticas',
    isStudying: true,
    isBot: true,
    walkPhase: 0,
    lastUpdated: Date.now(),
  },
  {
    id: 'bot_brie',
    name: 'Brie',
    tint: 'sunset',
    accessory: 'scarf',
    expression: 'inspired',
    x: SEATS[11].x,
    y: SEATS[11].y,
    vx: 0,
    vy: 0,
    facing: SEATS[11].facing,
    isSitting: true,
    seatId: SEATS[11].id,
    subject: 'Inglés',
    isStudying: true,
    isBot: true,
    walkPhase: 0,
    lastUpdated: Date.now(),
  },
  {
    id: 'bot_sora',
    name: 'Sora',
    tint: 'lavender',
    accessory: 'none',
    expression: 'wink',
    x: SEATS[7].x,
    y: SEATS[7].y,
    vx: 0,
    vy: 0,
    facing: SEATS[7].facing,
    isSitting: true,
    seatId: SEATS[7].id,
    subject: 'Programación',
    isStudying: true,
    isBot: true,
    walkPhase: 0,
    lastUpdated: Date.now(),
  },
];

const FISH_CATCHES = [
  { name: 'Pez Estelar', stars: 5 },
  { name: 'Estrellita Dorada', stars: 7 },
  { name: 'Medusa Lunar', stars: 6 },
  { name: 'Carpa de Nube', stars: 4 },
  { name: 'Lucero de Coral', stars: 8 },
];

export default function App() {
  const savedPrefs = useMemo(() => loadSavedProfile(), []);
  const [phase, setPhase] = useState<GamePhase>('TITLE');

  const [profile, setProfile] = useState<PlayerProfile>(() => ({
    id: `player_${Math.random().toString(36).slice(2, 9)}`,
    name: savedPrefs?.name || 'Nubecita',
    tint: (savedPrefs?.tint as CloudTintId) || 'classic',
    accessory: (savedPrefs?.accessory as CloudAccessoryId) || 'headphones',
    expression: 'happy',
    roomCode: 'NUBE1',
  }));

  const [progress, setProgress] = useState<ProgressData>(() => loadProgress());
  const [currentZone, setCurrentZone] = useState<ZoneId>('cafe');
  const [nearbySeat, setNearbySeat] = useState<SeatPoint | null>(null);
  const [nearFishing, setNearFishing] = useState(false);
  const [seatedSeat, setSeatedSeat] = useState<SeatPoint | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<CloudActor | null>(null);

  const [friendsOpen, setFriendsOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [volumes, setVolumes] = useState<AudioVolumes>({
    muted: false,
    lofi: 0.42,
    rain: 0.32,
    cafe: 0.22,
    bells: 0.72,
  });

  const [studySession, setStudySession] = useState<StudySessionState>({
    isActive: false,
    isPaused: false,
    mode: 'pomodoro_25',
    phase: 'focus',
    elapsedSeconds: 0,
    targetSeconds: 25 * 60,
    subject: 'Estudio lofi',
    unclaimedFocusSeconds: 0,
  });

  const [fishing, setFishing] = useState<FishingState>({
    active: false,
    stage: 'idle',
    timer: 0,
    biteWindow: 0,
    lastCatchName: null,
    lastCatchStars: 0,
  });

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [actorsSnapshot, setActorsSnapshot] = useState<CloudActor[]>(INITIAL_BOTS);

  // Mutable simulation refs (isolated from React render cycle for smooth 60 FPS)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<CloudActor>({
    id: profile.id,
    name: profile.name,
    tint: profile.tint,
    accessory: profile.accessory,
    expression: profile.expression,
    x: 28.0 * TILE_SIZE,
    y: 22.0 * TILE_SIZE,
    vx: 0,
    vy: 0,
    facing: 'right',
    isSitting: false,
    seatId: null,
    subject: studySession.subject,
    isStudying: false,
    walkPhase: 0,
    lastUpdated: Date.now(),
  });
  const botsRef = useRef<CloudActor[]>(INITIAL_BOTS);
  const remotePeersRef = useRef<CloudActor[]>([]);
  const particlesRef = useRef<FloatingParticle[]>([]);
  const nextParticleId = useRef(1);
  const keysHeldRef = useRef<Set<string>>(new Set());
  const touchVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const camRef = useRef<{ x: number; y: number }>({ x: 400, y: 300 });
  const hoveredActorRef = useRef<string | null>(null);
  const transportRef = useRef<StudyRoomTransport | null>(null);
  const progressRef = useRef<ProgressData>(progress);
  const phaseRef = useRef<GamePhase>(phase);
  const fishingRef = useRef<FishingState>(fishing);
  const seatedSeatRef = useRef<SeatPoint | null>(seatedSeat);
  const nearbySeatRef = useRef<SeatPoint | null>(nearbySeat);
  const nearFishingRef = useRef<boolean>(nearFishing);
  const studyRef = useRef<StudySessionState>(studySession);

  progressRef.current = progress;
  phaseRef.current = phase;
  fishingRef.current = fishing;
  seatedSeatRef.current = seatedSeat;
  nearbySeatRef.current = nearbySeat;
  nearFishingRef.current = nearFishing;
  studyRef.current = studySession;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const spawnBurst = useCallback(
    (x: number, y: number, kind: FloatingParticle['kind'], count = 8) => {
      const palette =
        kind === 'heart'
          ? ['#FF7AA2', '#FFB3C6', '#FF4D6D']
          : kind === 'star'
            ? ['#FFD166', '#FFF3B0', '#8BE9FD']
            : kind === 'petal'
              ? ['#FFB3C6', '#CAFFBF', '#FFD6A5']
              : ['#FFE08A', '#A5F3FC', '#FFFFFF'];

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 18 + Math.random() * 34;
        particlesRef.current.push({
          id: nextParticleId.current++,
          x: x + (Math.random() - 0.5) * 14,
          y: y - 22 + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * speed,
          vy: -22 - Math.random() * 28,
          life: 1.0 + Math.random() * 0.6,
          maxLife: 1.4,
          kind,
          color: palette[i % palette.length],
          size: kind === 'sparkle' ? 3 : 3 + Math.floor(Math.random() * 2),
        });
      }
    },
    [],
  );

  // Preload 3x3 sprite sheet & detect touch environment
  useEffect(() => {
    ensureSpritesLoaded().catch(() => {});
    const checkTouch = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(hasTouch || window.innerWidth < 820);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Sync audio volumes
  useEffect(() => {
    lofiAudio.setVolumes(volumes);
  }, [volumes]);

  // Keep playerRef aligned with React profile & study subject
  useEffect(() => {
    playerRef.current = {
      ...playerRef.current,
      id: profile.id,
      name: profile.name,
      tint: profile.tint,
      accessory: profile.accessory,
      expression: profile.expression,
      subject: studySession.subject,
      isStudying: studySession.isActive && !studySession.isPaused,
    };
  }, [profile, studySession.subject, studySession.isActive, studySession.isPaused]);

  // Setup BroadcastChannel / localStorage multiplayer transport when entering room
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const transport = new LocalBroadcastTransport(profile.roomCode, profile.id);
    transportRef.current = transport;

    const unsubPeers = transport.onPeersChange((peers) => {
      remotePeersRef.current = peers;
    });

    const unsubCheer = transport.onCheer((msg: CheerMessage) => {
      const target =
        msg.toId === playerRef.current.id
          ? playerRef.current
          : botsRef.current.find((b) => b.id === msg.toId) ||
            remotePeersRef.current.find((p) => p.id === msg.toId);
      if (target) {
        spawnBurst(target.x, target.y, msg.kind === 'heart' ? 'heart' : 'star', 10);
      }
      if (msg.toId === playerRef.current.id) {
        lofiAudio.playCheerSparkle();
        showToast(`${msg.fromName} te envió ánimo`);
      }
    });

    const broadcastTimer = window.setInterval(() => {
      transport.sendState({
        ...playerRef.current,
        lastUpdated: Date.now(),
      });
    }, 110);

    return () => {
      window.clearInterval(broadcastTimer);
      unsubPeers();
      unsubCheer();
      transport.disconnect();
      transportRef.current = null;
    };
  }, [phase, profile.roomCode, profile.id, showToast, spawnBurst]);

  // Update snapshot for FriendsDrawer every 600ms
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActorsSnapshot([
        { ...playerRef.current },
        ...remotePeersRef.current,
        ...botsRef.current,
      ]);
    }, 600);
    return () => window.clearInterval(timer);
  }, []);

  // Bot personality cycling (realistic cozy expressions)
  useEffect(() => {
    const botExprPools: Record<string, CloudExpressionId[]> = {
      bot_mochi: ['happy', 'inspired', 'stressed', 'wink'],
      bot_brie: ['inspired', 'happy', 'exhausted', 'surprised'],
      bot_sora: ['wink', 'happy', 'grumpy', 'nervous'],
    };
    const timer = window.setInterval(() => {
      botsRef.current = botsRef.current.map((bot) => {
        if (Math.random() > 0.45) return bot;
        const pool = botExprPools[bot.id] ?? CLOUD_EXPRESSIONS.map((e) => e.id);
        const nextExpr = pool[Math.floor(Math.random() * pool.length)];
        return { ...bot, expression: nextExpr };
      });
    }, 7500);
    return () => window.clearInterval(timer);
  }, []);

  // Study Pomodoro / Stopwatch 1-second tick
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const timer = window.setInterval(() => {
      setStudySession((prev) => {
        if (!prev.isActive || prev.isPaused) return prev;
        const nextElapsed = prev.elapsedSeconds + 1;
        const nextUnclaimed = prev.phase === 'focus' ? prev.unclaimedFocusSeconds + 1 : 0;

        // Award +1 Estrellita every 12s of active focus (5 per minute)
        if (prev.phase === 'focus' && nextUnclaimed >= 12) {
          setProgress((p) => {
            const next = { ...p, stars: p.stars + 1 };
            saveProgress(next);
            return next;
          });
        }

        // Check Pomodoro block completion
        if (prev.mode !== 'stopwatch' && nextElapsed >= prev.targetSeconds) {
          lofiAudio.playSweetBell();
          spawnBurst(playerRef.current.x, playerRef.current.y, 'sparkle', 14);

          if (prev.phase === 'focus') {
            const mins = Math.round(prev.targetSeconds / 60);
            const bonus = 15;
            const { next, plantedFlower } = recordCompletedStudy(
              progressRef.current,
              prev.subject,
              mins,
              bonus,
              playerRef.current.name,
              true,
            );
            setProgress(next);
            spawnBurst(playerRef.current.x, playerRef.current.y, 'petal', 12);
            showToast(
              plantedFlower
                ? `¡Sesión completa! +${bonus} Estrellitas y floreció una flor en el Jardín`
                : `¡Sesión completa! +${bonus} Estrellitas`,
            );
            const breakMins = prev.mode === 'pomodoro_50' ? 10 : 5;
            return {
              ...prev,
              phase: 'break',
              elapsedSeconds: 0,
              targetSeconds: breakMins * 60,
              unclaimedFocusSeconds: 0,
            };
          } else {
            showToast('¡Fin del descanso! De vuelta al enfoque');
            const focusMins = prev.mode === 'pomodoro_50' ? 50 : 25;
            return {
              ...prev,
              phase: 'focus',
              elapsedSeconds: 0,
              targetSeconds: focusMins * 60,
              unclaimedFocusSeconds: 0,
            };
          }
        }

        return {
          ...prev,
          elapsedSeconds: nextElapsed,
          unclaimedFocusSeconds: nextUnclaimed >= 12 ? 0 : nextUnclaimed,
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, showToast, spawnBurst]);

  // Fishing mini-game loop
  useEffect(() => {
    if (!fishing.active) return;
    const interval = window.setInterval(() => {
      setFishing((prev) => {
        if (!prev.active) return prev;
        if (prev.stage === 'waiting') {
          const nextT = prev.timer - 0.1;
          if (nextT <= 0) {
            lofiAudio.playFishingBite();
            return { ...prev, stage: 'bite', biteWindow: 1.7 };
          }
          return { ...prev, timer: nextT };
        }
        if (prev.stage === 'bite') {
          const nextW = prev.biteWindow - 0.1;
          if (nextW <= 0) {
            return { ...prev, stage: 'missed' };
          }
          return { ...prev, biteWindow: nextW };
        }
        return prev;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [fishing.active]);

  const startFishing = useCallback(() => {
    lofiAudio.playSoftPop();
    setFishing({
      active: true,
      stage: 'waiting',
      timer: 1.6 + Math.random() * 2.2,
      biteWindow: 0,
      lastCatchName: null,
      lastCatchStars: 0,
    });
  }, []);

  const handleFishingAction = useCallback(() => {
    const f = fishingRef.current;
    if (!f.active) return;
    if (f.stage === 'bite') {
      const catchItem = FISH_CATCHES[Math.floor(Math.random() * FISH_CATCHES.length)];
      lofiAudio.playCheerSparkle();
      spawnBurst(FISHING_SPOT.x - 45, FISHING_SPOT.y, 'star', 12);
      setProgress((p) => {
        const next: ProgressData = {
          ...p,
          stars: p.stars + catchItem.stars,
          fishCaught: p.fishCaught + 1,
        };
        saveProgress(next);
        return next;
      });
      setFishing({
        ...f,
        stage: 'caught',
        lastCatchName: catchItem.name,
        lastCatchStars: catchItem.stars,
      });
    } else if (f.stage === 'caught' || f.stage === 'missed') {
      startFishing();
    }
  }, [spawnBurst, startFishing]);

  const handleStandUp = useCallback(() => {
    const seat = seatedSeatRef.current;
    if (!seat) return;
    lofiAudio.playSoftPop();
    // Place gently beside seat
    const safe = moveWithCollision(seat.x, seat.y + 18, 0, 0);
    playerRef.current.x = safe.x;
    playerRef.current.y = safe.y;
    playerRef.current.isSitting = false;
    playerRef.current.seatId = null;
    setSeatedSeat(null);
    setStudySession((prev) => ({ ...prev, isActive: false, isPaused: false }));
  }, []);

  const handleContextAction = useCallback(() => {
    if (phaseRef.current !== 'PLAYING') return;

    if (fishingRef.current.active) {
      handleFishingAction();
      return;
    }

    if (seatedSeatRef.current) {
      handleStandUp();
      return;
    }

    if (nearbySeatRef.current) {
      const seat = nearbySeatRef.current;
      lofiAudio.playSoftPop();
      playerRef.current.x = seat.x;
      playerRef.current.y = seat.y;
      playerRef.current.facing = seat.facing;
      playerRef.current.isSitting = true;
      playerRef.current.seatId = seat.id;
      setSeatedSeat(seat);
      setSelectedTarget(null);
      return;
    }

    if (nearFishingRef.current) {
      startFishing();
    }
  }, [handleFishingAction, handleStandUp, startFishing]);

  // Keyboard listeners (WASD / Arrows / E / Space / Esc + window blur safety)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        keysHeldRef.current.add(key);
        if (key.startsWith('arrow')) e.preventDefault();
      } else if (key === 'e') {
        e.preventDefault();
        handleContextAction();
      } else if (key === ' ' && fishingRef.current.active) {
        e.preventDefault();
        handleFishingAction();
      } else if (key === 'escape') {
        if (fishingRef.current.active) {
          setFishing((f) => ({ ...f, active: false }));
        } else if (seatedSeatRef.current) {
          handleStandUp();
        } else {
          setFriendsOpen(false);
          setProgressOpen(false);
          setSelectedTarget(null);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.key.toLowerCase());
    };

    const clearKeys = () => {
      keysHeldRef.current.clear();
      touchVectorRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, [handleContextAction, handleFishingAction, handleStandUp]);

  // Main 60 FPS Canvas Simulation & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAcc = 0;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      lastTime = now;
      const timeSec = now / 1000;

      const viewW = window.innerWidth;
      const viewH = window.innerHeight;

      if (phaseRef.current === 'PLAYING') {
        const p = playerRef.current;
        const keys = keysHeldRef.current;
        let ix = touchVectorRef.current.x;
        let iy = touchVectorRef.current.y;

        if (keys.has('w') || keys.has('arrowup')) iy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) iy += 1;
        if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
        if (keys.has('d') || keys.has('arrowright')) ix += 1;

        const mag = Math.hypot(ix, iy);
        if (mag > 1) {
          ix /= mag;
          iy /= mag;
        }

        // If seated or fishing and player actively moves, keep seated unless they press Stand Up or finish fishing
        if (!p.isSitting && !fishingRef.current.active && mag > 0.08) {
          p.vx = ix * MOVE_SPEED;
          p.vy = iy * MOVE_SPEED;
          if (ix < -0.1) p.facing = 'left';
          if (ix > 0.1) p.facing = 'right';
          p.walkPhase += dt * 13;

          const moved = moveWithCollision(p.x, p.y, p.vx * dt, p.vy * dt, 11);
          p.x = moved.x;
          p.y = moved.y;
        } else {
          p.vx = 0;
          p.vy = 0;
        }

        // Smooth camera tracking
        const targetCamX = Math.max(0, Math.min(WORLD_WIDTH - viewW, p.x - viewW / 2));
        const targetCamY = Math.max(0, Math.min(WORLD_HEIGHT - viewH, p.y - viewH / 2));
        const smooth = 1 - Math.exp(-8 * dt);
        camRef.current.x += (targetCamX - camRef.current.x) * smooth;
        camRef.current.y += (targetCamY - camRef.current.y) * smooth;

        // Throttled proximity checks (~12 Hz) to avoid noisy React state churn
        hudSyncAcc += dt;
        if (hudSyncAcc > 0.08) {
          hudSyncAcc = 0;
          const zone = detectZone(p.x, p.y);
          setCurrentZone((prev) => (prev === zone ? prev : zone));

          let bestSeat: SeatPoint | null = null;
          let bestDist = 42;
          if (!p.isSitting) {
            const occupied = new Set([
              ...botsRef.current.map((b) => b.seatId),
              ...remotePeersRef.current.map((r) => r.seatId),
            ]);
            for (const seat of SEATS) {
              if (occupied.has(seat.id)) continue;
              const d = Math.hypot(p.x - seat.x, p.y - seat.y);
              if (d < bestDist) {
                bestDist = d;
                bestSeat = seat;
              }
            }
          }
          setNearbySeat((prev) => (prev?.id === bestSeat?.id ? prev : bestSeat));

          const fishDist = Math.hypot(p.x - FISHING_SPOT.x, p.y - FISHING_SPOT.y);
          const isNearFish = !p.isSitting && fishDist <= FISHING_SPOT.radius;
          setNearFishing((prev) => (prev === isNearFish ? prev : isNearFish));
        }
      } else {
        // Gentle scenic pan across Cafetería Nube & Plaza on Title Screen
        const centerTargetX = 28 * TILE_SIZE - viewW / 2 + Math.sin(timeSec * 0.25) * 140;
        const centerTargetY = 20 * TILE_SIZE - viewH / 2 + Math.cos(timeSec * 0.2) * 80;
        camRef.current.x = Math.max(0, Math.min(WORLD_WIDTH - viewW, centerTargetX));
        camRef.current.y = Math.max(0, Math.min(WORLD_HEIGHT - viewH, centerTargetY));
      }

      // Update floating particles
      if (particlesRef.current.length > 0) {
        const nextParticles: FloatingParticle[] = [];
        for (const pt of particlesRef.current) {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.vy -= 8 * dt;
          pt.life -= dt;
          if (pt.life > 0) nextParticles.push(pt);
        }
        particlesRef.current = nextParticles;
      }

      const allActors: CloudActor[] =
        phaseRef.current === 'PLAYING'
          ? [playerRef.current, ...remotePeersRef.current, ...botsRef.current]
          : [...botsRef.current];

      renderWorld({
        ctx,
        viewW,
        viewH,
        camX: camRef.current.x,
        camY: camRef.current.y,
        time: timeSec,
        actors: allActors,
        playerId: playerRef.current.id,
        flowers: progressRef.current.gardenFlowers,
        particles: particlesRef.current,
        nearbySeat: phaseRef.current === 'PLAYING' ? nearbySeatRef.current : null,
        nearFishing: phaseRef.current === 'PLAYING' ? nearFishingRef.current : false,
        hoveredActorId: hoveredActorRef.current,
        fishingState: fishingRef.current,
        isTouchDevice,
      });

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isTouchDevice]);

  const handleEnterCity = (nextProfile: PlayerProfile) => {
    saveProfilePrefs(nextProfile.name, nextProfile.tint, nextProfile.accessory);
    setProfile(nextProfile);
    playerRef.current = {
      ...playerRef.current,
      id: nextProfile.id,
      name: nextProfile.name,
      tint: nextProfile.tint,
      accessory: nextProfile.accessory,
      expression: nextProfile.expression,
      x: 28.0 * TILE_SIZE,
      y: 22.0 * TILE_SIZE,
      isSitting: false,
      seatId: null,
    };
    lofiAudio.startAmbience();
    lofiAudio.playSoftPop();
    setPhase('PLAYING');
    showToast(`Bienvenido a NubeVille · Sala ${nextProfile.roomCode}`);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'PLAYING') return;
    const wx = e.clientX + camRef.current.x;
    const wy = e.clientY + camRef.current.y;
    const candidates = [...remotePeersRef.current, ...botsRef.current];
    const hit = candidates.find(
      (a) => Math.abs(wx - a.x) < 26 && wy >= a.y - 46 && wy <= a.y + 14,
    );
    hoveredActorRef.current = hit ? hit.id : null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== 'PLAYING') return;
    const wx = e.clientX + camRef.current.x;
    const wy = e.clientY + camRef.current.y;
    const candidates = [...remotePeersRef.current, ...botsRef.current];
    const hit = candidates.find(
      (a) => Math.abs(wx - a.x) < 28 && wy >= a.y - 48 && wy <= a.y + 16,
    );
    if (hit) {
      lofiAudio.playSoftPop();
      setSelectedTarget(hit);
    } else {
      setSelectedTarget(null);
    }
  };

  const handleSendCheer = (target: CloudActor, kind: CheerKind) => {
    lofiAudio.playCheerSparkle();
    spawnBurst(target.x, target.y, kind === 'heart' ? 'heart' : 'star', 10);
    transportRef.current?.sendCheer({
      fromId: profile.id,
      fromName: profile.name,
      toId: target.id,
      kind,
      timestamp: Date.now(),
    });
    showToast(
      kind === 'heart'
        ? `Enviaste un corazón de ánimo a ${target.name}`
        : `Enviaste una estrellita de ánimo a ${target.name}`,
    );
    setSelectedTarget(null);
  };

  const handleChangeStudyMode = (mode: StudyModeId) => {
    lofiAudio.playSoftPop();
    const targetSecs = mode === 'pomodoro_25' ? 25 * 60 : mode === 'pomodoro_50' ? 50 * 60 : 0;
    setStudySession((prev) => ({
      ...prev,
      mode,
      phase: 'focus',
      isActive: false,
      isPaused: false,
      elapsedSeconds: 0,
      targetSeconds: targetSecs,
      unclaimedFocusSeconds: 0,
    }));
  };

  const handleFinishAndClaim = () => {
    const mins = Math.max(1, Math.round(studySession.elapsedSeconds / 60));
    const bonus = Math.max(5, Math.min(20, mins * 2 + 5));
    const { next, plantedFlower } = recordCompletedStudy(
      progress,
      studySession.subject,
      mins,
      bonus,
      profile.name,
      true,
    );
    setProgress(next);
    lofiAudio.playSweetBell();
    spawnBurst(playerRef.current.x, playerRef.current.y, 'sparkle', 14);
    spawnBurst(playerRef.current.x, playerRef.current.y, 'petal', 10);
    showToast(
      plantedFlower
        ? `¡Guardado! +${bonus} Estrellitas y floreció una flor en el Jardín`
        : `¡Guardado! +${bonus} Estrellitas`,
    );
    setStudySession((prev) => ({
      ...prev,
      isActive: false,
      isPaused: false,
      elapsedSeconds: 0,
      unclaimedFocusSeconds: 0,
    }));
  };

  const mobileActionLabel = useMemo(() => {
    if (fishing.active) {
      if (fishing.stage === 'bite') return '¡Pescar!';
      if (fishing.stage === 'caught' || fishing.stage === 'missed') return 'Relanzar';
      return null;
    }
    if (seatedSeat) return 'Levantarse';
    if (nearbySeat) return 'Sentarse';
    if (nearFishing) return 'Pescar';
    return null;
  }, [fishing.active, fishing.stage, nearFishing, nearbySeat, seatedSeat]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#18162B]">
      {/* Isolated 60 FPS Pixel-Art World Canvas */}
      <canvas
        ref={canvasRef}
        onPointerMove={handleCanvasPointerMove}
        onClick={handleCanvasClick}
        className="block w-full h-full pixelated cursor-pointer"
      />

      {phase === 'TITLE' && (
        <TitleScreen initialProfile={profile} onEnterCity={handleEnterCity} />
      )}

      {phase === 'PLAYING' && (
        <>
          <GameHud
            profile={profile}
            zone={currentZone}
            subject={studySession.subject}
            stars={progress.stars}
            friendCount={actorsSnapshot.length}
            volumes={volumes}
            onChangeVolumes={setVolumes}
            onOpenFriends={() => {
              setProgressOpen(false);
              setFriendsOpen((v) => !v);
            }}
            onOpenProgress={() => {
              setFriendsOpen(false);
              setProgressOpen(true);
            }}
            activeToast={toast}
          />

          {/* Compact Cheer Popover when clicking another cloud */}
          {selectedTarget && !seatedSeat && (
            <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 bg-[#1F1A3A] border-2 border-[#554988] rounded-xl px-3.5 py-2.5 shadow-2xl">
              <div className="text-xs pr-1">
                <span className="font-bold text-[#FFF6E3]">{selectedTarget.name}</span>
                {selectedTarget.subject && (
                  <span className="text-[#A9E4FF] ml-1.5">· {selectedTarget.subject}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSendCheer(selectedTarget, 'heart')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#472A4E] hover:bg-[#5E3668] text-[#FFB3C6] text-xs font-semibold whitespace-nowrap"
              >
                <Heart className="w-3.5 h-3.5" />
                Ánimo
              </button>
              <button
                type="button"
                onClick={() => handleSendCheer(selectedTarget, 'star')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#372E60] hover:bg-[#493D7D] text-[#FFD166] text-xs font-semibold whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Estrellita
              </button>
              <button
                type="button"
                onClick={() => setSelectedTarget(null)}
                aria-label="Cerrar saludo"
                className="p-1 text-[#AFA5D6] hover:text-[#FFF8EE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Seated Study Card */}
          {seatedSeat && (
            <StudyCard
              seatLabel={seatedSeat.label}
              tint={profile.tint}
              expression={profile.expression}
              session={studySession}
              onChangeMode={handleChangeStudyMode}
              onChangeSubject={(subject) =>
                setStudySession((prev) => ({ ...prev, subject }))
              }
              onChangeExpression={(expr) => {
                lofiAudio.playSoftPop();
                setProfile((p) => ({ ...p, expression: expr }));
              }}
              onTogglePlayPause={() => {
                lofiAudio.playSoftPop();
                setStudySession((prev) => {
                  if (!prev.isActive) {
                    return { ...prev, isActive: true, isPaused: false };
                  }
                  return { ...prev, isPaused: !prev.isPaused };
                });
              }}
              onResetTimer={() => {
                lofiAudio.playSoftPop();
                setStudySession((prev) => ({
                  ...prev,
                  isActive: false,
                  isPaused: false,
                  elapsedSeconds: 0,
                  unclaimedFocusSeconds: 0,
                }));
              }}
              onFinishAndClaim={handleFinishAndClaim}
              onStandUp={handleStandUp}
            />
          )}

          {/* Starlight Fishing Mini-game */}
          <FishingOverlay
            fishing={fishing}
            onAction={handleFishingAction}
            onClose={() => setFishing((f) => ({ ...f, active: false }))}
          />

          {/* Touch Controls on mobile / touchscreens when walking */}
          <MobileControls
            visible={isTouchDevice && !seatedSeat && !fishing.active && !friendsOpen && !progressOpen}
            actionLabel={mobileActionLabel}
            onMoveVector={(vx, vy) => {
              touchVectorRef.current = { x: vx, y: vy };
            }}
            onAction={handleContextAction}
          />

          <FriendsDrawer
            open={friendsOpen}
            roomCode={profile.roomCode}
            actors={actorsSnapshot}
            selfId={profile.id}
            onSendCheer={handleSendCheer}
            onClose={() => setFriendsOpen(false)}
          />

          <ProgressModal
            open={progressOpen}
            progress={progress}
            onClose={() => setProgressOpen(false)}
          />
        </>
      )}
    </div>
  );
}
