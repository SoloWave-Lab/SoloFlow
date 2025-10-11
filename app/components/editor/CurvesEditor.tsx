import React, { useRef, useEffect, useState } from "react";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { RotateCcw } from "lucide-react";

interface CurvePoint {
  x: number; // 0-1
  y: number; // 0-1
}

interface CurvesEditorProps {
  rgbCurve: CurvePoint[];
  redCurve: CurvePoint[];
  greenCurve: CurvePoint[];
  blueCurve: CurvePoint[];
  onRgbChange: (curve: CurvePoint[]) => void;
  onRedChange: (curve: CurvePoint[]) => void;
  onGreenChange: (curve: CurvePoint[]) => void;
  onBlueChange: (curve: CurvePoint[]) => void;
}

function CurveCanvas({
  curve,
  onChange,
  color,
}: {
  curve: CurvePoint[];
  onChange: (curve: CurvePoint[]) => void;
  color: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Initialize with default curve if empty
  const points = curve.length === 0 ? [{ x: 0, y: 0 }, { x: 1, y: 1 }] : curve;

  // Draw curve
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * width;
      const y = (i / 4) * height;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw diagonal reference line
    ctx.strokeStyle = "#555";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sort points by x
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);

    // Draw curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let x = 0; x <= width; x++) {
      const normalizedX = x / width;
      const y = interpolateCurve(sortedPoints, normalizedX);
      const canvasY = height - y * height;
      if (x === 0) {
        ctx.moveTo(x, canvasY);
      } else {
        ctx.lineTo(x, canvasY);
      }
    }

    ctx.stroke();

    // Draw control points
    sortedPoints.forEach((point, index) => {
      const x = point.x * width;
      const y = height - point.y * height;

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [points, color]);

  // Interpolate curve using Catmull-Rom spline
  const interpolateCurve = (sortedPoints: CurvePoint[], x: number): number => {
    if (sortedPoints.length === 0) return x;
    if (x <= sortedPoints[0].x) return sortedPoints[0].y;
    if (x >= sortedPoints[sortedPoints.length - 1].x) return sortedPoints[sortedPoints.length - 1].y;

    // Find surrounding points
    let i = 0;
    while (i < sortedPoints.length - 1 && sortedPoints[i + 1].x < x) {
      i++;
    }

    const p0 = sortedPoints[Math.max(0, i - 1)];
    const p1 = sortedPoints[i];
    const p2 = sortedPoints[Math.min(sortedPoints.length - 1, i + 1)];
    const p3 = sortedPoints[Math.min(sortedPoints.length - 1, i + 2)];

    const t = (x - p1.x) / (p2.x - p1.x);

    // Catmull-Rom interpolation
    const t2 = t * t;
    const t3 = t2 * t;

    const v0 = (p2.y - p0.y) * 0.5;
    const v1 = (p3.y - p1.y) * 0.5;

    return (
      (2 * p1.y - 2 * p2.y + v0 + v1) * t3 +
      (-3 * p1.y + 3 * p2.y - 2 * v0 - v1) * t2 +
      v0 * t +
      p1.y
    );
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = 1 - (e.clientY - rect.top) / canvas.height;

    // Check if clicking on existing point
    const clickedIndex = points.findIndex((p) => {
      const dx = Math.abs(p.x - x);
      const dy = Math.abs(p.y - y);
      return dx < 0.05 && dy < 0.05;
    });

    if (clickedIndex !== -1) {
      setDraggingIndex(clickedIndex);
    } else {
      // Add new point
      const newPoints = [...points, { x, y }].sort((a, b) => a.x - b.x);
      onChange(newPoints);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingIndex === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / canvas.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / canvas.height));

    const newPoints = [...points];
    newPoints[draggingIndex] = { x, y };
    onChange(newPoints);
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = 1 - (e.clientY - rect.top) / canvas.height;

    // Check if double-clicking on existing point to delete it
    const clickedIndex = points.findIndex((p) => {
      const dx = Math.abs(p.x - x);
      const dy = Math.abs(p.y - y);
      return dx < 0.05 && dy < 0.05;
    });

    if (clickedIndex !== -1 && points.length > 2) {
      const newPoints = points.filter((_, i) => i !== clickedIndex);
      onChange(newPoints);
    }
  };

  useEffect(() => {
    if (draggingIndex !== null) {
      window.addEventListener("mouseup", handleMouseUp);
      return () => window.removeEventListener("mouseup", handleMouseUp);
    }
  }, [draggingIndex]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onDoubleClick={handleDoubleClick}
      className="cursor-crosshair rounded-lg border border-border bg-black/50"
    />
  );
}

export default function CurvesEditor({
  rgbCurve,
  redCurve,
  greenCurve,
  blueCurve,
  onRgbChange,
  onRedChange,
  onGreenChange,
  onBlueChange,
}: CurvesEditorProps) {
  const [activeChannel, setActiveChannel] = useState("rgb");

  const handleReset = () => {
    const defaultCurve = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    switch (activeChannel) {
      case "rgb":
        onRgbChange(defaultCurve);
        break;
      case "red":
        onRedChange(defaultCurve);
        break;
      case "green":
        onGreenChange(defaultCurve);
        break;
      case "blue":
        onBlueChange(defaultCurve);
        break;
    }
  };

  const handleResetAll = () => {
    const defaultCurve = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    onRgbChange(defaultCurve);
    onRedChange(defaultCurve);
    onGreenChange(defaultCurve);
    onBlueChange(defaultCurve);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Curves</Label>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-6 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetAll}
            className="h-6 px-2 text-xs"
          >
            Reset All
          </Button>
        </div>
      </div>

      <Tabs value={activeChannel} onValueChange={setActiveChannel}>
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="rgb" className="text-xs">RGB</TabsTrigger>
          <TabsTrigger value="red" className="text-xs">Red</TabsTrigger>
          <TabsTrigger value="green" className="text-xs">Green</TabsTrigger>
          <TabsTrigger value="blue" className="text-xs">Blue</TabsTrigger>
        </TabsList>

        <TabsContent value="rgb" className="mt-3">
          <CurveCanvas curve={rgbCurve} onChange={onRgbChange} color="#ffffff" />
        </TabsContent>

        <TabsContent value="red" className="mt-3">
          <CurveCanvas curve={redCurve} onChange={onRedChange} color="#ff0000" />
        </TabsContent>

        <TabsContent value="green" className="mt-3">
          <CurveCanvas curve={greenCurve} onChange={onGreenChange} color="#00ff00" />
        </TabsContent>

        <TabsContent value="blue" className="mt-3">
          <CurveCanvas curve={blueCurve} onChange={onBlueChange} color="#0000ff" />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Click to add points • Drag to move • Double-click to remove
      </p>
    </div>
  );
}