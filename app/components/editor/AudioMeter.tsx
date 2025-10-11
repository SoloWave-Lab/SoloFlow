/**
 * Audio Meter Component (VU Meter)
 * Displays real-time audio levels with peak indicators
 */

import { useEffect, useRef, useState } from 'react';
import { Card } from '~/components/ui/card';
import { cn } from '~/lib/utils';

interface AudioMeterProps {
  audioData?: Float32Array;
  level?: number; // 0-1 range
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  showPeak?: boolean;
  showDb?: boolean;
  height?: number;
  width?: number;
}

export function AudioMeter({
  audioData,
  level = 0,
  label,
  orientation = 'vertical',
  showPeak = true,
  showDb = true,
  height = 200,
  width = 40
}: AudioMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [peakHoldTime, setPeakHoldTime] = useState(0);

  // Calculate level from audio data
  useEffect(() => {
    if (audioData && audioData.length > 0) {
      let sum = 0;
      let peak = 0;

      for (let i = 0; i < audioData.length; i++) {
        const abs = Math.abs(audioData[i]);
        sum += abs * abs;
        peak = Math.max(peak, abs);
      }

      const rms = Math.sqrt(sum / audioData.length);
      setCurrentLevel(rms);

      if (peak > peakLevel) {
        setPeakLevel(peak);
        setPeakHoldTime(Date.now());
      }
    } else {
      setCurrentLevel(level);
    }
  }, [audioData, level]);

  // Peak hold decay
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - peakHoldTime;
      if (elapsed > 2000) {
        // Hold for 2 seconds
        setPeakLevel(prev => Math.max(0, prev * 0.95)); // Decay
      }
    }, 100);

    return () => clearInterval(interval);
  }, [peakHoldTime]);

  // Draw meter
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isVertical = orientation === 'vertical';
    const w = isVertical ? width : height;
    const h = isVertical ? height : width;

    canvas.width = w;
    canvas.height = h;

    // Clear
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    // Draw meter background
    drawMeterBackground(ctx, w, h, isVertical);

    // Draw current level
    drawLevel(ctx, w, h, currentLevel, isVertical);

    // Draw peak indicator
    if (showPeak && peakLevel > 0) {
      drawPeak(ctx, w, h, peakLevel, isVertical);
    }

    // Draw scale marks
    drawScale(ctx, w, h, isVertical, showDb);
  }, [currentLevel, peakLevel, orientation, width, height, showPeak, showDb]);

  const dbValue = linearToDb(currentLevel);

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="text-xs font-medium">{label}</span>}

      <div className="relative">
        <canvas ref={canvasRef} className="rounded-md" />
      </div>

      {showDb && (
        <div className="text-xs text-muted-foreground font-mono">
          {dbValue > -60 ? `${dbValue.toFixed(1)} dB` : '-∞ dB'}
        </div>
      )}
    </div>
  );
}

function drawMeterBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isVertical: boolean
) {
  const gradient = isVertical
    ? ctx.createLinearGradient(0, height, 0, 0)
    : ctx.createLinearGradient(0, 0, width, 0);

  // Green zone (0-60%)
  gradient.addColorStop(0, '#22c55e');
  gradient.addColorStop(0.6, '#22c55e');

  // Yellow zone (60-85%)
  gradient.addColorStop(0.6, '#eab308');
  gradient.addColorStop(0.85, '#eab308');

  // Red zone (85-100%)
  gradient.addColorStop(0.85, '#ef4444');
  gradient.addColorStop(1, '#ef4444');

  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.2;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

function drawLevel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  level: number,
  isVertical: boolean
) {
  const clampedLevel = Math.min(1, Math.max(0, level));

  const gradient = isVertical
    ? ctx.createLinearGradient(0, height, 0, 0)
    : ctx.createLinearGradient(0, 0, width, 0);

  // Color based on level
  if (clampedLevel < 0.6) {
    gradient.addColorStop(0, '#22c55e');
    gradient.addColorStop(1, '#22c55e');
  } else if (clampedLevel < 0.85) {
    gradient.addColorStop(0, '#22c55e');
    gradient.addColorStop(0.6 / clampedLevel, '#22c55e');
    gradient.addColorStop(0.6 / clampedLevel, '#eab308');
    gradient.addColorStop(1, '#eab308');
  } else {
    gradient.addColorStop(0, '#22c55e');
    gradient.addColorStop(0.6 / clampedLevel, '#22c55e');
    gradient.addColorStop(0.6 / clampedLevel, '#eab308');
    gradient.addColorStop(0.85 / clampedLevel, '#eab308');
    gradient.addColorStop(0.85 / clampedLevel, '#ef4444');
    gradient.addColorStop(1, '#ef4444');
  }

  ctx.fillStyle = gradient;

  if (isVertical) {
    const levelHeight = height * clampedLevel;
    ctx.fillRect(0, height - levelHeight, width, levelHeight);
  } else {
    const levelWidth = width * clampedLevel;
    ctx.fillRect(0, 0, levelWidth, height);
  }
}

function drawPeak(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  peak: number,
  isVertical: boolean
) {
  const clampedPeak = Math.min(1, Math.max(0, peak));

  ctx.fillStyle = peak > 0.95 ? '#ef4444' : '#f59e0b';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;

  if (isVertical) {
    const y = height - height * clampedPeak;
    ctx.fillRect(0, y - 2, width, 4);
    ctx.strokeRect(0, y - 2, width, 4);
  } else {
    const x = width * clampedPeak;
    ctx.fillRect(x - 2, 0, 4, height);
    ctx.strokeRect(x - 2, 0, 4, height);
  }
}

function drawScale(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isVertical: boolean,
  showDb: boolean
) {
  if (!showDb) return;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.font = '8px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';

  const dbLevels = [0, -3, -6, -12, -18, -24, -36, -48];

  dbLevels.forEach(db => {
    const linear = dbToLinear(db);
    const pos = isVertical ? height - height * linear : width * linear;

    ctx.beginPath();
    if (isVertical) {
      ctx.moveTo(0, pos);
      ctx.lineTo(width, pos);
    } else {
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, height);
    }
    ctx.stroke();
  });
}

function linearToDb(linear: number): number {
  if (linear <= 0) return -Infinity;
  return 20 * Math.log10(linear);
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Multi-channel Audio Meter
 */
interface MultiChannelMeterProps {
  channels: Array<{
    label: string;
    audioData?: Float32Array;
    level?: number;
  }>;
  orientation?: 'horizontal' | 'vertical';
  showPeak?: boolean;
  showDb?: boolean;
}

export function MultiChannelMeter({
  channels,
  orientation = 'vertical',
  showPeak = true,
  showDb = true
}: MultiChannelMeterProps) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-4">Audio Levels</h3>
      <div
        className={cn(
          'flex gap-4',
          orientation === 'vertical' ? 'flex-row' : 'flex-col'
        )}
      >
        {channels.map((channel, index) => (
          <AudioMeter
            key={index}
            label={channel.label}
            audioData={channel.audioData}
            level={channel.level}
            orientation={orientation}
            showPeak={showPeak}
            showDb={showDb}
          />
        ))}
      </div>
    </Card>
  );
}