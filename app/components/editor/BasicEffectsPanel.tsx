import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { 
  Sparkles,
  Focus,
  Circle,
  Plus,
  Trash2,
  Settings2
} from "lucide-react";
import type { VisualEffect, EffectType } from "~/components/timeline/advanced-types";

interface BasicEffectsPanelProps {
  scrubberId: string | null;
  visualEffects: VisualEffect[];
  onAddEffect: (scrubberId: string, effect: Omit<VisualEffect, "id">) => void;
  onUpdateEffect: (scrubberId: string, effectId: string, updates: Partial<VisualEffect>) => void;
  onRemoveEffect: (scrubberId: string, effectId: string) => void;
  onToggleEffect: (scrubberId: string, effectId: string, enabled: boolean) => void;
}

const basicEffects: { type: EffectType; label: string; icon: any; description: string }[] = [
  { type: "blur", label: "Blur", icon: Circle, description: "Add gaussian, motion, or radial blur" },
  { type: "sharpen", label: "Sharpen", icon: Focus, description: "Enhance image sharpness" },
  { type: "vignette", label: "Vignette", icon: Circle, description: "Darken edges of the frame" },
  { type: "noise", label: "Noise/Grain", icon: Sparkles, description: "Add film grain or noise" },
  { type: "glow", label: "Glow", icon: Sparkles, description: "Add soft glow effect" },
];

export function BasicEffectsPanel({
  scrubberId,
  visualEffects,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
  onToggleEffect,
}: BasicEffectsPanelProps) {
  const [selectedEffectType, setSelectedEffectType] = useState<EffectType>("blur");

  const handleAddEffect = (type: EffectType) => {
    if (!scrubberId) return;

    // Default parameters based on effect type
    let parameters = {};
    
    switch (type) {
      case "blur":
        parameters = { blurAmount: 5, blurType: "gaussian" };
        break;
      case "sharpen":
        parameters = { sharpenAmount: 50 };
        break;
      case "vignette":
        parameters = { vignetteAmount: 50, vignetteSize: 50, vignetteSoftness: 50 };
        break;
      case "noise":
        parameters = { noiseAmount: 20, noiseType: "gaussian" };
        break;
      case "glow":
        parameters = { intensity: 50, mix: 50 };
        break;
    }

    onAddEffect(scrubberId, {
      type,
      enabled: true,
      parameters,
    });
  };

  const getEffectComponent = (effect: VisualEffect) => {
    switch (effect.type) {
      case "blur":
        return <BlurEffectControls effect={effect} onUpdate={onUpdateEffect} scrubberId={scrubberId!} />;
      case "sharpen":
        return <SharpenEffectControls effect={effect} onUpdate={onUpdateEffect} scrubberId={scrubberId!} />;
      case "vignette":
        return <VignetteEffectControls effect={effect} onUpdate={onUpdateEffect} scrubberId={scrubberId!} />;
      case "noise":
        return <NoiseEffectControls effect={effect} onUpdate={onUpdateEffect} scrubberId={scrubberId!} />;
      case "glow":
        return <GlowEffectControls effect={effect} onUpdate={onUpdateEffect} scrubberId={scrubberId!} />;
      default:
        return null;
    }
  };

  if (!scrubberId) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Select a clip to add effects</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="sticky top-0 bg-background z-10 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Visual Effects
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 p-4">
        {/* Applied Effects */}
        <div className="space-y-2">
          <Label>Applied Effects</Label>
          {visualEffects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No effects applied</p>
          ) : (
            <div className="space-y-3">
              {visualEffects.map((effect) => (
                <div key={effect.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={effect.enabled}
                        onCheckedChange={(checked) => onToggleEffect(scrubberId, effect.id, checked)}
                      />
                      <span className="text-sm font-medium capitalize">
                        {effect.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveEffect(scrubberId, effect.id)}
                      className="h-7 px-2 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {effect.enabled && getEffectComponent(effect)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Effect */}
        <div className="space-y-2">
          <Label>Add Effect</Label>
          <div className="grid grid-cols-2 gap-2">
            {basicEffects.map((effect) => {
              const Icon = effect.icon;
              return (
                <Button
                  key={effect.type}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddEffect(effect.type)}
                  className="h-auto py-2 flex flex-col items-start gap-1"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{effect.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-left">
                    {effect.description}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Individual effect control components
function BlurEffectControls({ 
  effect, 
  onUpdate, 
  scrubberId 
}: { 
  effect: VisualEffect; 
  onUpdate: (scrubberId: string, effectId: string, updates: Partial<VisualEffect>) => void;
  scrubberId: string;
}) {
  const blurAmount = effect.parameters.blurAmount || 5;
  const blurType = effect.parameters.blurType || "gaussian";
  const blurAngle = effect.parameters.blurAngle || 0;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Blur Type</Label>
        <Select
          value={blurType}
          onValueChange={(value: "gaussian" | "motion" | "radial" | "zoom") => 
            onUpdate(scrubberId, effect.id, {
              parameters: { ...effect.parameters, blurType: value }
            })
          }
        >
          <SelectTrigger className="h-8">
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Amount</Label>
          <span className="text-xs text-muted-foreground">{blurAmount}</span>
        </div>
        <Slider
          value={[blurAmount]}
          onValueChange={([value]) =>
            onUpdate(scrubberId, effect.id, {
              parameters: { ...effect.parameters, blurAmount: value }
            })
          }
          min={0}
          max={100}
          step={1}
        />
      </div>

      {blurType === "motion" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Angle</Label>
            <span className="text-xs text-muted-foreground">{blurAngle}°</span>
          </div>
          <Slider
            value={[blurAngle]}
            onValueChange={([value]) =>
              onUpdate(scrubberId, effect.id, {
                parameters: { ...effect.parameters, blurAngle: value }
              })
            }
            min={0}
            max={360}
            step={1}
          />
        </div>
      )}
    </div>
  );
}

function SharpenEffectControls({ 
  effect, 
  onUpdate, 
  scrubberId 
}: { 
  effect: VisualEffect; 
  onUpdate: (scrubberId: string, effectId: string, updates: Partial<VisualEffect>) => void;
  scrubberId: string;
}) {
  const sharpenAmount = effect.parameters.sharpenAmount || 50;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Amount</Label>
        <span className="text-xs text-muted-foreground">{sharpenAmount}</span>
      </div>
      <Slider
        value={[sharpenAmount]}
        onValueChange={([value]) =>
          onUpdate(scrubberId, effect.id, {
            parameters: { ...effect.parameters, sharpenAmount: value }
          })
        }
        min={0}
        max={100}
        step={1}
      />
    </div>
  );
}

function VignetteEffectControls({ 
  effect, 
  onUpdate, 
  scrubberId 
}: { 
  effect: VisualEffect; 
  onUpdate: (scrubberId: string, effectId: string, updates: Partial<VisualEffect>) => void;
  scrubberId: string;
}) {
  const vignetteAmount = effect.parameters.vignetteAmount || 50;
  const vignetteSize = effect.parameters.vignetteSize || 50;
  const vignetteSoftness = effect.parameters.vignetteSoftness || 50;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Amount</Label>
          <span className="text-xs text-muted-foreground">{vignetteAmount}</span>
        </div>
        <Slider
          value={[vignetteAmount]}
          onValueChange={([value]) =>
            onUpdate(scrubberId, effect.id, {
              parameters: { ...effect.parameters, vignetteAmount: value }
            })
          }
          min={0}
          max={100}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Size</Label>
          <span className="text-xs text-muted-foreground">{vignetteSize}</span>
        </div>
        <Slider
          value={[vignetteSize]}
          onValueChange={([value]) =>
            onUpdate(scrubberId, effect.id, {
              parameters: { ...effect.parameters, vignetteSize: value }
            })
          }
          min={0}
          max={100}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Softness</Label>
          <span className="text-xs text-muted-foreground">{vignetteSoftness}</span>
        </div>
        <Slider
          value={[vignetteSoftness]}
          onValueChange={([value]) =>
            onUpdate(scrubberId, effect.id, {
              parameters: { ...effect.parameters, vignetteSoftness: value }
            })
          }
          min={0}
          max={100}
          step={1}
        />
      </div>
    </div>
  );
}

function NoiseEffectControls({ 
  effect, 
  onUpdate, 
  scrubberId 
}: { 
  effect: VisualEffect; 
  onUpdate: (scrubberId: string, effectId: string, updates: Partial<VisualEffect>) => void;
  scrubberId: string;
}) {
  const noiseAmount = effect.parameters.noiseAmount || 20;
  const noiseType = effect.parameters.noiseType || "gaussian";

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Noise Type</Label>
        <Select
          value={noiseType}
          onValueChange={(value: "gaussian" | "uniform" | "salt_pepper") =>
            onUpdate(scrubberId, effect.id, {
              parameters: { ...effect.parameters, noiseType: value }
            })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gaussian">Gaussian</SelectItem>
            <SelectItem value="uniform">Uniform</SelectItem>
            <SelectItem value="salt_pepper">Salt & Pepper</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Amount</Label>
          <span className="text-xs text-muted-foreground">{noiseAmount}</span>
        </div>
        <Slider
          value={[noiseAmount]}
          onValueChange={([value]) =>
            onUpdate(scrubberId, effect.id, {
              parameters: { ...effect.parameters, noiseAmount: value }
            })
          }
          min={0}
          max={100}
          step={1}
        />
      </div>
    </div>
  );
}

function GlowEffectControls({ 
  effect, 
  onUpdate, 
  scrubberId 
}: { 
  effect: VisualEffect; 
  onUpdate: (scrubberId: string, effectId: string, updates: Partial<VisualEffect>) => void;
  scrubberId: string;
}) {
  const intensity = effect.parameters.intensity || 50;
  const mix = effect.parameters.mix || 50;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Intensity</Label>
          <span className="text-xs text-muted-foreground">{intensity}</span>
        </div>
        <Slider
          value={[intensity]}
          onValueChange={([value]) =>
            onUpdate(scrubberId, effect.id, {
              parameters: { ...effect.parameters, intensity: value }
            })
          }
          min={0}
          max={100}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Mix</Label>
          <span className="text-xs text-muted-foreground">{mix}</span>
        </div>
        <Slider
          value={[mix]}
          onValueChange={([value]) =>
            onUpdate(scrubberId, effect.id, {
              parameters: { ...effect.parameters, mix: value }
            })
          }
          min={0}
          max={100}
          step={1}
        />
      </div>
    </div>
  );
}