import React from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import type { EffectType, EffectParameters } from "~/components/timeline/advanced-types";

interface EffectParametersProps {
  effectType: EffectType;
  parameters: EffectParameters;
  onChange: (parameters: EffectParameters) => void;
}

export default function EffectParametersComponent({
  effectType,
  parameters,
  onChange,
}: EffectParametersProps) {
  const updateParameter = (key: string, value: any) => {
    onChange({ ...parameters, [key]: value });
  };

  // Render parameters based on effect type
  switch (effectType) {
    case "blur":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="blurAmount" className="text-xs">Amount</Label>
              <span className="text-xs text-muted-foreground">{parameters.blurAmount || 5}</span>
            </div>
            <Input
              id="blurAmount"
              type="range"
              min="0"
              max="50"
              value={parameters.blurAmount || 5}
              onChange={(e) => updateParameter("blurAmount", Number(e.target.value))}
              className="h-2"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="blurType" className="text-xs">Type</Label>
            <Select
              value={parameters.blurType || "gaussian"}
              onValueChange={(value) => updateParameter("blurType", value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gaussian">Gaussian</SelectItem>
                <SelectItem value="motion">Motion</SelectItem>
                <SelectItem value="radial">Radial</SelectItem>
                <SelectItem value="zoom">Zoom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {parameters.blurType === "motion" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="blurAngle" className="text-xs">Angle</Label>
                <span className="text-xs text-muted-foreground">{parameters.blurAngle || 0}°</span>
              </div>
              <Input
                id="blurAngle"
                type="range"
                min="0"
                max="360"
                value={parameters.blurAngle || 0}
                onChange={(e) => updateParameter("blurAngle", Number(e.target.value))}
                className="h-2"
              />
            </div>
          )}
        </div>
      );

    case "sharpen":
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="sharpenAmount" className="text-xs">Amount</Label>
            <span className="text-xs text-muted-foreground">{parameters.sharpenAmount || 50}</span>
          </div>
          <Input
            id="sharpenAmount"
            type="range"
            min="0"
            max="100"
            value={parameters.sharpenAmount || 50}
            onChange={(e) => updateParameter("sharpenAmount", Number(e.target.value))}
            className="h-2"
          />
        </div>
      );

    case "vignette":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="vignetteAmount" className="text-xs">Amount</Label>
              <span className="text-xs text-muted-foreground">{parameters.vignetteAmount || 50}</span>
            </div>
            <Input
              id="vignetteAmount"
              type="range"
              min="0"
              max="100"
              value={parameters.vignetteAmount || 50}
              onChange={(e) => updateParameter("vignetteAmount", Number(e.target.value))}
              className="h-2"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="vignetteSize" className="text-xs">Size</Label>
              <span className="text-xs text-muted-foreground">{parameters.vignetteSize || 50}</span>
            </div>
            <Input
              id="vignetteSize"
              type="range"
              min="0"
              max="100"
              value={parameters.vignetteSize || 50}
              onChange={(e) => updateParameter("vignetteSize", Number(e.target.value))}
              className="h-2"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="vignetteSoftness" className="text-xs">Softness</Label>
              <span className="text-xs text-muted-foreground">{parameters.vignetteSoftness || 50}</span>
            </div>
            <Input
              id="vignetteSoftness"
              type="range"
              min="0"
              max="100"
              value={parameters.vignetteSoftness || 50}
              onChange={(e) => updateParameter("vignetteSoftness", Number(e.target.value))}
              className="h-2"
            />
          </div>
        </div>
      );

    case "chromaKey":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="keyColor" className="text-xs">Key Color</Label>
            <div className="flex gap-2">
              <Input
                id="keyColor"
                type="color"
                value={parameters.keyColor || "#00ff00"}
                onChange={(e) => updateParameter("keyColor", e.target.value)}
                className="h-8 w-16"
              />
              <Input
                type="text"
                value={parameters.keyColor || "#00ff00"}
                onChange={(e) => updateParameter("keyColor", e.target.value)}
                className="h-8 flex-1 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="tolerance" className="text-xs">Tolerance</Label>
              <span className="text-xs text-muted-foreground">{parameters.tolerance || 30}</span>
            </div>
            <Input
              id="tolerance"
              type="range"
              min="0"
              max="100"
              value={parameters.tolerance || 30}
              onChange={(e) => updateParameter("tolerance", Number(e.target.value))}
              className="h-2"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="softness" className="text-xs">Softness</Label>
              <span className="text-xs text-muted-foreground">{parameters.softness || 10}</span>
            </div>
            <Input
              id="softness"
              type="range"
              min="0"
              max="100"
              value={parameters.softness || 10}
              onChange={(e) => updateParameter("softness", Number(e.target.value))}
              className="h-2"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="spillSuppression" className="text-xs">Spill Suppression</Label>
              <span className="text-xs text-muted-foreground">{parameters.spillSuppression || 50}</span>
            </div>
            <Input
              id="spillSuppression"
              type="range"
              min="0"
              max="100"
              value={parameters.spillSuppression || 50}
              onChange={(e) => updateParameter("spillSuppression", Number(e.target.value))}
              className="h-2"
            />
          </div>
        </div>
      );

    case "noise":
    case "grain":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="noiseAmount" className="text-xs">Amount</Label>
              <span className="text-xs text-muted-foreground">{parameters.noiseAmount || 25}</span>
            </div>
            <Input
              id="noiseAmount"
              type="range"
              min="0"
              max="100"
              value={parameters.noiseAmount || 25}
              onChange={(e) => updateParameter("noiseAmount", Number(e.target.value))}
              className="h-2"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="noiseType" className="text-xs">Type</Label>
            <Select
              value={parameters.noiseType || "gaussian"}
              onValueChange={(value) => updateParameter("noiseType", value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gaussian">Gaussian</SelectItem>
                <SelectItem value="uniform">Uniform</SelectItem>
                <SelectItem value="salt_pepper">Salt & Pepper</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "pixelate":
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="pixelSize" className="text-xs">Pixel Size</Label>
            <span className="text-xs text-muted-foreground">{parameters.pixelSize || 10}</span>
          </div>
          <Input
            id="pixelSize"
            type="range"
            min="1"
            max="50"
            value={parameters.pixelSize || 10}
            onChange={(e) => updateParameter("pixelSize", Number(e.target.value))}
            className="h-2"
          />
        </div>
      );

    case "distortion":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="distortionAmount" className="text-xs">Amount</Label>
              <span className="text-xs text-muted-foreground">{parameters.distortionAmount || 50}</span>
            </div>
            <Input
              id="distortionAmount"
              type="range"
              min="0"
              max="100"
              value={parameters.distortionAmount || 50}
              onChange={(e) => updateParameter("distortionAmount", Number(e.target.value))}
              className="h-2"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="distortionType" className="text-xs">Type</Label>
            <Select
              value={parameters.distortionType || "barrel"}
              onValueChange={(value) => updateParameter("distortionType", value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="barrel">Barrel</SelectItem>
                <SelectItem value="pincushion">Pincushion</SelectItem>
                <SelectItem value="wave">Wave</SelectItem>
                <SelectItem value="ripple">Ripple</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    // Generic intensity control for other effects
    default:
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="intensity" className="text-xs">Intensity</Label>
            <span className="text-xs text-muted-foreground">{parameters.intensity || 50}</span>
          </div>
          <Input
            id="intensity"
            type="range"
            min="0"
            max="100"
            value={parameters.intensity || 50}
            onChange={(e) => updateParameter("intensity", Number(e.target.value))}
            className="h-2"
          />
        </div>
      );
  }
}