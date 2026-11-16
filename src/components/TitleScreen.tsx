import { useState } from 'react';
import {
  CLOUD_ACCESSORIES,
  CLOUD_EXPRESSIONS,
  CLOUD_TINTS,
  CloudAccessoryId,
  CloudExpressionId,
  CloudTintId,
  PlayerProfile,
} from '../types/game';
import { CloudAvatarPreview } from './CloudAvatarPreview';

interface TitleScreenProps {
  initialProfile: PlayerProfile;
  onEnterCity: (profile: PlayerProfile) => void;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'NUBE';
  for (let i = 0; i < 2; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function TitleScreen({ initialProfile, onEnterCity }: TitleScreenProps) {
  const [name, setName] = useState(initialProfile.name || 'Nubecita');
  const [tint, setTint] = useState<CloudTintId>(initialProfile.tint);
  const [accessory, setAccessory] = useState<CloudAccessoryId>(initialProfile.accessory);
  const [expression, setExpression] = useState<CloudExpressionId>(initialProfile.expression);
  const [roomMode, setRoomMode] = useState<'direct' | 'create' | 'join'>('direct');
  const [createdCode] = useState<string>(() => generateRoomCode());
  const [joinCode, setJoinCode] = useState<string>('NUBE1');

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().slice(0, 14) || 'Nubecita';
    const finalRoom =
      roomMode === 'create'
        ? createdCode
        : roomMode === 'join'
          ? joinCode.trim().toUpperCase() || 'NUBE1'
          : 'NUBE1';

    onEnterCity({
      id: initialProfile.id,
      name: cleanName,
      tint,
      accessory,
      expression,
      roomCode: finalRoom,
    });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#161329]/72">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Brand Lockup & World Pitch over calm space */}
        <div className="lg:col-span-5 flex flex-col items-start text-left space-y-4 px-2">
          <svg
            viewBox="0 0 320 74"
            className="w-64 sm:w-72 h-auto"
            aria-label="NubeVille"
            role="img"
          >
            {/* Pixel cloud sprout emblem */}
            <rect x="8" y="20" width="38" height="28" rx="10" fill="#FFFFFF" stroke="#0F234A" strokeWidth="4" />
            <rect x="4" y="28" width="46" height="16" rx="7" fill="#FFFFFF" stroke="#0F234A" strokeWidth="4" />
            <rect x="10" y="24" width="34" height="20" rx="6" fill="#FFFFFF" />
            <rect x="16" y="31" width="4" height="6" rx="1" fill="#0F234A" />
            <rect x="34" y="31" width="4" height="6" rx="1" fill="#0F234A" />
            <rect x="13" y="38" width="5" height="3" rx="1" fill="#FF9EB5" />
            <rect x="36" y="38" width="5" height="3" rx="1" fill="#FF9EB5" />
            <path d="M27 20 C27 12, 18 8, 15 11 C15 16, 22 20, 27 20 Z" fill="#7AD945" stroke="#0F234A" strokeWidth="2.5" />
            <path d="M27 20 C27 12, 36 8, 39 11 C39 16, 32 20, 27 20 Z" fill="#9AE866" stroke="#0F234A" strokeWidth="2.5" />
            {/* Wordmark */}
            <text
              x="66"
              y="48"
              fill="#FFF4DC"
              fontFamily="Bricolage Grotesque, sans-serif"
              fontWeight="700"
              fontSize="40"
              letterSpacing="-1"
            >
              NubeVille
            </text>
          </svg>

          <p className="text-sm sm:text-base text-[#DED6F5] leading-relaxed max-w-sm">
            Tu ciudad flotante 16-bit para estudiar en calma. Visita la Cafetería Nube, la Biblioteca Vela, pesca estrellitas en el Muelle Lunar o haz florecer el Jardín Comunitario.
          </p>

          <p className="text-xs text-[#B4A9D6] tracking-wide">
            WASD / Flechas Mover · E Sentarse / Interactuar · Clic Enviar ánimo
          </p>
        </div>

        {/* Right Cozy Setup Card */}
        <form
          onSubmit={handleStart}
          className="lg:col-span-7 bg-[#211C3B] border-2 border-[#4C4175] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5"
        >
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-4 border-b border-[#3A3160]">
            <div className="w-28 h-28 rounded-xl bg-[#2E2752] border-2 border-[#5A4E8C] flex items-center justify-center shrink-0">
              <CloudAvatarPreview
                tint={tint}
                accessory={accessory}
                expression={expression}
                size={96}
              />
            </div>

            <div className="flex-1 w-full space-y-3">
              <div>
                <label htmlFor="player-name" className="block text-xs font-semibold text-[#CEC5EC] mb-1.5">
                  Tu nombre de nubecita
                </label>
                <input
                  id="player-name"
                  type="text"
                  maxLength={14}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Mochi"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#17132B] border border-[#4D4278] text-sm text-[#FFF8EE] placeholder-[#7B6FA3] focus:outline-none focus:border-[#FFD166]"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-[#CEC5EC] mb-1.5">
                  Expresión inicial
                </span>
                <div className="grid grid-cols-9 gap-1">
                  {CLOUD_EXPRESSIONS.map((expr) => (
                    <button
                      key={expr.id}
                      type="button"
                      title={expr.label}
                      onClick={() => setExpression(expr.id)}
                      className={`p-1 rounded-lg border transition-transform flex items-center justify-center ${
                        expression === expr.id
                          ? 'bg-[#3B3166] border-[#FFD166] scale-105'
                          : 'bg-[#191530] border-[#382F5C] hover:border-[#6B5CA5]'
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
          </div>

          {/* Tint & Accessory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-[#CEC5EC] mb-2">
                Tinte pastel
              </span>
              <div className="grid grid-cols-2 gap-2">
                {CLOUD_TINTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTint(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                      tint === item.id
                        ? 'bg-[#372E60] border-[#FFD166] text-[#FFF8EE]'
                        : 'bg-[#191530] border-[#3B3261] text-[#C8BFE8] hover:border-[#67599E]'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-sm border border-[#0F234A] shrink-0"
                      style={{ backgroundColor: item.swatch }}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#CEC5EC] mb-2">
                Accesorio en el brote
              </span>
              <div className="flex flex-col gap-2">
                {CLOUD_ACCESSORIES.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccessory(acc.id)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors whitespace-nowrap ${
                      accessory === acc.id
                        ? 'bg-[#372E60] border-[#FFD166] text-[#FFF8EE]'
                        : 'bg-[#191530] border-[#3B3261] text-[#C8BFE8] hover:border-[#67599E]'
                    }`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Room selector */}
          <div className="space-y-2.5 pt-1">
            <span className="block text-xs font-semibold text-[#CEC5EC]">
              Sala de estudio (sincroniza entre pestañas)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRoomMode('direct')}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                  roomMode === 'direct'
                    ? 'bg-[#3E336C] border-[#FFD166] text-[#FFF8EE]'
                    : 'bg-[#191530] border-[#3B3261] text-[#C8BFE8] hover:border-[#67599E]'
                }`}
              >
                Entrar directo
              </button>
              <button
                type="button"
                onClick={() => setRoomMode('create')}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                  roomMode === 'create'
                    ? 'bg-[#3E336C] border-[#FFD166] text-[#FFF8EE]'
                    : 'bg-[#191530] border-[#3B3261] text-[#C8BFE8] hover:border-[#67599E]'
                }`}
              >
                Crear Sala
              </button>
              <button
                type="button"
                onClick={() => setRoomMode('join')}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                  roomMode === 'join'
                    ? 'bg-[#3E336C] border-[#FFD166] text-[#FFF8EE]'
                    : 'bg-[#191530] border-[#3B3261] text-[#C8BFE8] hover:border-[#67599E]'
                }`}
              >
                Unirse con Código
              </button>
            </div>

            {roomMode === 'create' && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-[#17132B] border border-[#4D4278] text-xs">
                <span className="text-[#C8BFE8]">Código de tu nueva sala:</span>
                <span className="font-mono-num font-bold text-[#FFD166] tracking-wider">
                  {createdCode}
                </span>
              </div>
            )}

            {roomMode === 'join' && (
              <input
                type="text"
                maxLength={10}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Código de sala (ej. NUBE1)"
                className="w-full px-3.5 py-2 rounded-lg bg-[#17132B] border border-[#4D4278] text-xs font-mono-num uppercase tracking-wider text-[#FFF8EE] placeholder-[#7B6FA3] focus:outline-none focus:border-[#FFD166]"
              />
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-6 rounded-xl bg-[#FFD166] hover:bg-[#FFDC85] active:scale-[0.99] text-[#201836] font-display font-bold text-base transition-all shadow-lg whitespace-nowrap"
          >
            Entrar a NubeVille
          </button>
        </form>
      </div>
    </div>
  );
}
