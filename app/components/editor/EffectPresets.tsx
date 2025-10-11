/**
 * Effect Presets Component
 * 
 * Provides UI for:
 * - Saving current effect combinations as presets
 * - Loading presets to apply to clips
 * - Managing preset library
 * - Sharing presets between projects
 */

import React, { useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Save, Trash2, Download, Upload, Star, StarOff } from "lucide-react";
import { toast } from "sonner";
import type { VisualEffect, ColorCorrection, AudioEffect } from "~/components/timeline/advanced-types";

interface EffectPreset {
  id: string;
  name: string;
  description?: string;
  visualEffects: VisualEffect[];
  colorCorrection?: ColorCorrection;
  audioEffects?: AudioEffect[];
  blendMode?: string;
  opacity?: number;
  isFavorite: boolean;
  createdAt: string;
  thumbnail?: string;
}

interface EffectPresetsProps {
  selectedScrubberId: string | null;
  currentVisualEffects: VisualEffect[];
  currentColorCorrection?: ColorCorrection;
  currentAudioEffects?: AudioEffect[];
  currentBlendMode?: string;
  currentOpacity?: number;
  onApplyPreset: (preset: EffectPreset) => void;
}

export default function EffectPresets({
  selectedScrubberId,
  currentVisualEffects,
  currentColorCorrection,
  currentAudioEffects,
  currentBlendMode,
  currentOpacity,
  onApplyPreset,
}: EffectPresetsProps) {
  const [presets, setPresets] = useState<EffectPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);

  /**
   * Save current effects as a preset
   */
  const handleSavePreset = useCallback(async () => {
    if (!presetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    if (currentVisualEffects.length === 0 && !currentColorCorrection && !currentAudioEffects?.length) {
      toast.error("No effects to save");
      return;
    }

    setIsSaving(true);

    try {
      const newPreset: EffectPreset = {
        id: `preset-${Date.now()}`,
        name: presetName.trim(),
        description: presetDescription.trim() || undefined,
        visualEffects: currentVisualEffects,
        colorCorrection: currentColorCorrection,
        audioEffects: currentAudioEffects,
        blendMode: currentBlendMode,
        opacity: currentOpacity,
        isFavorite: false,
        createdAt: new Date().toISOString(),
      };

      // Save to server
      const response = await fetch("/api/effects/presets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPreset),
      });

      if (!response.ok) {
        throw new Error("Failed to save preset");
      }

      const savedPreset = await response.json();

      setPresets((prev) => [savedPreset, ...prev]);
      setPresetName("");
      setPresetDescription("");

      toast.success(`Preset "${newPreset.name}" saved successfully`);
    } catch (error) {
      console.error("Failed to save preset:", error);
      toast.error("Failed to save preset");
    } finally {
      setIsSaving(false);
    }
  }, [
    presetName,
    presetDescription,
    currentVisualEffects,
    currentColorCorrection,
    currentAudioEffects,
    currentBlendMode,
    currentOpacity,
  ]);

  /**
   * Load presets from server
   */
  const loadPresets = useCallback(async () => {
    try {
      const response = await fetch("/api/effects/presets");
      if (!response.ok) {
        throw new Error("Failed to load presets");
      }

      const loadedPresets = await response.json();
      setPresets(loadedPresets);
    } catch (error) {
      console.error("Failed to load presets:", error);
      toast.error("Failed to load presets");
    }
  }, []);

  /**
   * Delete a preset
   */
  const handleDeletePreset = useCallback(async (presetId: string) => {
    try {
      const response = await fetch(`/api/effects/presets/${presetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete preset");
      }

      setPresets((prev) => prev.filter((p) => p.id !== presetId));
      toast.success("Preset deleted");
    } catch (error) {
      console.error("Failed to delete preset:", error);
      toast.error("Failed to delete preset");
    }
  }, []);

  /**
   * Toggle favorite status
   */
  const handleToggleFavorite = useCallback(async (presetId: string) => {
    setPresets((prev) =>
      prev.map((p) =>
        p.id === presetId ? { ...p, isFavorite: !p.isFavorite } : p
      )
    );

    // Update on server
    try {
      await fetch(`/api/effects/presets/${presetId}/favorite`, {
        method: "PATCH",
      });
    } catch (error) {
      console.error("Failed to update favorite status:", error);
    }
  }, []);

  /**
   * Export preset as JSON file
   */
  const handleExportPreset = useCallback((preset: EffectPreset) => {
    const dataStr = JSON.stringify(preset, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${preset.name.replace(/\s+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Preset exported");
  }, []);

  /**
   * Import preset from JSON file
   */
  const handleImportPreset = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const preset = JSON.parse(e.target?.result as string) as EffectPreset;
        
        // Validate preset structure
        if (!preset.name || !preset.visualEffects) {
          throw new Error("Invalid preset file");
        }

        // Save imported preset
        const response = await fetch("/api/effects/presets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(preset),
        });

        if (!response.ok) {
          throw new Error("Failed to import preset");
        }

        const savedPreset = await response.json();
        setPresets((prev) => [savedPreset, ...prev]);
        toast.success(`Preset "${preset.name}" imported successfully`);
      } catch (error) {
        console.error("Failed to import preset:", error);
        toast.error("Failed to import preset. Please check the file format.");
      }
    };
    reader.readAsText(file);
  }, []);

  // Load presets on mount
  React.useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Filter presets
  const filteredPresets = filterFavorites
    ? presets.filter((p) => p.isFavorite)
    : presets;

  return (
    <div className="space-y-4">
      {/* Save New Preset Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Save Current Effects
        </h3>

        <div className="space-y-2">
          <Input
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            className="h-8 text-xs"
          />
          <Input
            placeholder="Description (optional)"
            value={presetDescription}
            onChange={(e) => setPresetDescription(e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            variant="default"
            size="sm"
            onClick={handleSavePreset}
            disabled={isSaving || !presetName.trim()}
            className="w-full h-8 text-xs"
          >
            <Save className="h-3 w-3 mr-2" />
            {isSaving ? "Saving..." : "Save as Preset"}
          </Button>
        </div>

        {/* Effect Summary */}
        <div className="text-[10px] text-muted-foreground space-y-0.5">
          <p>• {currentVisualEffects.length} visual effect(s)</p>
          {currentColorCorrection && <p>• Color correction</p>}
          {currentAudioEffects && currentAudioEffects.length > 0 && (
            <p>• {currentAudioEffects.length} audio effect(s)</p>
          )}
          {currentBlendMode && currentBlendMode !== "normal" && (
            <p>• Blend mode: {currentBlendMode}</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Import/Export Section */}
      <div className="flex gap-2">
        <input
          type="file"
          accept=".json"
          onChange={handleImportPreset}
          className="hidden"
          id="import-preset"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById("import-preset")?.click()}
          className="flex-1 h-7 text-xs"
        >
          <Upload className="h-3 w-3 mr-1" />
          Import
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterFavorites(!filterFavorites)}
          className="h-7 px-2"
        >
          {filterFavorites ? (
            <Star className="h-3 w-3 fill-current" />
          ) : (
            <StarOff className="h-3 w-3" />
          )}
        </Button>
      </div>

      <Separator />

      {/* Presets Library */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Presets Library ({filteredPresets.length})
        </h3>

        {filteredPresets.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Save className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{filterFavorites ? "No favorite presets" : "No presets saved yet"}</p>
            <p className="text-xs mt-1">
              {filterFavorites
                ? "Mark presets as favorites to see them here"
                : "Save your first preset to get started"}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-4">
              {filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-md bg-muted/30 border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{preset.name}</h4>
                      {preset.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {preset.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorite(preset.id)}
                      className="h-6 w-6 p-0 ml-2"
                    >
                      {preset.isFavorite ? (
                        <Star className="h-3 w-3 fill-current text-yellow-500" />
                      ) : (
                        <StarOff className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  {/* Preset Details */}
                  <div className="text-[10px] text-muted-foreground space-y-0.5 mb-2">
                    <p>• {preset.visualEffects.length} visual effect(s)</p>
                    {preset.colorCorrection && <p>• Color correction</p>}
                    {preset.audioEffects && preset.audioEffects.length > 0 && (
                      <p>• {preset.audioEffects.length} audio effect(s)</p>
                    )}
                    {preset.blendMode && preset.blendMode !== "normal" && (
                      <p>• Blend mode: {preset.blendMode}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onApplyPreset(preset)}
                      disabled={!selectedScrubberId}
                      className="flex-1 h-6 text-xs"
                    >
                      Apply
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPreset(preset)}
                      className="h-6 px-2"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePreset(preset.id)}
                      className="h-6 px-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Info Section */}
      <div className="rounded-md bg-muted/30 border border-border p-3">
        <h4 className="text-xs font-semibold mb-2">About Presets</h4>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Presets save your entire effect stack including visual effects, color correction,
          audio effects, and blend modes. Use them to quickly apply consistent looks across
          multiple clips or projects.
        </p>
      </div>
    </div>
  );
}