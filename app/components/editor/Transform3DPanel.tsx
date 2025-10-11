import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Slider } from "~/components/ui/slider";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { use3DTransform } from "~/hooks/useAnimation";
import { Box } from "lucide-react";

interface Transform3DPanelProps {
  projectId: string;
  scrubberId: string;
}

export function Transform3DPanel({ projectId, scrubberId }: Transform3DPanelProps) {
  const { transform, loading, loadTransform, updateTransform } = use3DTransform(
    projectId,
    scrubberId
  );

  const [localSettings, setLocalSettings] = useState({
    enabled: false,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    perspectiveDistance: 1000,
    anchorX: 0.5,
    anchorY: 0.5,
    anchorZ: 0,
  });

  useEffect(() => {
    loadTransform();
  }, [loadTransform]);

  useEffect(() => {
    if (transform) {
      setLocalSettings({
        enabled: transform.enabled,
        rotationX: transform.rotationX,
        rotationY: transform.rotationY,
        rotationZ: transform.rotationZ,
        perspectiveDistance: transform.perspectiveDistance,
        anchorX: transform.anchorX,
        anchorY: transform.anchorY,
        anchorZ: transform.anchorZ,
      });
    }
  }, [transform]);

  const handleUpdate = async (updates: Partial<typeof localSettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    await updateTransform(newSettings);
  };

  const handleReset = () => {
    const defaults = {
      enabled: false,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      perspectiveDistance: 1000,
      anchorX: 0.5,
      anchorY: 0.5,
      anchorZ: 0,
    };
    setLocalSettings(defaults);
    updateTransform(defaults);
  };

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Loading 3D transform settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Box className="w-5 h-5" />
          3D Transforms
        </h3>
        <Switch
          checked={localSettings.enabled}
          onCheckedChange={(enabled) => handleUpdate({ enabled })}
        />
      </div>

      {localSettings.enabled && (
        <Tabs defaultValue="rotation" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rotation">Rotation</TabsTrigger>
            <TabsTrigger value="anchor">Anchor Point</TabsTrigger>
          </TabsList>

          <TabsContent value="rotation" className="space-y-4">
            <Card className="p-4 space-y-4">
              {/* Rotation X */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Rotation X (Pitch)</Label>
                  <span className="text-sm text-muted-foreground">
                    {localSettings.rotationX.toFixed(1)}°
                  </span>
                </div>
                <Slider
                  value={[localSettings.rotationX]}
                  onValueChange={([rotationX]: number[]) => handleUpdate({ rotationX })}
                  min={-180}
                  max={180}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Rotate around horizontal axis
                </p>
              </div>

              {/* Rotation Y */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Rotation Y (Yaw)</Label>
                  <span className="text-sm text-muted-foreground">
                    {localSettings.rotationY.toFixed(1)}°
                  </span>
                </div>
                <Slider
                  value={[localSettings.rotationY]}
                  onValueChange={([rotationY]: number[]) => handleUpdate({ rotationY })}
                  min={-180}
                  max={180}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Rotate around vertical axis
                </p>
              </div>

              {/* Rotation Z */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Rotation Z (Roll)</Label>
                  <span className="text-sm text-muted-foreground">
                    {localSettings.rotationZ.toFixed(1)}°
                  </span>
                </div>
                <Slider
                  value={[localSettings.rotationZ]}
                  onValueChange={([rotationZ]: number[]) => handleUpdate({ rotationZ })}
                  min={-180}
                  max={180}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Rotate around depth axis
                </p>
              </div>

              {/* Perspective Distance */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Perspective Distance</Label>
                  <span className="text-sm text-muted-foreground">
                    {localSettings.perspectiveDistance}px
                  </span>
                </div>
                <Slider
                  value={[localSettings.perspectiveDistance]}
                  onValueChange={([perspectiveDistance]: number[]) => handleUpdate({ perspectiveDistance })}
                  min={100}
                  max={5000}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Controls the strength of perspective effect
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="anchor" className="space-y-4">
            <Card className="p-4 space-y-4">
              {/* Anchor X */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Anchor X</Label>
                  <span className="text-sm text-muted-foreground">
                    {(localSettings.anchorX * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[localSettings.anchorX]}
                  onValueChange={([anchorX]: number[]) => handleUpdate({ anchorX })}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Horizontal position of rotation center
                </p>
              </div>

              {/* Anchor Y */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Anchor Y</Label>
                  <span className="text-sm text-muted-foreground">
                    {(localSettings.anchorY * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[localSettings.anchorY]}
                  onValueChange={([anchorY]: number[]) => handleUpdate({ anchorY })}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Vertical position of rotation center
                </p>
              </div>

              {/* Anchor Z */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Anchor Z</Label>
                  <span className="text-sm text-muted-foreground">
                    {localSettings.anchorZ.toFixed(0)}px
                  </span>
                </div>
                <Slider
                  value={[localSettings.anchorZ]}
                  onValueChange={([anchorZ]: number[]) => handleUpdate({ anchorZ })}
                  min={-1000}
                  max={1000}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Depth position of rotation center
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    handleUpdate({ anchorX: 0.5, anchorY: 0.5, anchorZ: 0 })
                  }
                >
                  Center Anchor Point
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {localSettings.enabled && (
        <Button variant="outline" className="w-full" onClick={handleReset}>
          Reset All Transforms
        </Button>
      )}

      {!localSettings.enabled && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Enable 3D transforms to access settings
          </p>
        </Card>
      )}
    </div>
  );
}