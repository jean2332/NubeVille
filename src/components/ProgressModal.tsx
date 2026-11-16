import { Flame, Flower2, Sparkles, Timer, X } from 'lucide-react';
import { ProgressData } from '../types/game';
import { getTodayKey } from '../utils/storage';

interface ProgressModalProps {
  open: boolean;
  progress: ProgressData;
  onClose: () => void;
}

export function ProgressModal({ open, progress, onClose }: ProgressModalProps) {
  if (!open) return null;

  const todayKey = getTodayKey();
  const todayRecords = progress.records.filter((r) => r.dateKey === todayKey);
  const todayMinutes = todayRecords.reduce((acc, r) => acc + r.minutes, 0);

  // Breakdown by subject (combine today or all recent if today empty)
  const sourceRecords = todayRecords.length > 0 ? todayRecords : progress.records;
  const bySubject = new Map<string, number>();
  for (const r of sourceRecords) {
    bySubject.set(r.subject, (bySubject.get(r.subject) ?? 0) + r.minutes);
  }
  const subjectEntries = Array.from(bySubject.entries()).sort((a, b) => b[1] - a[1]);
  const maxMinutes = Math.max(1, ...subjectEntries.map((s) => s[1]));
  const barColors = ['#FFD166', '#9BF6FF', '#FFADAD', '#CAFFBF', '#BDB2FF'];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#120F24]/75">
      <div className="w-full max-w-lg bg-[#1F1A3A] border-2 border-[#524685] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#3A3160] pb-3">
          <div>
            <h2 className="font-display font-bold text-lg text-[#FFF6E3]">
              Mi Progreso de Estudio
            </h2>
            <p className="text-xs text-[#B8AEDB]">
              Resumen diario, racha y flores del Jardín Comunitario
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar progreso"
            className="p-2 rounded-lg bg-[#2D2652] hover:bg-[#3B326B] text-[#EAE3FF]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-[#16122B] border border-[#3B3260]">
            <div className="flex items-center gap-1.5 text-[11px] text-[#BEB4E0]">
              <Timer className="w-3.5 h-3.5 text-[#A9E4FF]" />
              <span>Hoy</span>
            </div>
            <div className="font-mono-num text-xl font-bold text-[#FFF6E3] mt-1">
              {todayMinutes} min
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#16122B] border border-[#3B3260]">
            <div className="flex items-center gap-1.5 text-[11px] text-[#BEB4E0]">
              <Sparkles className="w-3.5 h-3.5 text-[#FFD166]" />
              <span>Estrellitas</span>
            </div>
            <div className="font-mono-num text-xl font-bold text-[#FFD166] mt-1">
              {progress.stars}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#16122B] border border-[#3B3260]">
            <div className="flex items-center gap-1.5 text-[11px] text-[#BEB4E0]">
              <Flame className="w-3.5 h-3.5 text-[#FF9E7D]" />
              <span>Racha</span>
            </div>
            <div className="font-mono-num text-xl font-bold text-[#FFF6E3] mt-1">
              {progress.streakDays} d
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#16122B] border border-[#3B3260]">
            <div className="flex items-center gap-1.5 text-[11px] text-[#BEB4E0]">
              <Flower2 className="w-3.5 h-3.5 text-[#A8E6A3]" />
              <span>Flores</span>
            </div>
            <div className="font-mono-num text-xl font-bold text-[#C7F9CC] mt-1">
              {progress.gardenFlowers.length}
            </div>
          </div>
        </div>

        {/* Subject Breakdown Bar Chart */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#DED6F7]">
            <span>
              {todayRecords.length > 0 ? 'Desglose de hoy por materia' : 'Desglose por materia'}
            </span>
            <span className="text-[11px] text-[#A99FD1]">Minutos enfocados</span>
          </div>

          {subjectEntries.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#16122B] border border-[#352C57] text-xs text-[#AFA5D6] text-center">
              Siéntate en una mesa de la Cafetería Nube o Biblioteca Vela para registrar tu primera sesión.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {subjectEntries.slice(0, 6).map(([subj, mins], idx) => {
                const pct = Math.max(8, Math.round((mins / maxMinutes) * 100));
                return (
                  <div key={subj} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#F4EEFF] font-medium truncate pr-2">{subj}</span>
                      <span className="font-mono-num text-[#FFD166] shrink-0">
                        {mins} min
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#151129] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: barColors[idx % barColors.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
