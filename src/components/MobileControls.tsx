import { useRef, useState } from 'react';

interface MobileControlsProps {
  visible: boolean;
  actionLabel: string | null;
  onMoveVector: (vx: number, vy: number) => void;
  onAction: () => void;
}

export function MobileControls({
  visible,
  actionLabel,
  onMoveVector,
  onAction,
}: MobileControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);

  if (!visible) return null;

  const updateStick = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    setKnob({ x: kx, y: ky });

    if (dist < 6) {
      onMoveVector(0, 0);
    } else {
      onMoveVector(kx / maxR, ky / maxR);
    }
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnob({ x: 0, y: 0 });
    onMoveVector(0, 0);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none p-4 flex items-end justify-between">
      {/* Virtual Analog Joystick (>= 44px touch target) */}
      <div
        ref={padRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          activePointerId.current = e.pointerId;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointerId.current === e.pointerId) {
            updateStick(e.clientX, e.clientY);
          }
        }}
        onPointerUp={resetStick}
        onPointerCancel={resetStick}
        className="pointer-events-auto relative w-28 h-28 rounded-full bg-[#1B1636]/80 border-2 border-[#5A4E8C] touch-none flex items-center justify-center"
        aria-label="Joystick de movimiento"
      >
        <div
          className="w-12 h-12 rounded-full bg-[#FFD166] border-2 border-[#1A1530] shadow-lg transition-transform duration-75"
          style={{
            transform: `translate(${knob.x}px, ${knob.y}px)`,
          }}
        />
      </div>

      {/* Context Action Button (>= 44px) */}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="pointer-events-auto min-w-[84px] min-h-[52px] px-5 py-3 rounded-2xl bg-[#FFD166] active:scale-95 text-[#1B1430] font-display font-bold text-sm border-2 border-[#FFF3C4] shadow-xl whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
