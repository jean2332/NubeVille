import { Check, Pause, Play, RotateCcw, X } from 'lucide-react';
import {
  CLOUD_EXPRESSIONS,
  CloudExpressionId,
  CloudTintId,
  StudyModeId,
  StudySessionState,
} from '../types/game';
import { CloudAvatarPreview } from './CloudAvatarPreview';

interface StudyCardProps {
  seatLabel: string;
  tint: CloudTintId;
  expression: CloudExpressionId;
  session: StudySessionState;
  onChangeMode: (mode: StudyModeId) => void;
  onChangeSubject: (subject: string) => void;
  onChangeExpression: (expr: CloudExpressionId) => void;
  onTogglePlayPause: () => void;
  onResetTimer: () => void;
  onFinishAndClaim: () => void;
  onStandUp: () => void;
}

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function StudyCard({
  seatLabel,
  tint,
  expression,
  session,
  onChangeMode,
  onChangeSubject,
  onChangeExpression,
  onTogglePlayPause,
  onResetTimer,
  onFinishAndClaim,
  onStandUp,
}: StudyCardProps) {
  const displaySeconds =
    session.mode === 'stopwatch'
      ? session.elapsedSeconds
      : Math.max(0, session.targetSeconds - session.elapsedSeconds);

  const canClaim = session.elapsedSeconds >= 15;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-25 w-[calc(100%-1.5rem)] max-w-md bg-[#1F1A3A]/96 border-2 border-[#554988] rounded-2xl p-3.5 sm:p-4 shadow-2xl space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] text-[#B8AEDB]">
            {seatLabel} ·{' '}
            <span className="text-[#FFE08A] font-semibold">
              {session.mode === 'stopwatch'
                ? 'Cronómetro libre'
                : session.phase === 'focus'
                  ? 'Sesión de enfoque'
                  : 'Descanso'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onStandUp}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2D2652] hover:bg-[#3B326B] text-[11px] font-semibold text-[#E5DDFB] transition-colors whitespace-nowrap shrink-0"
        >
          <X className="w-3.5 h-3.5" />
          Levantarse
        </button>
      </div>

      {/* Mode segmented selector */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#151129] border border-[#382F5E]">
        {(
          [
            { id: 'pomodoro_25', label: '25 / 5 min' },
            { id: 'pomodoro_50', label: '50 / 10 min' },
            { id: 'stopwatch', label: 'Libre' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChangeMode(m.id)}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              session.mode === m.id
                ? 'bg-[#3F3570] text-[#FFE8A3]'
                : 'text-[#B9AFDD] hover:text-[#FFF8EE]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Timer + Subject input */}
      <div className="flex items-center gap-3">
        <div className="px-3.5 py-2 rounded-xl bg-[#151129] border border-[#3D3366] text-center shrink-0">
          <div className="font-mono-num text-2xl sm:text-3xl font-bold text-[#FFF7E6] tracking-tight">
            {formatTime(displaySeconds)}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <input
            type="text"
            maxLength={24}
            value={session.subject}
            onChange={(e) => onChangeSubject(e.target.value)}
            placeholder="Materia (ej. Matemáticas)"
            aria-label="Materia actual"
            className="w-full px-3 py-1.5 rounded-lg bg-[#151129] border border-[#453A73] text-xs text-[#FFF8EE] placeholder-[#7C70A6] focus:outline-none focus:border-[#FFD166]"
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePlayPause}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#FFD166] hover:bg-[#FFE08A] text-[#1E1633] text-xs font-bold transition-colors whitespace-nowrap"
            >
              {session.isActive && !session.isPaused ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  {session.isPaused ? 'Continuar' : 'Iniciar'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onResetTimer}
              title="Reiniciar temporizador"
              aria-label="Reiniciar temporizador"
              className="p-1.5 rounded-lg bg-[#2B244E] hover:bg-[#3B316B] text-[#E5DDFB] transition-colors shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {canClaim && (
              <button
                type="button"
                onClick={onFinishAndClaim}
                title="Guardar sesión, cobrar estrellitas y plantar flor"
                className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-[#69C97A] hover:bg-[#82DB91] text-[#112617] text-xs font-bold transition-colors whitespace-nowrap shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                Guardar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick 9-expression sprite selector bar */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-[#BEB4E0] mb-1">
          <span>Estado de tu nubecita</span>
          <span className="text-[#FFE08A]">
            {CLOUD_EXPRESSIONS.find((e) => e.id === expression)?.label}
          </span>
        </div>
        <div className="grid grid-cols-9 gap-1">
          {CLOUD_EXPRESSIONS.map((expr) => (
            <button
              key={expr.id}
              type="button"
              title={expr.label}
              onClick={() => onChangeExpression(expr.id)}
              className={`p-0.5 rounded-lg border transition-transform flex items-center justify-center ${
                expression === expr.id
                  ? 'bg-[#3C316A] border-[#FFD166] scale-105'
                  : 'bg-[#17132D] border-[#382F5E] hover:border-[#6A5CA4]'
              }`}
            >
              <CloudAvatarPreview
                tint={tint}
                accessory="none"
                expression={expr.id}
                size={26}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
