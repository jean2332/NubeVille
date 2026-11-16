import { useState } from 'react';
import { Check, Copy, Heart, Sparkles, X } from 'lucide-react';
import {
  CLOUD_EXPRESSIONS,
  CheerKind,
  CloudActor,
  ZONE_LABELS,
} from '../types/game';
import { detectZone } from '../game/worldMap';
import { CloudAvatarPreview } from './CloudAvatarPreview';

interface FriendsDrawerProps {
  open: boolean;
  roomCode: string;
  actors: CloudActor[];
  selfId: string;
  onSendCheer: (target: CloudActor, kind: CheerKind) => void;
  onClose: () => void;
}

export function FriendsDrawer({
  open,
  roomCode,
  actors,
  selfId,
  onSendCheer,
  onClose,
}: FriendsDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const copyCode = () => {
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xs sm:max-w-sm bg-[#1D1836] border-l-2 border-[#4C4175] shadow-2xl flex flex-col">
      <div className="p-4 border-b border-[#382F5E] flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-base text-[#FFF6E3]">
            Nubecitas en Sala
          </h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-[#BFB6DE]">
            <span>Código:</span>
            <span className="font-mono-num font-bold text-[#FFD166]">{roomCode}</span>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1 text-[11px] text-[#A9E4FF] hover:underline"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar lista de amigos"
          className="p-2 rounded-lg bg-[#2A234D] hover:bg-[#3A3168] text-[#EAE3FF]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {actors.map((actor) => {
          const zone = detectZone(actor.x, actor.y);
          const exprLabel =
            CLOUD_EXPRESSIONS.find((e) => e.id === actor.expression)?.shortLabel ?? '';
          const isSelf = actor.id === selfId;

          return (
            <div
              key={actor.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-[#262047] border border-[#42376B]"
            >
              <div className="w-11 h-11 rounded-lg bg-[#1A1633] border border-[#4D417A] flex items-center justify-center shrink-0">
                <CloudAvatarPreview
                  tint={actor.tint}
                  accessory={actor.accessory}
                  expression={actor.expression}
                  size={38}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-[#FFF6E3] truncate">
                    {actor.name}
                  </span>
                  {isSelf && (
                    <span className="text-[10px] text-[#FFD166] font-semibold shrink-0">
                      (Tú)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#B8AEDB] truncate">
                  {ZONE_LABELS[zone]} · {exprLabel}
                </div>
                {actor.subject.trim() && (
                  <div className="text-[11px] text-[#A9E4FF] truncate">
                    Estudiando: {actor.subject}
                  </div>
                )}
              </div>

              {!isSelf && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title="Enviar corazón de ánimo"
                    aria-label={`Enviar corazón a ${actor.name}`}
                    onClick={() => onSendCheer(actor, 'heart')}
                    className="p-2 rounded-lg bg-[#382A54] hover:bg-[#4F356B] text-[#FF8FAB] transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Enviar estrellita de ánimo"
                    aria-label={`Enviar estrellita a ${actor.name}`}
                    onClick={() => onSendCheer(actor, 'star')}
                    className="p-2 rounded-lg bg-[#322C59] hover:bg-[#433A75] text-[#FFD166] transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3.5 border-t border-[#382F5E] text-[11px] text-[#A99FD1] leading-relaxed">
        Abre otra pestaña con el código <span className="font-mono-num text-[#FFD166]">{roomCode}</span> para estudiar juntos en tiempo real.
      </div>
    </div>
  );
}
