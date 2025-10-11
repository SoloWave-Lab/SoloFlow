/**
 * Keyframe Graph Editor
 * Visual editor for animation keyframes with curve interpolation
 */

import { useEffect, useRef, useState } from 'react';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Slider } from '~/components/ui/slider';
import { Plus, Trash2, Move } from 'lucide-react';
import { evaluateBezier } from './BezierCurveEditor';

interface Keyframe {
  time: number; // 0-1 normalized time
  value: number; // 0-1 normalized value
  easing?: [number, number, number, number];
}

interface KeyframeGraphEditorProps {
  keyframes: Keyframe[];
  onChange?: (keyframes: Keyframe[]) => void;
  duration?: number; // in seconds
  valueRange?: [number, number];
  width?: number;
  height?: number;
  label?: string;
}

export function KeyframeGraphEditor({
  keyframes: initialKeyframes,
  onChange,
  duration = 10,
  valueRange = [0, 100],
  width = 600,
  height = 300,
  label = 'Value'
}: KeyframeGraphEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [keyframes, setKeyframes] = useState<Keyframe[]>(initialKeyframes);
  const [selectedKeyframe, setSelectedKeyframe] = useState<number | null>(null);
  const [draggingKeyframe, setDraggingKeyframe] = useState<number | null>(null);
  const [hoveredKeyframe, setHoveredKeyframe] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Sort keyframes by time
  useEffect(() => {
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    if (JSON.stringify(sorted) !== JSON.stringify(keyframes)) {
      setKeyframes(sorted);
    }
  }, [keyframes]);

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Clear
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx, width, height, duration);

    // Draw curve
    drawCurve(ctx, width, height, keyframes);

    // Draw keyframes
    drawKeyframes(
      ctx,
      width,
      height,
      keyframes,
      selectedKeyframe,
      hoveredKeyframe,
      draggingKeyframe
    );

    // Draw playhead
    drawPlayhead(ctx, width, height, currentTime);
  }, [keyframes, selectedKeyframe, hoveredKeyframe, draggingKeyframe, currentTime, width, height, duration]);

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / width;
    const y = 1 - (e.clientY - rect.top) / height;

    // Check if clicking on a keyframe
    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i];
      const distance = Math.sqrt(
        Math.pow(kf.time - x, 2) + Math.pow(kf.value - y, 2)
      );

      if (distance < 0.03) {
        setSelectedKeyframe(i);
        setDraggingKeyframe(i);
        return;
      }
    }

    // Add new keyframe on double click
    if (e.detail === 2) {
      const newKeyframe: Keyframe = {
        time: x,
        value: y,
        easing: [0.25, 0.1, 0.25, 1]
      };
      const newKeyframes = [...keyframes, newKeyframe];
      setKeyframes(newKeyframes);
      setSelectedKeyframe(newKeyframes.length - 1);
      if (onChange) onChange(newKeyframes);
    } else {
      setSelectedKeyframe(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / height));

    // Update dragging keyframe
    if (draggingKeyframe !== null) {
      const newKeyframes = [...keyframes];
      newKeyframes[draggingKeyframe] = {
        ...newKeyframes[draggingKeyframe],
        time: x,
        value: y
      };
      setKeyframes(newKeyframes);
      if (onChange) onChange(newKeyframes);
      return;
    }

    // Check hover
    let hovered: number | null = null;
    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i];
      const distance = Math.sqrt(
        Math.pow(kf.time - x, 2) + Math.pow(kf.value - y, 2)
      );

      if (distance < 0.03) {
        hovered = i;
        break;
      }
    }
    setHoveredKeyframe(hovered);
  };

  const handleMouseUp = () => {
    setDraggingKeyframe(null);
  };

  const handleAddKeyframe = () => {
    const newKeyframe: Keyframe = {
      time: currentTime,
      value: 0.5,
      easing: [0.25, 0.1, 0.25, 1]
    };
    const newKeyframes = [...keyframes, newKeyframe];
    setKeyframes(newKeyframes);
    setSelectedKeyframe(newKeyframes.length - 1);
    if (onChange) onChange(newKeyframes);
  };

  const handleDeleteKeyframe = () => {
    if (selectedKeyframe === null) return;
    const newKeyframes = keyframes.filter((_, i) => i !== selectedKeyframe);
    setKeyframes(newKeyframes);
    setSelectedKeyframe(null);
    if (onChange) onChange(newKeyframes);
  };

  const selectedKf = selectedKeyframe !== null ? keyframes[selectedKeyframe] : null;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleAddKeyframe}>
            <Plus className="h-4 w-4 mr-1" />
            Add Keyframe
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDeleteKeyframe}
            disabled={selectedKeyframe === null}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          className="rounded-md border border-border cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs w-20">Time</Label>
          <Slider
            value={[currentTime]}
            onValueChange={([v]) => setCurrentTime(v)}
            min={0}
            max={1}
            step={0.01}
            className="flex-1"
          />
          <span className="text-xs font-mono w-16 text-right">
            {(currentTime * duration).toFixed(2)}s
          </span>
        </div>

        {selectedKf && (
          <div className="p-3 bg-muted rounded-md space-y-2">
            <div className="text-xs font-medium">Selected Keyframe</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <Label className="text-xs">Time</Label>
                <div className="font-mono">{(selectedKf.time * duration).toFixed(2)}s</div>
              </div>
              <div>
                <Label className="text-xs">Value</Label>
                <div className="font-mono">
                  {(
                    valueRange[0] +
                    selectedKf.value * (valueRange[1] - valueRange[0])
                  ).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Double-click to add keyframe • Drag to move • Click to select
      </div>
    </Card>
  );
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  duration: number
) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;

  // Time grid (vertical lines)
  const timeSteps = 10;
  for (let i = 0; i <= timeSteps; i++) {
    const x = (width / timeSteps) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    // Time labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(`${((duration / timeSteps) * i).toFixed(1)}s`, x + 2, height - 5);
  }

  // Value grid (horizontal lines)
  const valueSteps = 10;
  for (let i = 0; i <= valueSteps; i++) {
    const y = (height / valueSteps) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  keyframes: Keyframe[]
) {
  if (keyframes.length === 0) return;

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const steps = width;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const value = interpolateKeyframes(keyframes, t);

    const x = t * width;
    const y = (1 - value) * height;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}

function drawKeyframes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  keyframes: Keyframe[],
  selectedIndex: number | null,
  hoveredIndex: number | null,
  draggingIndex: number | null
) {
  keyframes.forEach((kf, index) => {
    const x = kf.time * width;
    const y = (1 - kf.value) * height;

    const isSelected = selectedIndex === index;
    const isHovered = hoveredIndex === index;
    const isDragging = draggingIndex === index;

    // Diamond shape
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);

    const size = isDragging ? 10 : isSelected ? 9 : isHovered ? 8 : 7;

    ctx.fillStyle = isDragging
      ? '#3b82f6'
      : isSelected
      ? '#60a5fa'
      : isHovered
      ? '#94a3b8'
      : '#64748b';

    ctx.fillRect(-size / 2, -size / 2, size, size);

    // Border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(-size / 2, -size / 2, size, size);

    ctx.restore();
  });
}

function drawPlayhead(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
) {
  const x = time * width;

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Playhead triangle
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x - 6, 10);
  ctx.lineTo(x + 6, 10);
  ctx.closePath();
  ctx.fill();
}

function interpolateKeyframes(keyframes: Keyframe[], time: number): number {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;

  // Find surrounding keyframes
  let prevKf: Keyframe | null = null;
  let nextKf: Keyframe | null = null;

  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].time <= time) {
      prevKf = keyframes[i];
    }
    if (keyframes[i].time >= time && !nextKf) {
      nextKf = keyframes[i];
    }
  }

  // Before first keyframe
  if (!prevKf && nextKf) return nextKf.value;

  // After last keyframe
  if (prevKf && !nextKf) return prevKf.value;

  // Between keyframes
  if (prevKf && nextKf) {
    const t = (time - prevKf.time) / (nextKf.time - prevKf.time);

    // Apply easing if available
    const easedT = prevKf.easing ? evaluateBezier(prevKf.easing, t) : t;

    return prevKf.value + (nextKf.value - prevKf.value) * easedT;
  }

  return 0;
}

export { interpolateKeyframes };