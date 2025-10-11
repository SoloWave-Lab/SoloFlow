import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Slider } from "~/components/ui/slider";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useAudioMixing } from "~/hooks/useAudio";
import { Volume2, VolumeX, Headphones } from "lucide-react";

interface AudioMixingPanelProps {
  projectId: string;
  tracks: Array<{ index: number; name: string }>;
}

export function AudioMixingPanel({ projectId, tracks }: AudioMixingPanelProps) {
  const {
    trackMixing,
    masterAudio,
    loading,
    loadMixing,
    updateTrackMixing,
    updateMasterAudio,
  } = useAudioMixing(projectId);

  useEffect(() => {
    loadMixing();
  }, [loadMixing]);

  const getTrackMixing = (trackIndex: number) => {
    return trackMixing.get(trackIndex) || {
      trackIndex,
      volume: 100,
      pan: 0,
      muted: false,
      solo: false,
    };
  };

  const handleTrackUpdate = async (trackIndex: number, updates: any) => {
    await updateTrackMixing(trackIndex, updates);
  };

  const handleMasterUpdate = async (updates: any) => {
    await updateMasterAudio(updates);
  };

  const getPanLabel = (pan: number) => {
    if (pan === 0) return "Center";
    if (pan < 0) return `${Math.abs(pan)}% Left`;
    return `${pan}% Right`;
  };

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Loading audio mixing...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Headphones className="w-5 h-5" />
          Audio Mixing
        </h3>
      </div>

      <Tabs defaultValue="tracks" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tracks">Track Mixing</TabsTrigger>
          <TabsTrigger value="master">Master Output</TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="space-y-3">
          {tracks.length === 0 ? (
            <Card className="p-4">
              <p className="text-sm text-muted-foreground text-center">
                No audio tracks in timeline
              </p>
            </Card>
          ) : (
            tracks.map((track) => {
              const mixing = getTrackMixing(track.index);

              return (
                <Card key={track.index} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {mixing.muted ? (
                        <VolumeX className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                      <h4 className="font-medium">{track.name}</h4>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={mixing.solo ? "default" : "outline"}
                        onClick={() =>
                          handleTrackUpdate(track.index, { solo: !mixing.solo })
                        }
                      >
                        S
                      </Button>
                      <Button
                        size="sm"
                        variant={mixing.muted ? "destructive" : "outline"}
                        onClick={() =>
                          handleTrackUpdate(track.index, { muted: !mixing.muted })
                        }
                      >
                        M
                      </Button>
                    </div>
                  </div>

                  {/* Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Volume</Label>
                      <span className="text-xs text-muted-foreground">
                        {mixing.volume}%
                      </span>
                    </div>
                    <Slider
                      value={[mixing.volume]}
                      onValueChange={([volume]) =>
                        handleTrackUpdate(track.index, { volume })
                      }
                      min={0}
                      max={200}
                      step={1}
                      className="w-full"
                      disabled={mixing.muted}
                    />
                  </div>

                  {/* Pan */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Pan</Label>
                      <span className="text-xs text-muted-foreground">
                        {getPanLabel(mixing.pan)}
                      </span>
                    </div>
                    <Slider
                      value={[mixing.pan]}
                      onValueChange={([pan]) =>
                        handleTrackUpdate(track.index, { pan })
                      }
                      min={-100}
                      max={100}
                      step={1}
                      className="w-full"
                      disabled={mixing.muted}
                    />
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        handleTrackUpdate(track.index, { volume: 100, pan: 0 })
                      }
                    >
                      Reset
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="master" className="space-y-4">
          <Card className="p-4 space-y-4">
            <h4 className="font-medium">Master Output Settings</h4>

            {/* Master Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Master Volume</Label>
                <span className="text-sm text-muted-foreground">
                  {masterAudio?.masterVolume || 100}%
                </span>
              </div>
              <Slider
                value={[masterAudio?.masterVolume || 100]}
                onValueChange={([masterVolume]) =>
                  handleMasterUpdate({ masterVolume })
                }
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Overall output volume for the entire project
              </p>
            </div>

            {/* Master Pan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Master Pan</Label>
                <span className="text-sm text-muted-foreground">
                  {getPanLabel(masterAudio?.masterPan || 0)}
                </span>
              </div>
              <Slider
                value={[masterAudio?.masterPan || 0]}
                onValueChange={([masterPan]) => handleMasterUpdate({ masterPan })}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Limiter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Master Limiter</Label>
                  <p className="text-xs text-muted-foreground">
                    Prevent audio clipping and distortion
                  </p>
                </div>
                <Switch
                  checked={masterAudio?.limiterEnabled ?? true}
                  onCheckedChange={(limiterEnabled) =>
                    handleMasterUpdate({ limiterEnabled })
                  }
                />
              </div>

              {masterAudio?.limiterEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Limiter Threshold</Label>
                    <span className="text-xs text-muted-foreground">
                      {masterAudio.limiterThreshold}dB
                    </span>
                  </div>
                  <Slider
                    value={[masterAudio.limiterThreshold]}
                    onValueChange={([limiterThreshold]) =>
                      handleMasterUpdate({ limiterThreshold })
                    }
                    min={-20}
                    max={0}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum output level before limiting
                  </p>
                </div>
              )}
            </div>

            {/* Normalize on Export */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Normalize on Export</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically adjust levels when exporting
                </p>
              </div>
              <Switch
                checked={masterAudio?.normalizeOnExport ?? false}
                onCheckedChange={(normalizeOnExport) =>
                  handleMasterUpdate({ normalizeOnExport })
                }
              />
            </div>

            {/* Reset Master */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                handleMasterUpdate({
                  masterVolume: 100,
                  masterPan: 0,
                  limiterEnabled: true,
                  limiterThreshold: -1,
                  normalizeOnExport: false,
                })
              }
            >
              Reset Master Settings
            </Button>
          </Card>

          {/* Audio Meters Placeholder */}
          <Card className="p-4">
            <Label className="mb-2 block">Audio Meters</Label>
            <div className="h-32 bg-muted rounded flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Audio meters will appear here during playback
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}