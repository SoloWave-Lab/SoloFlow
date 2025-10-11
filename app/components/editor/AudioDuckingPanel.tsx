import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Slider } from "~/components/ui/slider";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useAudioDucking } from "~/hooks/useAudio";
import { Volume2, VolumeX, Plus, Trash2 } from "lucide-react";

interface AudioDuckingPanelProps {
  projectId: string;
  availableTracks: Array<{ id: string; name: string; type: string }>;
}

export function AudioDuckingPanel({ projectId, availableTracks }: AudioDuckingPanelProps) {
  const {
    duckingRules,
    loading,
    loadDuckingRules,
    createDuckingRule,
    updateDuckingRule,
    deleteDuckingRule,
  } = useAudioDucking(projectId);

  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    targetScrubberId: "",
    triggerScrubberId: "",
  });

  useEffect(() => {
    loadDuckingRules();
  }, [loadDuckingRules]);

  const handleCreateRule = async () => {
    if (!newRule.targetScrubberId || !newRule.triggerScrubberId) return;

    await createDuckingRule({
      targetScrubberId: newRule.targetScrubberId,
      triggerScrubberId: newRule.triggerScrubberId,
    });

    setNewRule({ targetScrubberId: "", triggerScrubberId: "" });
  };

  const audioTracks = availableTracks.filter((t) => t.type === "audio");
  const selectedRuleData = duckingRules.find((r) => r.id === selectedRule);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Audio Ducking
        </h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Automatically lower background music when voice or other audio plays
      </p>

      {/* Create New Rule */}
      <Card className="p-4 space-y-3">
        <Label>Create Ducking Rule</Label>

        <div className="space-y-2">
          <Label className="text-xs">Target Track (to duck)</Label>
          <Select
            value={newRule.targetScrubberId}
            onValueChange={(targetScrubberId) =>
              setNewRule({ ...newRule, targetScrubberId })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select track to duck..." />
            </SelectTrigger>
            <SelectContent>
              {audioTracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Trigger Track (voice/dialog)</Label>
          <Select
            value={newRule.triggerScrubberId}
            onValueChange={(triggerScrubberId) =>
              setNewRule({ ...newRule, triggerScrubberId })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select trigger track..." />
            </SelectTrigger>
            <SelectContent>
              {audioTracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleCreateRule}
          disabled={!newRule.targetScrubberId || !newRule.triggerScrubberId}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Ducking Rule
        </Button>
      </Card>

      {/* Ducking Rules List */}
      <div className="space-y-2">
        <Label>Active Ducking Rules</Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading ducking rules...</p>
        ) : duckingRules.length === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              No ducking rules yet. Create one to get started.
            </p>
          </Card>
        ) : (
          duckingRules.map((rule) => {
            const targetTrack = audioTracks.find((t) => t.id === rule.targetScrubberId);
            const triggerTrack = audioTracks.find((t) => t.id === rule.triggerScrubberId);

            return (
              <Card
                key={rule.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedRule === rule.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                }`}
                onClick={() => setSelectedRule(rule.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(enabled) =>
                          updateDuckingRule(rule.id, { enabled })
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {targetTrack?.name || "Unknown"} ← {triggerTrack?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Duck by {Math.abs(rule.duckingAmount)}dB
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDuckingRule(rule.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Rule Settings */}
      {selectedRuleData && (
        <Card className="p-4 space-y-4">
          <h4 className="font-medium">Ducking Settings</h4>

          {/* Ducking Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ducking Amount</Label>
              <span className="text-sm text-muted-foreground">
                {selectedRuleData.duckingAmount}dB
              </span>
            </div>
            <Slider
              value={[selectedRuleData.duckingAmount]}
              onValueChange={([duckingAmount]) =>
                updateDuckingRule(selectedRuleData.id, { duckingAmount })
              }
              min={-60}
              max={0}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How much to reduce volume (negative values)
            </p>
          </div>

          {/* Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Threshold</Label>
              <span className="text-sm text-muted-foreground">
                {selectedRuleData.threshold}dB
              </span>
            </div>
            <Slider
              value={[selectedRuleData.threshold]}
              onValueChange={([threshold]) =>
                updateDuckingRule(selectedRuleData.id, { threshold })
              }
              min={-60}
              max={0}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Trigger level for ducking to activate
            </p>
          </div>

          {/* Attack */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Attack Time</Label>
              <span className="text-sm text-muted-foreground">
                {selectedRuleData.attack}ms
              </span>
            </div>
            <Slider
              value={[selectedRuleData.attack]}
              onValueChange={([attack]) =>
                updateDuckingRule(selectedRuleData.id, { attack })
              }
              min={1}
              max={1000}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How quickly ducking starts
            </p>
          </div>

          {/* Release */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Release Time</Label>
              <span className="text-sm text-muted-foreground">
                {selectedRuleData.release}ms
              </span>
            </div>
            <Slider
              value={[selectedRuleData.release]}
              onValueChange={([release]) =>
                updateDuckingRule(selectedRuleData.id, { release })
              }
              min={1}
              max={5000}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How quickly volume returns to normal
            </p>
          </div>

          {/* Auto Detect */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Detect Voice</Label>
              <p className="text-xs text-muted-foreground">
                Automatically detect voice frequencies
              </p>
            </div>
            <Switch
              checked={selectedRuleData.autoDetect}
              onCheckedChange={(autoDetect) =>
                updateDuckingRule(selectedRuleData.id, { autoDetect })
              }
            />
          </div>
        </Card>
      )}
    </div>
  );
}