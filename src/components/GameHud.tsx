import { useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Headphones,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  AudioVolumes,
  PlayerProfile,
  ZONE_LABELS,
  ZoneId,
} from '../types/game';
import { CloudAvatarPreview } from './CloudAvatarPreview';

interface GameHudProps {
  profile: PlayerProfile;
  zone: ZoneId;
  subject: string;
  stars: number;
  friendCount: number;
  volumes: AudioVolumes;
  onChangeVolumes: (next: AudioVolumes) => void;
  onOpenFriends: () => void;
  onOpenProgress: () => void;
  activeToast: string | null;
}

export function GameHud({
  profile,
  zone,
  subject,
  stars,
  friendCount,
  volumes,
  onChangeVolumes,
  onOpenFriends,
  onOpenProgress,
  activeToast,
}: GameHudProps) {
  const [audioOpen, setAudioOpen] = useState(false);

  const toggleMute = () => {
    onChangeVolumes({ ...volumes, muted: !volumes.muted });
  };

  return (
    <div className="fixed inset-x-0 top-0 z-20 pointer-events-none p-2.5 sm:p-4 flex items-start justify-between gap-2">
      {/* Top-Left: Avatar, Zone, Subject & Stars */}
      <div className="pointer-events-auto flex items-center gap-2.5 bg-[#1D1836]/95 border-2 border-[#4B4075] rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-lg max-w-[58vw] sm:max-w-xs">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#2D2652] border border-[#5C4F91] flex items-center justify-center shrink-0">
          <CloudAvatarPreview
            tint={profile.tint}
            accessory={profile.accessory}
            expression={profile.expression}
            size={38}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-xs sm:text-sm text-[#FFF6E3] truncate">
              {profile.name}
            </span>
            <span className="text-[11px] font-mono-num font-bold text-[#FFD166] flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3" />
              {stars}
            </span>
          </div>
          <div className="text-[11px] text-[#BFB6DE] truncate">
            <span>{ZONE_LABELS[zone]}</span>
            {subject.trim() && (
              <>
                <span className="mx-1 text-[#7D72A6]">·</span>
                <span className="text-[#A9E4FF]">{subject}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Center subtle toast */}
      {activeToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 md:static md:translate-x-0 flex items-center px-3.5 py-1.5 rounded-lg bg-[#221C40]/95 border border-[#FFD166]/60 text-xs font-semibold text-[#FFE8A3] shadow-lg max-w-[90vw] truncate">
          {activeToast}
        </div>
      )}

      {/* Top-Right: Lofi Audio Mixer, Friends List, Progress */}
      <div className="pointer-events-auto relative flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Collapsible Audio Button */}
        <div className="relative">
          <div className="flex items-center bg-[#1D1836]/95 border-2 border-[#4B4075] rounded-xl overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={volumes.muted ? 'Activar sonido' : 'Silenciar sonido'}
              className="p-2 sm:px-2.5 sm:py-2 text-[#E5DDFB] hover:bg-[#2F2754] transition-colors"
            >
              {volumes.muted ? (
                <VolumeX className="w-4 h-4 text-[#FF9EB5]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#FFE08A]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setAudioOpen((v) => !v)}
              aria-label="Abrir mezclador Lofi"
              className="flex items-center gap-1 pr-2.5 py-2 text-xs font-semibold text-[#DED6F7] hover:text-[#FFF8EE] transition-colors whitespace-nowrap"
            >
              <Headphones className="w-3.5 h-3.5 hidden sm:inline text-[#A5E6FF]" />
              <span className="hidden md:inline">Lofi</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${audioOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {audioOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#201B3B] border-2 border-[#514580] rounded-xl p-3.5 shadow-2xl space-y-3 z-40">
              <div className="flex items-center justify-between border-b border-[#3A3161] pb-2">
                <span className="font-display font-bold text-xs text-[#FFF4DC]">
                  Ambiente Lofi
                </span>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="text-[11px] font-semibold text-[#FFD166] hover:underline whitespace-nowrap"
                >
                  {volumes.muted ? 'Activar todo' : 'Silenciar'}
                </button>
              </div>

              {(
                [
                  { key: 'lofi', label: 'Acordes Lofi' },
                  { key: 'rain', label: 'Lluvia suave' },
                  { key: 'cafe', label: 'Cafetería' },
                  { key: 'bells', label: 'Campanitas' },
                ] as const
              ).map((ch) => (
                <label key={ch.key} className="block space-y-1">
                  <div className="flex justify-between text-[11px] text-[#CFC7EA]">
                    <span>{ch.label}</span>
                    <span className="font-mono-num">
                      {Math.round(volumes[ch.key] * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(volumes[ch.key] * 100)}
                    onChange={(e) =>
                      onChangeVolumes({
                        ...volumes,
                        [ch.key]: Number(e.target.value) / 100,
                      })
                    }
                    className="w-full accent-[#FFD166] h-1.5 bg-[#151129] rounded-lg cursor-pointer"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Friends in Room */}
        <button
          type="button"
          onClick={onOpenFriends}
          className="flex items-center gap-1.5 bg-[#1D1836]/95 hover:bg-[#2C2550] border-2 border-[#4B4075] rounded-xl px-2.5 py-2 sm:px-3 text-xs font-semibold text-[#F4EEFF] transition-colors shadow-lg whitespace-nowrap shrink-0"
        >
          <Users className="w-4 h-4 text-[#A9E4FF]" />
          <span className="hidden sm:inline">Sala</span>
          <span className="font-mono-num text-[#FFD166]">{friendCount}</span>
        </button>

        {/* My Progress */}
        <button
          type="button"
          onClick={onOpenProgress}
          className="flex items-center gap-1.5 bg-[#1D1836]/95 hover:bg-[#2C2550] border-2 border-[#4B4075] rounded-xl px-2.5 py-2 sm:px-3 text-xs font-semibold text-[#F4EEFF] transition-colors shadow-lg whitespace-nowrap shrink-0"
        >
          <BarChart3 className="w-4 h-4 text-[#FFB4C6]" />
          <span className="hidden sm:inline">Mi Progreso</span>
        </button>
      </div>
    </div>
  );
}
