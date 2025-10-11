import React, { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import {
  Wand2,
  Palette,
  Volume2,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Layers,
  Bookmark,
} from "lucide-react";
import { useAdvancedEffects } from "~/hooks/useAdvancedEffects";
import type { EffectType, AudioEffectType, ColorCorrection } from "~/components/timeline/advanced-types";
import EffectParameters from "./EffectParameters";
import ColorWheels from "./ColorWheels";
import CurvesEditor from "./CurvesEditor";
import LUTManager from "./LUTManager";
import BlendModeControls from "./BlendModeControls";
import EffectPresets from "./EffectPresets";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";

interface EffectsPanelProps {
  selectedScrubberIds: string[];
}

export default function EffectsPanel({ selectedScrubberIds }: EffectsPanelProps) {
  const effects = useAdvancedEffects();
  const [activeTab, setActiveTab] = useState("effects");
  const [expandedEffect, setExpandedEffect] = useState<string | null>(null);
  const [colorSection, setColorSection] = useState<"basic" | "wheels" | "curves">("basic");

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
  const tabListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!tabListRef.current) {
      return;
    }

    const element = tabListRef.current;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) {
        return;
      }

      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      element.scrollBy({
        left: event.deltaY,
        behavior: "smooth",
      });
      event.preventDefault();
    };

    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        {/* Tab Headers */}
        <div className="border-b border-border bg-muted/30">
          <div className="relative">
            <TabsList
              ref={tabListRef}
              className="flex w-full h-9 gap-1 overflow-x-auto scroll-smooth whitespace-nowrap bg-transparent px-2 py-0 scrollbar-hide justify-start"
            >
              <TabsTrigger
                value="effects"
                className="flex-shrink-0 h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Wand2 className="h-3 w-3 mr-1" />
                Effects
              </TabsTrigger>
              <TabsTrigger
                value="color"
                className="flex-shrink-0 h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Palette className="h-3 w-3 mr-1" />
                Color
              </TabsTrigger>
              <TabsTrigger
                value="lut"
                className="flex-shrink-0 h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <ImageIcon className="h-3 w-3 mr-1" />
                LUT
              </TabsTrigger>
              <TabsTrigger
                value="blend"
                className="flex-shrink-0 h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Layers className="h-3 w-3 mr-1" />
                Blend
              </TabsTrigger>
              <TabsTrigger
                value="audio"
                className="flex-shrink-0 h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Volume2 className="h-3 w-3 mr-1" />
                Audio
              </TabsTrigger>
              <TabsTrigger
                value="presets"
                className="flex-shrink-0 h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Bookmark className="h-3 w-3 mr-1" />
                Presets
              </TabsTrigger>
              <TabsTrigger
                value="animation"
                className="flex-shrink-0 h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Animate
              </TabsTrigger>
            </TabsList>
          </div>
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
                        <Collapsible
                          key={effect.id}
                          open={expandedEffect === effect.id}
                          onOpenChange={(open) => setExpandedEffect(open ? effect.id : null)}
                        >
                          <div className="rounded-md bg-muted/50 border border-border">
                            <div className="flex items-center justify-between p-2">
                              <div className="flex items-center gap-2 flex-1">
                                <Switch
                                  checked={effect.enabled}
                                  onCheckedChange={(checked) =>
                                    effects.toggleVisualEffect(selectedScrubberId, effect.id)
                                  }
                                />
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    {expandedEffect === effect.id ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
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
                            <CollapsibleContent>
                              <div className="px-2 pb-2 pt-1 border-t border-border/50">
                                <EffectParameters
                                  effectType={effect.type}
                                  parameters={effect.parameters}
                                  onChange={(newParams) => {
                                    effects.updateVisualEffect(selectedScrubberId, effect.id, {
                                      ...effect,
                                      parameters: newParams,
                                    });
                                  }}
                                />
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
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
                {/* Color Section Selector */}
                <div className="flex gap-1 p-1 bg-muted rounded-md">
                  <Button
                    variant={colorSection === "basic" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setColorSection("basic")}
                    className="flex-1 h-7 text-xs"
                  >
                    Basic
                  </Button>
                  <Button
                    variant={colorSection === "wheels" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setColorSection("wheels")}
                    className="flex-1 h-7 text-xs"
                  >
                    Wheels
                  </Button>
                  <Button
                    variant={colorSection === "curves" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setColorSection("curves")}
                    className="flex-1 h-7 text-xs"
                  >
                    Curves
                  </Button>
                </div>

                {/* Basic Color Correction */}
                {colorSection === "basic" && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Basic Adjustments
                    </h3>
                    {/* Basic sliders would go here - keeping existing implementation */}
                    <p className="text-xs text-muted-foreground">
                      Basic color correction sliders (brightness, contrast, saturation, etc.)
                    </p>
                  </div>
                )}

                {/* Color Wheels - Disabled: ColorCorrection type doesn't support colorWheels property */}
                {/* {colorSection === "wheels" && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      3-Way Color Grading
                    </h3>
                    <p className="text-xs text-muted-foreground">Color wheels feature coming soon</p>
                  </div>
                )} */}

                {/* Curves Editor - Disabled: ColorCorrection type doesn't support curves property */}
                {/* {colorSection === "curves" && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Tone Curves
                    </h3>
                    <p className="text-xs text-muted-foreground">Curves editor feature coming soon</p>
                  </div>
                )} */}
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

              {/* LUT Tab */}
              <TabsContent value="lut" className="p-3 space-y-3 m-0">
                <LUTManager
                  selectedScrubberId={selectedScrubberId}
                  currentLUT={effects.getLUT(selectedScrubberId)}
                  onApplyLUT={(lut) => effects.applyLUT(selectedScrubberId, lut)}
                  onRemoveLUT={() => effects.removeLUT(selectedScrubberId)}
                  onIntensityChange={(intensity) => {
                    const currentLUT = effects.getLUT(selectedScrubberId);
                    if (currentLUT) {
                      effects.applyLUT(selectedScrubberId, { ...currentLUT, intensity });
                    }
                  }}
                />
              </TabsContent>

              {/* Blend Mode Tab */}
              <TabsContent value="blend" className="p-3 space-y-3 m-0">
                <BlendModeControls
                  blendMode={effects.getBlendMode(selectedScrubberId)?.mode || "normal"}
                  opacity={effects.getBlendMode(selectedScrubberId)?.opacity || 100}
                  onBlendModeChange={(mode) => {
                    const currentOpacity = effects.getBlendMode(selectedScrubberId)?.opacity || 100;
                    effects.setBlendMode(selectedScrubberId, mode, currentOpacity);
                  }}
                  onOpacityChange={(opacity) => {
                    effects.setOpacity(selectedScrubberId, opacity);
                  }}
                />
              </TabsContent>

              {/* Presets Tab */}
              <TabsContent value="presets" className="p-3 space-y-3 m-0">
                <EffectPresets
                  selectedScrubberId={selectedScrubberId}
                  currentVisualEffects={currentVisualEffects}
                  currentColorCorrection={currentColorCorrection || undefined}
                  currentAudioEffects={currentAudioEffects}
                  onApplyPreset={(preset) => {
                    // Apply all effects from preset
                    preset.visualEffects.forEach((effect) => {
                      effects.addVisualEffect(selectedScrubberId, effect);
                    });
                    if (preset.colorCorrection) {
                      effects.setColorCorrection(selectedScrubberId, preset.colorCorrection);
                    }
                    if (preset.audioEffects) {
                      preset.audioEffects.forEach((effect) => {
                        effects.addAudioEffect(selectedScrubberId, effect);
                      });
                    }
                  }}
                />
              </TabsContent>

              {/* Animation Tab */}
              <TabsContent value="animation" className="p-3 space-y-3 m-0">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Keyframe Animation
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Animation features coming soon...
                  </p>
                </div>
              </TabsContent>
            </>
          )}
        </ScrollArea>
      </Tabs>
    </div>
  );
}