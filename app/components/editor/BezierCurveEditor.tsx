/**
 * Bezier Curve Editor
 * Interactive editor for animation curves and easing functions
 */

import { useEffect, useRef, useState } from 'react';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';

interface Point {
  x: number;
  y: number;
}

interface BezierCurveEditorProps {
  value?: [number, number, number, number]; // [x1, y1, x2, y2]
  onChange?: (value: [number, number, number, number]) => void;
  width?: number;
  height?: number;
  showPresets?: boolean;
}

const PRESETS: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  'ease-in-quad': [0.55, 0.085, 0.68, 0.53],
  'ease-out-quad': [0.25, 0.46, 0.45, 0.94],
  'ease-in-cubic': [0.55, 0.055, 0.675, 0.19],
  'ease-out-cubic': [0.215, 0.61, 0.355, 1],
  'ease-in-quart': [0.895, 0.03, 0.685, 0.22],
  'ease-out-quart': [0.165, 0.84, 0.44, 1],
  'ease-in-back': [0.6, -0.28, 0.735, 0.045],
  'ease-out-back': [0.175, 0.885, 0.32, 1.275]
};

export function BezierCurveEditor({
  value = [0.25, 0.1, 0.25, 1],
  onChange,
  width = 300,
  height = 300,
  showPresets = true
}: BezierCurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [controlPoints, setControlPoints] = useState<[Point, Point]>([
    { x: value[0], y: value[1] },
    { x: value[2], y: value[3] }
  ]);
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Update control points when value changes
  useEffect(() => {
    setControlPoints([
      { x: value[0], y: value[1] },
      { x: value[2], y: value[3] }
    ]);
  }, [value]);

  // Draw curve
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
    drawGrid(ctx, width, height);

    // Draw bezier curve
    drawBezierCurve(ctx, width, height, controlPoints);

    // Draw control points
    drawControlPoints(ctx, width, height, controlPoints, hoveredPoint, draggingPoint);

    // Draw handles
    drawHandles(ctx, width, height, controlPoints);
  }, [controlPoints, width, height, hoveredPoint, draggingPoint]);

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / width;
    const y = 1 - (e.clientY - rect.top) / height;

    // Check if clicking on a control point
    for (let i = 0; i < controlPoints.length; i++) {
      const cp = controlPoints[i];
      const distance = Math.sqrt(
        Math.pow(cp.x - x, 2) + Math.pow(cp.y - y, 2)
      );

      if (distance < 0.05) {
        setDraggingPoint(i);
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / height));

    // Update dragging point
    if (draggingPoint !== null) {
      const newPoints: [Point, Point] = [...controlPoints] as [Point, Point];
      newPoints[draggingPoint] = { x, y };
      setControlPoints(newPoints);

      if (onChange) {
        onChange([newPoints[0].x, newPoints[0].y, newPoints[1].x, newPoints[1].y]);
      }
      return;
    }

    // Check hover
    let hovered: number | null = null;
    for (let i = 0; i < controlPoints.length; i++) {
      const cp = controlPoints[i];
      const distance = Math.sqrt(
        Math.pow(cp.x - x, 2) + Math.pow(cp.y - y, 2)
      );

      if (distance < 0.05) {
        hovered = i;
        break;
      }
    }
    setHoveredPoint(hovered);
  };

  const handleMouseUp = () => {
    setDraggingPoint(null);
  };

  const handlePresetChange = (preset: string) => {
    const values = PRESETS[preset];
    if (values) {
      setControlPoints([
        { x: values[0], y: values[1] },
        { x: values[2], y: values[3] }
      ]);
      if (onChange) {
        onChange(values);
      }
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Label>Easing Curve</Label>
        {showPresets && (
          <Select onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select preset" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(PRESETS).map(preset => (
                <SelectItem key={preset} value={preset}>
                  {preset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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

      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
        <div>
          <Label className="text-xs">P1</Label>
          <div className="text-muted-foreground">
            ({controlPoints[0].x.toFixed(3)}, {controlPoints[0].y.toFixed(3)})
          </div>
        </div>
        <div>
          <Label className="text-xs">P2</Label>
          <div className="text-muted-foreground">
            ({controlPoints[1].x.toFixed(3)}, {controlPoints[1].y.toFixed(3)})
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        cubic-bezier({controlPoints[0].x.toFixed(3)}, {controlPoints[0].y.toFixed(3)},{' '}
        {controlPoints[1].x.toFixed(3)}, {controlPoints[1].y.toFixed(3)})
      </div>
    </Card>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let i = 0; i <= 4; i++) {
    const x = (width / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let i = 0; i <= 4; i++) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Diagonal reference line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(width, 0);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBezierCurve(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  controlPoints: [Point, Point]
) {
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.beginPath();

  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = cubicBezier(
      { x: 0, y: 0 },
      controlPoints[0],
      controlPoints[1],
      { x: 1, y: 1 },
      t
    );

    const x = point.x * width;
    const y = (1 - point.y) * height;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}

function drawControlPoints(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  controlPoints: [Point, Point],
  hoveredPoint: number | null,
  draggingPoint: number | null
) {
  controlPoints.forEach((cp, index) => {
    const x = cp.x * width;
    const y = (1 - cp.y) * height;

    const isHovered = hoveredPoint === index;
    const isDragging = draggingPoint === index;

    // Outer circle
    ctx.fillStyle = isDragging ? '#3b82f6' : isHovered ? '#60a5fa' : '#94a3b8';
    ctx.beginPath();
    ctx.arc(x, y, isDragging ? 8 : isHovered ? 7 : 6, 0, Math.PI * 2);
    ctx.fill();

    // Inner circle
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHandles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  controlPoints: [Point, Point]
) {
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);

  // Handle from start to P1
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(controlPoints[0].x * width, (1 - controlPoints[0].y) * height);
  ctx.stroke();

  // Handle from P2 to end
  ctx.beginPath();
  ctx.moveTo(controlPoints[1].x * width, (1 - controlPoints[1].y) * height);
  ctx.lineTo(width, 0);
  ctx.stroke();

  ctx.setLineDash([]);
}

function cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  };
}

/**
 * Evaluate bezier curve at time t
 */
export function evaluateBezier(
  curve: [number, number, number, number],
  t: number
): number {
  const [x1, y1, x2, y2] = curve;
  const p0 = { x: 0, y: 0 };
  const p1 = { x: x1, y: y1 };
  const p2 = { x: x2, y: y2 };
  const p3 = { x: 1, y: 1 };

  return cubicBezier(p0, p1, p2, p3, t).y;
}