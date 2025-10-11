import React, { useRef, useEffect, useState } from "react";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { RotateCcw } from "lucide-react";

interface ColorWheelProps {
  label: string;
  hue: number;
  saturation: number;
  luminance: number;
  onChange: (hue: number, saturation: number, luminance: number) => void;
}

function ColorWheel({ label, hue, saturation, luminance, onChange }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Draw color wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw color wheel
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 90) * (Math.PI / 180);
      const endAngle = (angle + 1 - 90) * (Math.PI / 180);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, `hsl(${angle}, 0%, 50%)`);
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw center circle (luminance indicator)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = `hsl(0, 0%, ${50 + luminance / 2}%)`;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw current position indicator
    const angleRad = (hue - 90) * (Math.PI / 180);
    const distance = (saturation / 100) * radius;
    const x = centerX + Math.cos(angleRad) * distance;
    const y = centerY + Math.sin(angleRad) * distance;

    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, 50%)`;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hue, saturation, luminance]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging && e.type !== "mousedown") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate hue and saturation
    let newHue = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (newHue < 0) newHue += 360;

    const newSaturation = Math.min((distance / radius) * 100, 100);

    onChange(newHue, newSaturation, luminance);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleLuminanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(hue, saturation, Number(e.target.value));
  };

  const handleReset = () => {
    onChange(0, 0, 0);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
      return () => window.removeEventListener("mouseup", handleMouseUp);
    }
  }, [isDragging]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">{label}</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-6 w-6 p-0"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={150}
          height={150}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          className="cursor-crosshair rounded-lg border border-border"
        />
        <div className="w-full space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${label}-luminance`} className="text-xs">Luminance</Label>
            <span className="text-xs text-muted-foreground">{luminance.toFixed(0)}</span>
          </div>
          <input
            id={`${label}-luminance`}
            type="range"
            min="-100"
            max="100"
            value={luminance}
            onChange={handleLuminanceChange}
            className="w-full h-2"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 w-full text-xs">
          <div className="text-center">
            <div className="text-muted-foreground">H</div>
            <div className="font-medium">{hue.toFixed(0)}°</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">S</div>
            <div className="font-medium">{saturation.toFixed(0)}%</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">L</div>
            <div className="font-medium">{luminance.toFixed(0)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ColorWheelsProps {
  shadowsHue: number;
  shadowsSaturation: number;
  shadowsLuminance: number;
  midtonesHue: number;
  midtonesSaturation: number;
  midtonesLuminance: number;
  highlightsHue: number;
  highlightsSaturation: number;
  highlightsLuminance: number;
  onShadowsChange: (hue: number, saturation: number, luminance: number) => void;
  onMidtonesChange: (hue: number, saturation: number, luminance: number) => void;
  onHighlightsChange: (hue: number, saturation: number, luminance: number) => void;
}

export default function ColorWheels({
  shadowsHue,
  shadowsSaturation,
  shadowsLuminance,
  midtonesHue,
  midtonesSaturation,
  midtonesLuminance,
  highlightsHue,
  highlightsSaturation,
  highlightsLuminance,
  onShadowsChange,
  onMidtonesChange,
  onHighlightsChange,
}: ColorWheelsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <ColorWheel
          label="Shadows"
          hue={shadowsHue}
          saturation={shadowsSaturation}
          luminance={shadowsLuminance}
          onChange={onShadowsChange}
        />
        <ColorWheel
          label="Midtones"
          hue={midtonesHue}
          saturation={midtonesSaturation}
          luminance={midtonesLuminance}
          onChange={onMidtonesChange}
        />
        <ColorWheel
          label="Highlights"
          hue={highlightsHue}
          saturation={highlightsSaturation}
          luminance={highlightsLuminance}
          onChange={onHighlightsChange}
        />
      </div>
    </div>
  );
}