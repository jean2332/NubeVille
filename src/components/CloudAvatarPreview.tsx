import { useEffect, useRef } from 'react';
import {
  drawCloudAccessory,
  drawFallbackCloud,
  getCachedSprite,
  onSpritesReady,
} from '../game/spriteSheet';
import { CloudAccessoryId, CloudExpressionId, CloudTintId } from '../types/game';

interface CloudAvatarPreviewProps {
  tint: CloudTintId;
  accessory: CloudAccessoryId;
  expression: CloudExpressionId;
  size?: number;
  className?: string;
}

export function CloudAvatarPreview({
  tint,
  accessory,
  expression,
  size = 64,
  className = '',
}: CloudAvatarPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const draw = () => {
      if (!mounted) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, size, size);

      const sprite = getCachedSprite(tint, expression);
      const pad = Math.round(size * 0.08);
      const drawSize = size - pad * 2;
      if (sprite) {
        ctx.drawImage(sprite, pad, pad, drawSize, drawSize);
      } else {
        drawFallbackCloud(ctx, tint, pad, pad, drawSize);
      }
      drawCloudAccessory(ctx, accessory, pad, pad, drawSize, 0);
    };

    draw();
    const unsub = onSpritesReady(draw);
    return () => {
      mounted = false;
      unsub();
    };
  }, [tint, accessory, expression, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`pixelated block shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
}
