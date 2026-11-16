import { FlowerSpecies, GardenFlower, ProgressData, StudyRecord } from '../types/game';

const STORAGE_KEY = 'nubeville_progress_v1';
const PROFILE_KEY = 'nubeville_profile_v1';

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayKey(): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - 1);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DEFAULT_FLOWERS: GardenFlower[] = [
  { plotIndex: 0, species: 'sunstar', subject: 'Bienvenida', plantedAt: Date.now() - 86400000, ownerName: 'Mochi' },
  { plotIndex: 1, species: 'moonbloom', subject: 'Inglés', plantedAt: Date.now() - 43200000, ownerName: 'Brie' },
  { plotIndex: 2, species: 'cloudlotus', subject: 'Programación', plantedAt: Date.now() - 18000000, ownerName: 'Sora' },
];

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        stars: 15,
        streakDays: 1,
        lastStudyDate: null,
        records: [],
        gardenFlowers: DEFAULT_FLOWERS,
        fishCaught: 0,
      };
    }
    const parsed = JSON.parse(raw) as Partial<ProgressData>;
    return {
      stars: typeof parsed.stars === 'number' ? parsed.stars : 15,
      streakDays: typeof parsed.streakDays === 'number' ? parsed.streakDays : 1,
      lastStudyDate: parsed.lastStudyDate ?? null,
      records: Array.isArray(parsed.records) ? parsed.records : [],
      gardenFlowers:
        Array.isArray(parsed.gardenFlowers) && parsed.gardenFlowers.length > 0
          ? parsed.gardenFlowers
          : DEFAULT_FLOWERS,
      fishCaught: typeof parsed.fishCaught === 'number' ? parsed.fishCaught : 0,
    };
  } catch {
    return {
      stars: 15,
      streakDays: 1,
      lastStudyDate: null,
      records: [],
      gardenFlowers: DEFAULT_FLOWERS,
      fishCaught: 0,
    };
  }
}

export function saveProgress(data: ProgressData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSavedProfile(): {
  name: string;
  tint: string;
  accessory: string;
} | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveProfilePrefs(name: string, tint: string, accessory: string): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, tint, accessory }));
  } catch {
    // Ignore storage errors
  }
}

const FLOWER_POOL: FlowerSpecies[] = ['sunstar', 'tulip', 'moonbloom', 'cloudlotus', 'lavender'];

export function recordCompletedStudy(
  current: ProgressData,
  subject: string,
  minutes: number,
  bonusStars: number,
  ownerName: string,
  bloomFlower: boolean,
): { next: ProgressData; plantedFlower: GardenFlower | null } {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  let nextStreak = current.streakDays;
  if (current.lastStudyDate === null) {
    nextStreak = 1;
  } else if (current.lastStudyDate === yesterday) {
    nextStreak = current.streakDays + 1;
  } else if (current.lastStudyDate !== today) {
    nextStreak = 1;
  }

  const cleanSubject = subject.trim() || 'Estudio libre';
  const newRecord: StudyRecord = {
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    subject: cleanSubject,
    minutes: Math.max(1, Math.round(minutes)),
    starsEarned: bonusStars,
    dateKey: today,
    timestamp: Date.now(),
  };

  let plantedFlower: GardenFlower | null = null;
  const nextFlowers = [...current.gardenFlowers];

  if (bloomFlower) {
    const usedPlots = new Set(nextFlowers.map((f) => f.plotIndex));
    let nextPlot = 0;
    for (let i = 0; i < 16; i++) {
      if (!usedPlots.has(i)) {
        nextPlot = i;
        break;
      }
      if (i === 15) {
        nextPlot = nextFlowers.length % 16;
      }
    }
    const species = FLOWER_POOL[nextFlowers.length % FLOWER_POOL.length];
    plantedFlower = {
      plotIndex: nextPlot,
      species,
      subject: cleanSubject,
      plantedAt: Date.now(),
      ownerName,
    };
    const existingIdx = nextFlowers.findIndex((f) => f.plotIndex === nextPlot);
    if (existingIdx >= 0) {
      nextFlowers[existingIdx] = plantedFlower;
    } else {
      nextFlowers.push(plantedFlower);
    }
  }

  const next: ProgressData = {
    ...current,
    stars: current.stars + bonusStars,
    streakDays: nextStreak,
    lastStudyDate: today,
    records: [newRecord, ...current.records].slice(0, 120),
    gardenFlowers: nextFlowers,
  };
  saveProgress(next);
  return { next, plantedFlower };
}
