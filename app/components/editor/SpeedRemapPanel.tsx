import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Slider } from "~/components/ui/slider";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useSpeedRemap } from "~/hooks/useAnimation";
import { Gauge } from "lucide-react";

interface SpeedRemapPanelProps {
  projectId: string;
  scrubberId: string;
}

export function SpeedRemapPanel({ projectId, scrubberId }: SpeedRemapPanelProps) {
  const { speedRemap, loading, loadSpeedRemap, updateSpeedRemap } = useSpeedRemap(
    projectId,
    scrubberId
  );

  const [localSettings, setLocalSettings] = useState({
    enabled: false,
    speed: 1.0,
    method: "frame_blend" as "frame_blend" | "optical_flow" | "nearest",
    maintainPitch: true,
  });

  useEffect(() => {
    loadSpeedRemap();
  }, [loadSpeedRemap]);

  useEffect(() => {
    if (speedRemap) {
      setLocalSettings({
        enabled: speedRemap.enabled,
        speed: speedRemap.speed,
        method: speedRemap.method,
        maintainPitch: speedRemap.maintainPitch,
      });
    }
  }, [speedRemap]);

  const handleUpdate = async (updates: Partial<typeof localSettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    await updateSpeedRemap(newSettings);
  };

  const handleReset = () => {
    const defaults = {
      enabled: false,
      speed: 1.0,
      method: "frame_blend" as "frame_blend" | "optical_flow" | "nearest",
      maintainPitch: true,
    };
    setLocalSettings(defaults);
    updateSpeedRemap(defaults);
  };

  const getSpeedLabel = (speed: number) => {
    if (speed < 1) return `${(speed * 100).toFixed(0)}% (Slow Motion)`;
    if (speed > 1) return `${(speed * 100).toFixed(0)}% (Fast Forward)`;
    return "100% (Normal)";
  };

  const getSpeedPresets = () => [
    { label: "0.25x (Ultra Slow)", value: 0.25 },
    { label: "0.5x (Slow)", value: 0.5 },
    { label: "0.75x", value: 0.75 },
    { label: "1x (Normal)", value: 1.0 },
    { label: "1.5x", value: 1.5 },
    { label: "2x (Fast)", value: 2.0 },
    { label: "3x", value: 3.0 },
    { label: "5x (Very Fast)", value: 5.0 },
    { label: "10x (Ultra Fast)", value: 10.0 },
  ];

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Loading speed remap settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          Speed Remapping
        </h3>
        <Switch
          checked={localSettings.enabled}
          onCheckedChange={(enabled) => handleUpdate({ enabled })}
        />
      </div>

      {localSettings.enabled && (
        <Card className="p-4 space-y-4">
          {/* Speed Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Speed</Label>
              <span className="text-sm font-medium">
                {getSpeedLabel(localSettings.speed)}
              </span>
            </div>
            <Slider
              value={[localSettings.speed]}
              onValueChange={([speed]: number[]) => handleUpdate({ speed })}
              min={0.1}
              max={10}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Adjust playback speed from 0.1x to 10x
            </p>
          </div>

          {/* Speed Presets */}
          <div className="space-y-2">
            <Label>Quick Presets</Label>
            <div className="grid grid-cols-3 gap-2">
              {getSpeedPresets().map((preset) => (
                <Button
                  key={preset.value}
                  variant={localSettings.speed === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleUpdate({ speed: preset.value })}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Method */}
          <div className="space-y-2">
            <Label>Interpolation Method</Label>
            <Select
              value={localSettings.method}
              onValueChange={(method: any) => handleUpdate({ method })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest">Nearest Frame</SelectItem>
                <SelectItem value="frame_blend">Frame Blending</SelectItem>
                <SelectItem value="optical_flow">Optical Flow</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {localSettings.method === "nearest" && "Fast, but may look choppy"}
              {localSettings.method === "frame_blend" && "Good balance of speed and quality"}
              {localSettings.method === "optical_flow" && "Best quality, slower processing"}
            </p>
          </div>

          {/* Maintain Pitch */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Maintain Audio Pitch</Label>
              <p className="text-xs text-muted-foreground">
                Keep original pitch when changing speed
              </p>
            </div>
            <Switch
              checked={localSettings.maintainPitch}
              onCheckedChange={(maintainPitch) => handleUpdate({ maintainPitch })}
            />
          </div>

          {/* Info Card */}
          <Card className="p-3 bg-muted/50">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> For smooth slow motion, use Optical Flow method.
              For time-lapse effects, Frame Blending works well.
            </p>
          </Card>

          {/* Reset Button */}
          <Button variant="outline" className="w-full" onClick={handleReset}>
            Reset to Normal Speed
          </Button>
        </Card>
      )}

      {!localSettings.enabled && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Enable speed remapping to access settings
          </p>
        </Card>
      )}
    </div>
  );
}