import { Fish, Sparkles, X } from 'lucide-react';
import { FishingState } from '../types/game';

interface FishingOverlayProps {
  fishing: FishingState;
  onAction: () => void;
  onClose: () => void;
}

export function FishingOverlay({ fishing, onAction, onClose }: FishingOverlayProps) {
  if (!fishing.active) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-25 w-[calc(100%-2rem)] max-w-sm bg-[#182042]/96 border-2 border-[#5D8AC7] rounded-2xl p-4 shadow-2xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-display font-bold text-[#CBE8FF]">
          <Fish className="w-4 h-4 text-[#8BE9FD]" />
          <span>Pesca Lunar · Descanso</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Salir de pesca"
          className="p-1 rounded-lg bg-[#242F5E] hover:bg-[#32407D] text-[#CBE8FF]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center py-2 space-y-1">
        {fishing.stage === 'waiting' && (
          <p className="text-xs text-[#B6CEF2]">
            Observa el flotador en el agua estrellada...
          </p>
        )}
        {fishing.stage === 'bite' && (
          <p className="text-sm font-display font-bold text-[#FFE066]">
            ¡Pica algo luminoso! Recoge ahora
          </p>
        )}
        {fishing.stage === 'caught' && (
          <div className="space-y-1">
            <p className="text-sm font-display font-bold text-[#A5F3FC]">
              ¡Atrapaste: {fishing.lastCatchName}!
            </p>
            <p className="text-xs font-mono-num text-[#FFE08A] flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />+{fishing.lastCatchStars} Estrellitas
            </p>
          </div>
        )}
        {fishing.stage === 'missed' && (
          <p className="text-xs text-[#FFB4C6]">
            Se escapó suavemente entre las ondas... ¡Intenta de nuevo!
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onAction}
        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
          fishing.stage === 'bite'
            ? 'bg-[#FFE066] hover:bg-[#FFE991] text-[#1A1633]'
            : 'bg-[#36558F] hover:bg-[#4468AD] text-[#EFF7FF]'
        }`}
      >
        {fishing.stage === 'bite'
          ? '¡Recoger ahora! (E / Espacio)'
          : fishing.stage === 'caught' || fishing.stage === 'missed'
            ? 'Lanzar anzuelo otra vez'
            : 'Esperando picada...'}
      </button>
    </div>
  );
}
