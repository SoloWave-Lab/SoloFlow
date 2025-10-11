import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { 
  Volume2, 
  VolumeX, 
  Volume1,
  TrendingUp,
  TrendingDown,
  Waves,
  Settings2
} from "lucide-react";
import type { AudioEffect } from "~/components/timeline/advanced-types";

interface AudioControlsPanelProps {
  scrubberId: string | null;
  audioEffects: AudioEffect[];
  onAddEffect: (scrubberId: string, effect: Omit<AudioEffect, "id">) => void;
  onUpdateEffect: (scrubberId: string, effectId: string, updates: Partial<AudioEffect>) => void;
  onRemoveEffect: (scrubberId: string, effectId: string) => void;
}

export function AudioControlsPanel({
  scrubberId,
  audioEffects,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
}: AudioControlsPanelProps) {
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [fadeInDuration, setFadeInDuration] = useState(0);
  const [fadeOutDuration, setFadeOutDuration] = useState(0);

  // Get current volume effect
  const volumeEffect = audioEffects.find(e => e.type === "volume");
  const fadeInEffect = audioEffects.find(e => e.type === "fade_in");
  const fadeOutEffect = audioEffects.find(e => e.type === "fade_out");

  useEffect(() => {
    if (volumeEffect) {
      setVolume(volumeEffect.parameters.volume || 100);
    }
    if (fadeInEffect) {
      setFadeInDuration(fadeInEffect.parameters.fadeDuration || 0);
    }
    if (fadeOutEffect) {
      setFadeOutDuration(fadeOutEffect.parameters.fadeDuration || 0);
    }
  }, [volumeEffect, fadeInEffect, fadeOutEffect]);

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    
    if (!scrubberId) return;

    if (volumeEffect) {
      onUpdateEffect(scrubberId, volumeEffect.id, {
        parameters: { ...volumeEffect.parameters, volume: value }
      });
    } else {
      onAddEffect(scrubberId, {
        type: "volume",
        enabled: true,
        parameters: { volume: value }
      });
    }
  };

  const handleMuteToggle = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    
    if (!scrubberId) return;

    if (volumeEffect) {
      onUpdateEffect(scrubberId, volumeEffect.id, {
        enabled: !newMuted
      });
    }
  };

  const handleFadeIn = (duration: number) => {
    setFadeInDuration(duration);
    
    if (!scrubberId) return;

    if (duration === 0 && fadeInEffect) {
      onRemoveEffect(scrubberId, fadeInEffect.id);
    } else if (fadeInEffect) {
      onUpdateEffect(scrubberId, fadeInEffect.id, {
        parameters: { fadeDuration: duration }
      });
    } else if (duration > 0) {
      onAddEffect(scrubberId, {
        type: "fade_in",
        enabled: true,
        parameters: { fadeDuration: duration }
      });
    }
  };

  const handleFadeOut = (duration: number) => {
    setFadeOutDuration(duration);
    
    if (!scrubberId) return;

    if (duration === 0 && fadeOutEffect) {
      onRemoveEffect(scrubberId, fadeOutEffect.id);
    } else if (fadeOutEffect) {
      onUpdateEffect(scrubberId, fadeOutEffect.id, {
        parameters: { fadeDuration: duration }
      });
    } else if (duration > 0) {
      onAddEffect(scrubberId, {
        type: "fade_out",
        enabled: true,
        parameters: { fadeDuration: duration }
      });
    }
  };

  const handleNormalize = () => {
    if (!scrubberId) return;

    onAddEffect(scrubberId, {
      type: "normalize",
      enabled: true,
      parameters: { targetLevel: -3 }
    });
  };

  if (!scrubberId) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Select an audio clip to adjust</p>
        </CardContent>
      </Card>
    );
  }

  const getVolumeIcon = () => {
    if (muted || volume === 0) return <VolumeX className="w-5 h-5" />;
    if (volume < 50) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="sticky top-0 bg-background z-10 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Waves className="w-5 h-5" />
          Audio Controls
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 p-4">
        <Tabs defaultValue="volume" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="effects">Effects</TabsTrigger>
          </TabsList>

          {/* VOLUME TAB */}
          <TabsContent value="volume" className="space-y-6 mt-4">
            {/* Master Volume */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  {getVolumeIcon()}
                  Volume
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium w-12 text-right">
                    {volume}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMuteToggle}
                    className="h-8 w-8 p-0"
                  >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Slider
                value={[volume]}
                onValueChange={([value]) => handleVolumeChange(value)}
                min={0}
                max={200}
                step={1}
                className="w-full"
                disabled={muted}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
                <span>200%</span>
              </div>
            </div>

            {/* Fade In */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Fade In
                </Label>
                <span className="text-sm text-muted-foreground">
                  {fadeInDuration.toFixed(1)}s
                </span>
              </div>
              <Slider
                value={[fadeInDuration]}
                onValueChange={([value]) => handleFadeIn(value)}
                min={0}
                max={5}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Fade Out */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Fade Out
                </Label>
                <span className="text-sm text-muted-foreground">
                  {fadeOutDuration.toFixed(1)}s
                </span>
              </div>
              <Slider
                value={[fadeOutDuration]}
                onValueChange={([value]) => handleFadeOut(value)}
                min={0}
                max={5}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Label>Quick Actions</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNormalize}
                >
                  Normalize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVolumeChange(100)}
                >
                  Reset Volume
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* EFFECTS TAB */}
          <TabsContent value="effects" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Applied Effects</Label>
              {audioEffects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No effects applied</p>
              ) : (
                <div className="space-y-2">
                  {audioEffects.map((effect) => (
                    <div
                      key={effect.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={effect.enabled}
                          onCheckedChange={(checked) =>
                            onUpdateEffect(scrubberId, effect.id, { enabled: checked })
                          }
                        />
                        <span className="text-sm font-medium capitalize">
                          {effect.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveEffect(scrubberId, effect.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Add Effect</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (scrubberId) {
                      onAddEffect(scrubberId, {
                        type: "compressor",
                        enabled: true,
                        parameters: {
                          threshold: -20,
                          ratio: 4,
                          attack: 5,
                          release: 50,
                          knee: 2,
                          makeupGain: 0
                        }
                      });
                    }
                  }}
                >
                  Compressor
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (scrubberId) {
                      onAddEffect(scrubberId, {
                        type: "equalizer",
                        enabled: true,
                        parameters: {
                          bands: [
                            { frequency: 100, gain: 0, q: 1, type: "lowshelf" },
                            { frequency: 1000, gain: 0, q: 1, type: "peaking" },
                            { frequency: 10000, gain: 0, q: 1, type: "highshelf" }
                          ]
                        }
                      });
                    }
                  }}
                >
                  Equalizer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (scrubberId) {
                      onAddEffect(scrubberId, {
                        type: "reverb",
                        enabled: true,
                        parameters: {
                          roomSize: 0.5,
                          damping: 0.5,
                          wetLevel: 0.3,
                          dryLevel: 0.7
                        }
                      });
                    }
                  }}
                >
                  Reverb
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (scrubberId) {
                      onAddEffect(scrubberId, {
                        type: "delay",
                        enabled: true,
                        parameters: {
                          delayTime: 250,
                          feedback: 0.3
                        }
                      });
                    }
                  }}
                >
                  Delay
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}