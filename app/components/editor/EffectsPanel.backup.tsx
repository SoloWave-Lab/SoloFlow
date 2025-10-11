import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import {
  Wand2,
  Palette,
  Volume2,
  Sparkles,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAdvancedEffects } from "~/hooks/useAdvancedEffects";
import type { EffectType, AudioEffectType, ColorCorrection } from "~/components/timeline/advanced-types";

interface EffectsPanelProps {
  selectedScrubberIds: string[];
}

export default function EffectsPanel({ selectedScrubberIds }: EffectsPanelProps) {
  const effects = useAdvancedEffects();
  const [activeTab, setActiveTab] = useState("effects");

  // Get the first selected scrubber for editing
  const selectedScrubberId = selectedScrubberIds[0] || null;

  // Visual Effects List
  const visualEffectTypes: { type: EffectType; label: string; icon: string }[] = [
    { type: "blur", label: "Blur", icon: "🌫️" },
    { type: "sharpen", label: "Sharpen", icon: "🔪" },
    { type: "vignette", label: "Vignette", icon: "⭕" },
    { type: "chromaKey", label: "Chroma Key", icon: "🟢" },
    { type: "noise", label: "Noise", icon: "📺" },
    { type: "grain", label: "Film Grain", icon: "🎞️" },
    { type: "pixelate", label: "Pixelate", icon: "🟦" },
    { type: "glitch", label: "Glitch", icon: "⚡" },
    { type: "distortion", label: "Distortion", icon: "🌀" },
    { type: "mirror", label: "Mirror", icon: "🪞" },
    { type: "kaleidoscope", label: "Kaleidoscope", icon: "🔮" },
    { type: "edgeDetect", label: "Edge Detect", icon: "📐" },
    { type: "emboss", label: "Emboss", icon: "🗿" },
    { type: "posterize", label: "Posterize", icon: "🎨" },
    { type: "sepia", label: "Sepia", icon: "📜" },
    { type: "grayscale", label: "Grayscale", icon: "⚫" },
    { type: "duotone", label: "Duotone", icon: "🎭" },
    { type: "bloom", label: "Bloom", icon: "✨" },
    { type: "lens_flare", label: "Lens Flare", icon: "☀️" },
    { type: "chromatic_aberration", label: "Chromatic Aberration", icon: "🌈" },
  ];

  // Audio Effects List
  const audioEffectTypes: { type: AudioEffectType; label: string; icon: string }[] = [
    { type: "volume", label: "Volume", icon: "🔊" },
    { type: "fade_in", label: "Fade In", icon: "📈" },
    { type: "fade_out", label: "Fade Out", icon: "📉" },
    { type: "normalize", label: "Normalize", icon: "📊" },
    { type: "compressor", label: "Compressor", icon: "🎚️" },
    { type: "limiter", label: "Limiter", icon: "🚧" },
    { type: "equalizer", label: "Equalizer", icon: "🎛️" },
    { type: "reverb", label: "Reverb", icon: "🏛️" },
    { type: "echo", label: "Echo", icon: "📢" },
    { type: "delay", label: "Delay", icon: "⏱️" },
    { type: "noise_reduction", label: "Noise Reduction", icon: "🔇" },
  ];

  const handleAddVisualEffect = (type: EffectType) => {
    if (!selectedScrubberId) return;
    
    effects.addVisualEffect(selectedScrubberId, {
      type,
      enabled: true,
      parameters: {},
    });
  };

  const handleAddAudioEffect = (type: AudioEffectType) => {
    if (!selectedScrubberId) return;
    
    effects.addAudioEffect(selectedScrubberId, {
      type,
      enabled: true,
      parameters: {},
    });
  };

  const currentVisualEffects = selectedScrubberId 
    ? effects.getVisualEffects(selectedScrubberId) 
    : [];

  const currentAudioEffects = selectedScrubberId 
    ? effects.getAudioEffects(selectedScrubberId) 
    : [];

  const currentColorCorrection = selectedScrubberId 
    ? effects.getColorCorrection(selectedScrubberId) 
    : null;

  const defaultColorCorrection: ColorCorrection = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    temperature: 0,
    tint: 0,
    exposure: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    vibrance: 0,
    gamma: 1.0,
  };

  const colorCorrection = currentColorCorrection || defaultColorCorrection;

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        {/* Tab Headers */}
        <div className="border-b border-border bg-muted/30">
          <TabsList className="grid w-full grid-cols-4 h-9 bg-transparent p-0">
            <TabsTrigger
              value="effects"
              className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Wand2 className="h-3 w-3 mr-1" />
              Effects
            </TabsTrigger>
            <TabsTrigger
              value="color"
              className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Palette className="h-3 w-3 mr-1" />
              Color
            </TabsTrigger>
            <TabsTrigger
              value="audio"
              className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Volume2 className="h-3 w-3 mr-1" />
              Audio
            </TabsTrigger>
            <TabsTrigger
              value="animation"
              className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Animate
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <ScrollArea className="flex-1">
          {!selectedScrubberId ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Select a clip on the timeline to add effects
            </div>
          ) : (
            <>
              {/* Visual Effects Tab */}
              <TabsContent value="effects" className="p-3 space-y-3 m-0">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Applied Effects
                  </h3>
                  {currentVisualEffects.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No effects applied</p>
                  ) : (
                    <div className="space-y-2">
                      {currentVisualEffects.map((effect) => (
                        <div
                          key={effect.id}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border"
                        >
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={effect.enabled}
                              onCheckedChange={() =>
                                effects.toggleVisualEffect(selectedScrubberId, effect.id)
                              }
                            />
                            <span className="text-xs font-medium capitalize">{effect.type}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => effects.removeVisualEffect(selectedScrubberId, effect.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Add Effect
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {visualEffectTypes.map((effect) => (
                      <Button
                        key={effect.type}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddVisualEffect(effect.type)}
                        className="h-auto py-2 px-2 flex flex-col items-center gap-1 text-xs"
                      >
                        <span className="text-lg">{effect.icon}</span>
                        <span className="text-[10px] leading-tight text-center">{effect.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Color Correction Tab */}
              <TabsContent value="color" className="p-3 space-y-3 m-0">
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Color Correction
                  </h3>

                  {/* Brightness */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="brightness" className="text-xs">
                        Brightness
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {colorCorrection.brightness}
                      </span>
                    </div>
                    <Input
                      id="brightness"
                      type="range"
                      min="-100"
                      max="100"
                      value={colorCorrection.brightness}
                      onChange={(e) =>
                        effects.setColorCorrection(selectedScrubberId, {
                          ...colorCorrection,
                          brightness: Number(e.target.value),
                        })
                      }
                      className="h-2"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="contrast" className="text-xs">
                        Contrast
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {colorCorrection.contrast}
                      </span>
                    </div>
                    <Input
                      id="contrast"
                      type="range"
                      min="-100"
                      max="100"
                      value={colorCorrection.contrast}
                      onChange={(e) =>
                        effects.setColorCorrection(selectedScrubberId, {
                          ...colorCorrection,
                          contrast: Number(e.target.value),
                        })
                      }
                      className="h-2"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="saturation" className="text-xs">
                        Saturation
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {colorCorrection.saturation}
                      </span>
                    </div>
                    <Input
                      id="saturation"
                      type="range"
                      min="-100"
                      max="100"
                      value={colorCorrection.saturation}
                      onChange={(e) =>
                        effects.setColorCorrection(selectedScrubberId, {
                          ...colorCorrection,
                          saturation: Number(e.target.value),
                        })
                      }
                      className="h-2"
                    />
                  </div>

                  {/* Exposure */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="exposure" className="text-xs">
                        Exposure
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {colorCorrection.exposure}
                      </span>
                    </div>
                    <Input
                      id="exposure"
                      type="range"
                      min="-100"
                      max="100"
                      value={colorCorrection.exposure}
                      onChange={(e) =>
                        effects.setColorCorrection(selectedScrubberId, {
                          ...colorCorrection,
                          exposure: Number(e.target.value),
                        })
                      }
                      className="h-2"
                    />
                  </div>

                  {/* Temperature */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="temperature" className="text-xs">
                        Temperature
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {colorCorrection.temperature}
                      </span>
                    </div>
                    <Input
                      id="temperature"
                      type="range"
                      min="-100"
                      max="100"
                      value={colorCorrection.temperature}
                      onChange={(e) =>
                        effects.setColorCorrection(selectedScrubberId, {
                          ...colorCorrection,
                          temperature: Number(e.target.value),
                        })
                      }
                      className="h-2"
                    />
                  </div>

                  {/* Tint */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tint" className="text-xs">
                        Tint
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {currentColorCorrection?.tint || 0}
                      </span>
                    </div>
                    <Input
                      id="tint"
                      type="range"
                      min="-100"
                      max="100"
                      value={currentColorCorrection?.tint || 0}
                      onChange={(e) =>
                        effects.setColorCorrection(selectedScrubberId, {
                          ...colorCorrection,
                          tint: Number(e.target.value),
                        })
                      }
                      className="h-2"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => effects.resetColorCorrection(selectedScrubberId)}
                    className="w-full text-xs"
                  >
                    Reset All
                  </Button>
                </div>
              </TabsContent>

              {/* Audio Effects Tab */}
              <TabsContent value="audio" className="p-3 space-y-3 m-0">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Applied Audio Effects
                  </h3>
                  {currentAudioEffects.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No audio effects applied</p>
                  ) : (
                    <div className="space-y-2">
                      {currentAudioEffects.map((effect) => (
                        <div
                          key={effect.id}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border"
                        >
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={effect.enabled}
                              onCheckedChange={(checked) =>
                                effects.updateAudioEffect(selectedScrubberId, effect.id, { enabled: checked })
                              }
                            />
                            <span className="text-xs font-medium capitalize">{effect.type}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => effects.removeAudioEffect(selectedScrubberId, effect.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Add Audio Effect
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {audioEffectTypes.map((effect) => (
                      <Button
                        key={effect.type}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddAudioEffect(effect.type)}
                        className="h-auto py-2 px-2 flex flex-col items-center gap-1 text-xs"
                      >
                        <span className="text-lg">{effect.icon}</span>
                        <span className="text-[10px] leading-tight text-center">{effect.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Animation Tab */}
              <TabsContent value="animation" className="p-3 space-y-3 m-0">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Keyframe Animation
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Keyframe animation UI coming soon. You can use the API to add keyframes programmatically.
                  </p>
                  <div className="p-3 rounded-md bg-muted/30 border border-border">
                    <code className="text-[10px] font-mono">
                      effects.addKeyframe(scrubberId, "opacity", 0, 0);
                      <br />
                      effects.addKeyframe(scrubberId, "opacity", 1, 100);
                    </code>
                  </div>
                </div>
              </TabsContent>
            </>
          )}
        </ScrollArea>
      </Tabs>
    </div>
  );
}