/**
 * Waveform Visualization Component
 * Displays audio waveform with zoom and playback cursor
 */

import { useEffect, useRef, useState } from 'react';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Slider } from '~/components/ui/slider';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface WaveformVisualizationProps {
  audioData: Float32Array;
  sampleRate: number;
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
  height?: number;
  color?: string;
  backgroundColor?: string;
}

export function WaveformVisualization({
  audioData,
  sampleRate,
  currentTime = 0,
  duration,
  onSeek,
  height = 120,
  color = '#3b82f6',
  backgroundColor = '#1e293b'
}: WaveformVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Generate waveform data
  useEffect(() => {
    if (!audioData || audioData.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const samplesPerPixel = Math.floor((audioData.length / width) * zoom);
    const data: number[] = [];

    for (let i = 0; i < width; i++) {
      const start = Math.floor(offset + i * samplesPerPixel);
      const end = Math.min(start + samplesPerPixel, audioData.length);

      let min = 0;
      let max = 0;

      for (let j = start; j < end; j++) {
        if (j >= 0 && j < audioData.length) {
          min = Math.min(min, audioData[j]);
          max = Math.max(max, audioData[j]);
        }
      }

      data.push(min, max);
    }

    setWaveformData(data);
  }, [audioData, zoom, offset]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const middle = height / 2;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    for (let i = 0; i < width; i++) {
      const minIdx = i * 2;
      const maxIdx = i * 2 + 1;

      if (minIdx < waveformData.length && maxIdx < waveformData.length) {
        const min = waveformData[minIdx];
        const max = waveformData[maxIdx];

        const y1 = middle + min * middle;
        const y2 = middle + max * middle;

        ctx.beginPath();
        ctx.moveTo(i, y1);
        ctx.lineTo(i, y2);
        ctx.stroke();
      }
    }

    // Draw playback cursor
    if (duration && currentTime >= 0) {
      const progress = currentTime / duration;
      const cursorX = progress * width;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
    }

    // Draw center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, middle);
    ctx.lineTo(width, middle);
    ctx.stroke();
  }, [waveformData, currentTime, duration, color, backgroundColor]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = height;
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [height]);

  // Handle click to seek
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || !duration) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const time = progress * duration;

    onSeek(time);
  };

  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 100));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 1));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setOffset(0);
  };

  // Handle drag to scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const samplesPerPixel = Math.floor((audioData.length / canvas.width) * zoom);
    setOffset(prev => Math.max(0, prev - e.movementX * samplesPerPixel));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Waveform</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[60px] text-center">
            {zoom.toFixed(1)}x
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomIn}
            disabled={zoom >= 100}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleZoomReset}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full rounded-md overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
        />
      </div>

      {duration && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </Card>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}