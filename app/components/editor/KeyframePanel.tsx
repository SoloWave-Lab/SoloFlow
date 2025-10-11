import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import { 
  Plus, 
  Trash2, 
  Play,
  SkipBack,
  SkipForward,
  Circle,
  Square,
  Move,
  RotateCw,
  Maximize2,
  Eye,
  Volume2
} from "lucide-react";
import type { Keyframe, KeyframeProperty } from "~/components/timeline/advanced-types";

interface KeyframePanelProps {
  scrubberId: string | null;
  keyframes: Keyframe[];
  currentTime: number;
  onAddKeyframe: (scrubberId: string, keyframe: Omit<Keyframe, "id">) => void;
  onRemoveKeyframe: (scrubberId: string, keyframeId: string) => void;
  onUpdateKeyframe: (scrubberId: string, keyframeId: string, updates: Partial<Keyframe>) => void;
  onSeek: (time: number) => void;
}

const keyframeProperties: { value: KeyframeProperty; label: string; icon: any; min: number; max: number; step: number; default: number }[] = [
  { value: "opacity", label: "Opacity", icon: Eye, min: 0, max: 100, step: 1, default: 100 },
  { value: "rotation", label: "Rotation", icon: RotateCw, min: -360, max: 360, step: 1, default: 0 },
  { value: "scale", label: "Scale", icon: Maximize2, min: 0, max: 300, step: 1, default: 100 },
  { value: "scaleX", label: "Scale X", icon: Maximize2, min: 0, max: 300, step: 1, default: 100 },
  { value: "scaleY", label: "Scale Y", icon: Maximize2, min: 0, max: 300, step: 1, default: 100 },
  { value: "positionX", label: "Position X", icon: Move, min: -1000, max: 1000, step: 1, default: 0 },
  { value: "positionY", label: "Position Y", icon: Move, min: -1000, max: 1000, step: 1, default: 0 },
  { value: "volume", label: "Volume", icon: Volume2, min: 0, max: 200, step: 1, default: 100 },
];

const easingOptions = [
  { value: "linear", label: "Linear" },
  { value: "easeIn", label: "Ease In" },
  { value: "easeOut", label: "Ease Out" },
  { value: "easeInOut", label: "Ease In Out" },
  { value: "bezier", label: "Bezier (Custom)" },
];

export function KeyframePanel({
  scrubberId,
  keyframes,
  currentTime,
  onAddKeyframe,
  onRemoveKeyframe,
  onUpdateKeyframe,
  onSeek,
}: KeyframePanelProps) {
  const [selectedProperty, setSelectedProperty] = useState<KeyframeProperty>("opacity");
  const [selectedEasing, setSelectedEasing] = useState<"linear" | "easeIn" | "easeOut" | "easeInOut" | "bezier">("linear");

  const propertyConfig = keyframeProperties.find(p => p.value === selectedProperty);
  const propertyKeyframes = keyframes.filter(k => k.property === selectedProperty).sort((a, b) => a.time - b.time);

  const handleAddKeyframe = () => {
    if (!scrubberId || !propertyConfig) return;

    // Check if keyframe already exists at current time
    const existingKeyframe = propertyKeyframes.find(k => Math.abs(k.time - currentTime) < 0.01);
    if (existingKeyframe) {
      return; // Don't add duplicate
    }

    // Get interpolated value at current time or use default
    let value: number = propertyConfig.default;
    
    if (propertyKeyframes.length > 0) {
      const prevKeyframe = propertyKeyframes.filter(k => k.time <= currentTime).pop();
      const nextKeyframe = propertyKeyframes.find(k => k.time > currentTime);
      
      if (prevKeyframe && nextKeyframe) {
        // Interpolate between keyframes
        const t = (currentTime - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);
        const prevValue = typeof prevKeyframe.value === 'number' ? prevKeyframe.value : propertyConfig.default;
        const nextValue = typeof nextKeyframe.value === 'number' ? nextKeyframe.value : propertyConfig.default;
        value = prevValue + (nextValue - prevValue) * t;
      } else if (prevKeyframe) {
        value = typeof prevKeyframe.value === 'number' ? prevKeyframe.value : propertyConfig.default;
      } else if (nextKeyframe) {
        value = typeof nextKeyframe.value === 'number' ? nextKeyframe.value : propertyConfig.default;
      }
    }

    onAddKeyframe(scrubberId, {
      time: currentTime,
      property: selectedProperty,
      value,
      easing: selectedEasing,
    });
  };

  const handleRemoveKeyframe = (keyframeId: string) => {
    if (!scrubberId) return;
    onRemoveKeyframe(scrubberId, keyframeId);
  };

  const handleUpdateValue = (keyframeId: string, value: number) => {
    if (!scrubberId) return;
    onUpdateKeyframe(scrubberId, keyframeId, { value });
  };

  const handleUpdateEasing = (keyframeId: string, easing: typeof selectedEasing) => {
    if (!scrubberId) return;
    onUpdateKeyframe(scrubberId, keyframeId, { easing });
  };

  const navigateToKeyframe = (direction: "prev" | "next") => {
    if (propertyKeyframes.length === 0) return;

    if (direction === "prev") {
      const prevKeyframe = propertyKeyframes.filter(k => k.time < currentTime - 0.01).pop();
      if (prevKeyframe) {
        onSeek(prevKeyframe.time);
      }
    } else {
      const nextKeyframe = propertyKeyframes.find(k => k.time > currentTime + 0.01);
      if (nextKeyframe) {
        onSeek(nextKeyframe.time);
      }
    }
  };

  if (!scrubberId) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Select a clip to add keyframes</p>
        </CardContent>
      </Card>
    );
  }

  const Icon = propertyConfig?.icon || Circle;

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="sticky top-0 bg-background z-10 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Circle className="w-5 h-5" />
          Keyframe Animation
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 p-4">
        {/* Property Selection */}
        <div className="space-y-2">
          <Label>Animate Property</Label>
          <Select value={selectedProperty} onValueChange={(value) => setSelectedProperty(value as KeyframeProperty)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {keyframeProperties.map((prop) => {
                const PropIcon = prop.icon;
                return (
                  <SelectItem key={prop.value} value={prop.value}>
                    <div className="flex items-center gap-2">
                      <PropIcon className="w-4 h-4" />
                      {prop.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Keyframe Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Keyframes</Label>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToKeyframe("prev")}
                disabled={propertyKeyframes.length === 0}
                className="h-8 w-8 p-0"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleAddKeyframe}
                className="h-8"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToKeyframe("next")}
                disabled={propertyKeyframes.length === 0}
                className="h-8 w-8 p-0"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Keyframe List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {propertyKeyframes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No keyframes for {propertyConfig?.label}
              </p>
            ) : (
              propertyKeyframes.map((keyframe) => {
                const isActive = Math.abs(keyframe.time - currentTime) < 0.01;
                return (
                  <div
                    key={keyframe.id}
                    className={`p-3 border rounded-lg space-y-2 ${
                      isActive ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {keyframe.time.toFixed(2)}s
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSeek(keyframe.time)}
                          className="h-7 px-2"
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveKeyframe(keyframe.id)}
                          className="h-7 px-2 text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Value Slider */}
                    {typeof keyframe.value === 'number' && propertyConfig && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Value</Label>
                          <span className="text-xs text-muted-foreground">
                            {keyframe.value.toFixed(propertyConfig.step < 1 ? 2 : 0)}
                          </span>
                        </div>
                        <Slider
                          value={[keyframe.value]}
                          onValueChange={([value]) => handleUpdateValue(keyframe.id, value)}
                          min={propertyConfig.min}
                          max={propertyConfig.max}
                          step={propertyConfig.step}
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* Easing */}
                    <div className="space-y-1">
                      <Label className="text-xs">Easing</Label>
                      <Select
                        value={keyframe.easing}
                        onValueChange={(value) => handleUpdateEasing(keyframe.id, value as typeof selectedEasing)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {easingOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Default Easing */}
        <div className="space-y-2">
          <Label>Default Easing for New Keyframes</Label>
          <Select value={selectedEasing} onValueChange={(value) => setSelectedEasing(value as typeof selectedEasing)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {easingOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Navigate to a specific time on the timeline and click "Add" to create a keyframe. 
            Use the arrow buttons to jump between keyframes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}