/**
 * Blend Mode Controls Component
 * 
 * Provides UI for:
 * - Selecting blend modes for compositing
 * - Adjusting layer opacity
 * - Preview of blend mode effects
 */

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Layers, Eye } from "lucide-react";

interface BlendModeControlsProps {
  blendMode?: string;
  opacity?: number;
  onBlendModeChange: (mode: string) => void;
  onOpacityChange: (opacity: number) => void;
}

// Available blend modes with descriptions
const BLEND_MODES = [
  { value: "normal", label: "Normal", description: "Default blending" },
  { value: "multiply", label: "Multiply", description: "Darkens the image" },
  { value: "screen", label: "Screen", description: "Lightens the image" },
  { value: "overlay", label: "Overlay", description: "Combines multiply and screen" },
  { value: "darken", label: "Darken", description: "Keeps darker pixels" },
  { value: "lighten", label: "Lighten", description: "Keeps lighter pixels" },
  { value: "color-dodge", label: "Color Dodge", description: "Brightens colors" },
  { value: "color-burn", label: "Color Burn", description: "Darkens colors" },
  { value: "hard-light", label: "Hard Light", description: "Strong contrast effect" },
  { value: "soft-light", label: "Soft Light", description: "Subtle contrast effect" },
  { value: "difference", label: "Difference", description: "Inverts based on brightness" },
  { value: "exclusion", label: "Exclusion", description: "Similar to difference, softer" },
  { value: "hue", label: "Hue", description: "Uses hue of top layer" },
  { value: "saturation", label: "Saturation", description: "Uses saturation of top layer" },
  { value: "color", label: "Color", description: "Uses hue and saturation" },
  { value: "luminosity", label: "Luminosity", description: "Uses luminosity of top layer" },
];

export default function BlendModeControls({
  blendMode = "normal",
  opacity = 100,
  onBlendModeChange,
  onOpacityChange,
}: BlendModeControlsProps) {
  const [showPreview, setShowPreview] = useState(false);

  const handleOpacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseInt(event.target.value, 10);
    onOpacityChange(newOpacity);
  };

  const selectedMode = BLEND_MODES.find((mode) => mode.value === blendMode);

  return (
    <div className="space-y-4">
      {/* Blend Mode Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Blend Mode
          </Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-6 px-2 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
        </div>

        <Select value={blendMode} onValueChange={onBlendModeChange}>
          <SelectTrigger className="w-full h-9 text-xs">
            <SelectValue placeholder="Select blend mode" />
          </SelectTrigger>
          <SelectContent>
            {BLEND_MODES.map((mode) => (
              <SelectItem key={mode.value} value={mode.value} className="text-xs">
                <div className="flex flex-col">
                  <span className="font-medium">{mode.label}</span>
                  <span className="text-[10px] text-muted-foreground">{mode.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedMode && (
          <p className="text-[10px] text-muted-foreground italic">
            {selectedMode.description}
          </p>
        )}
      </div>

      {/* Opacity Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Opacity
          </Label>
          <span className="text-xs font-mono">{opacity}%</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={opacity}
          onChange={handleOpacityChange}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />

        {/* Opacity Presets */}
        <div className="flex gap-1">
          {[0, 25, 50, 75, 100].map((preset) => (
            <Button
              key={preset}
              variant="outline"
              size="sm"
              onClick={() => onOpacityChange(preset)}
              className="flex-1 h-6 text-[10px] px-1"
            >
              {preset}%
            </Button>
          ))}
        </div>
      </div>

      {/* Preview Section */}
      {showPreview && (
        <div className="rounded-md bg-muted/30 border border-border p-3 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-semibold">Blend Preview</span>
          </div>

          {/* Visual Preview Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Base Layer */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Base Layer</p>
              <div className="aspect-video rounded bg-gradient-to-br from-blue-500 to-purple-500" />
            </div>

            {/* Top Layer with Blend Mode */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">With Blend Mode</p>
              <div className="aspect-video rounded bg-gradient-to-br from-yellow-500 to-red-500 relative">
                <div
                  className="absolute inset-0 rounded bg-gradient-to-br from-blue-500 to-purple-500"
                  style={{
                    mixBlendMode: blendMode as any,
                    opacity: opacity / 100,
                  }}
                />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-2">
            This is a simplified preview. Actual results depend on your footage.
          </p>
        </div>
      )}

      {/* Info Section */}
      <div className="rounded-md bg-muted/30 border border-border p-3">
        <h4 className="text-xs font-semibold mb-2">Blend Modes</h4>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Blend modes control how layers combine with layers below them. They're essential for
          compositing, creating effects, and achieving specific visual styles.
        </p>
        <div className="mt-2 space-y-1">
          <p className="text-[10px] text-muted-foreground">
            <strong>Tip:</strong> Use "Multiply" for shadows and "Screen" for highlights.
          </p>
          <p className="text-[10px] text-muted-foreground">
            <strong>Tip:</strong> "Overlay" is great for adding texture overlays.
          </p>
        </div>
      </div>
    </div>
  );
}