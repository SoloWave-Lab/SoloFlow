import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Slider } from "~/components/ui/slider";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useStabilization } from "~/hooks/useAnimation";
import { Anchor } from "lucide-react";

interface StabilizationPanelProps {
  projectId: string;
  scrubberId: string;
}

export function StabilizationPanel({ projectId, scrubberId }: StabilizationPanelProps) {
  const { stabilization, loading, loadStabilization, updateStabilization } = useStabilization(
    projectId,
    scrubberId
  );

  const [localSettings, setLocalSettings] = useState({
    enabled: false,
    smoothness: 50,
    method: "point" as "point" | "subspace" | "optical_flow",
    cropToFit: true,
    rollingShutterCorrection: false,
    maxAngle: 10,
    maxShift: 30,
  });

  useEffect(() => {
    loadStabilization();
  }, [loadStabilization]);

  useEffect(() => {
    if (stabilization) {
      setLocalSettings({
        enabled: stabilization.enabled,
        smoothness: stabilization.smoothness,
        method: stabilization.method,
        cropToFit: stabilization.cropToFit,
        rollingShutterCorrection: stabilization.rollingShutterCorrection,
        maxAngle: stabilization.maxAngle,
        maxShift: stabilization.maxShift,
      });
    }
  }, [stabilization]);

  const handleUpdate = async (updates: Partial<typeof localSettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    await updateStabilization(newSettings);
  };

  const handleReset = () => {
    const defaults = {
      enabled: false,
      smoothness: 50,
      method: "point" as "point" | "subspace" | "optical_flow",
      cropToFit: true,
      rollingShutterCorrection: false,
      maxAngle: 10,
      maxShift: 30,
    };
    setLocalSettings(defaults);
    updateStabilization(defaults);
  };

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Loading stabilization settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Anchor className="w-5 h-5" />
          Video Stabilization
        </h3>
        <Switch
          checked={localSettings.enabled}
          onCheckedChange={(enabled) => handleUpdate({ enabled })}
        />
      </div>

      {localSettings.enabled && (
        <Card className="p-4 space-y-4">
          {/* Smoothness */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Smoothness</Label>
              <span className="text-sm text-muted-foreground">
                {localSettings.smoothness}%
              </span>
            </div>
            <Slider
              value={[localSettings.smoothness]}
              onValueChange={([smoothness]: number[]) => handleUpdate({ smoothness })}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Higher values = smoother motion, but may crop more
            </p>
          </div>

          {/* Method */}
          <div className="space-y-2">
            <Label>Stabilization Method</Label>
            <Select
              value={localSettings.method}
              onValueChange={(method: any) => handleUpdate({ method })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="point">Point Tracking</SelectItem>
                <SelectItem value="subspace">Subspace</SelectItem>
                <SelectItem value="optical_flow">Optical Flow</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {localSettings.method === "point" && "Fast, good for most footage"}
              {localSettings.method === "subspace" && "Better for complex motion"}
              {localSettings.method === "optical_flow" && "Best quality, slower"}
            </p>
          </div>

          {/* Max Angle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Max Rotation Angle</Label>
              <span className="text-sm text-muted-foreground">
                {localSettings.maxAngle}°
              </span>
            </div>
            <Slider
              value={[localSettings.maxAngle]}
              onValueChange={([maxAngle]: number[]) => handleUpdate({ maxAngle })}
              min={0}
              max={45}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Maximum rotation correction per frame
            </p>
          </div>

          {/* Max Shift */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Max Position Shift</Label>
              <span className="text-sm text-muted-foreground">
                {localSettings.maxShift}%
              </span>
            </div>
            <Slider
              value={[localSettings.maxShift]}
              onValueChange={([maxShift]: number[]) => handleUpdate({ maxShift })}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Maximum position correction per frame
            </p>
          </div>

          {/* Crop to Fit */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Crop to Fit</Label>
              <p className="text-xs text-muted-foreground">
                Remove black edges by cropping
              </p>
            </div>
            <Switch
              checked={localSettings.cropToFit}
              onCheckedChange={(cropToFit) => handleUpdate({ cropToFit })}
            />
          </div>

          {/* Rolling Shutter Correction */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Rolling Shutter Correction</Label>
              <p className="text-xs text-muted-foreground">
                Fix jello effect (experimental)
              </p>
            </div>
            <Switch
              checked={localSettings.rollingShutterCorrection}
              onCheckedChange={(rollingShutterCorrection) =>
                handleUpdate({ rollingShutterCorrection })
              }
            />
          </div>

          {/* Reset Button */}
          <Button variant="outline" className="w-full" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </Card>
      )}

      {!localSettings.enabled && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Enable stabilization to access settings
          </p>
        </Card>
      )}
    </div>
  );
}