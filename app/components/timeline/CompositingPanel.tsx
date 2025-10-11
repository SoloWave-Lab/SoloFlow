import { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { useCompositing } from "~/hooks/useMasks";
import type { BlendMode } from "./advanced-types";
import { Layers, ArrowUp, ArrowDown } from "lucide-react";

interface CompositingPanelProps {
  projectId: string;
  layerIds: string[];
}

export function CompositingPanel({ projectId, layerIds }: CompositingPanelProps) {
  const { settings, loading, updateSettings } = useCompositing(projectId);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

  const handleReorderLayer = (layerId: string, direction: 'up' | 'down') => {
    if (!settings?.layerOrdering) return;

    const currentIndex = settings.layerOrdering.indexOf(layerId);
    if (currentIndex === -1) return;

    const newOrdering = [...settings.layerOrdering];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= newOrdering.length) return;

    [newOrdering[currentIndex], newOrdering[targetIndex]] = 
      [newOrdering[targetIndex], newOrdering[currentIndex]];

    updateSettings({ layerOrdering: newOrdering });
  };

  const handleToggleTrackMatte = (enabled: boolean) => {
    updateSettings({ trackMatteEnabled: enabled });
  };

  const handleSetMatteSource = (source: string) => {
    updateSettings({ trackMatteSource: source });
  };

  const handleSetMatteTarget = (target: string) => {
    updateSettings({ trackMatteTarget: target });
  };

  return (
    <div className="p-4 space-y-4 bg-gray-900 text-white rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Compositing
        </h3>
      </div>

      {loading && <div className="text-sm text-gray-400">Loading settings...</div>}

      <div className="space-y-4">
        <div>
          <Label className="mb-2">Layer Ordering</Label>
          <div className="space-y-2">
            {settings?.layerOrdering?.map((layerId: string, index: number) => (
              <div
                key={layerId}
                className={`flex items-center justify-between p-2 rounded ${
                  selectedLayer === layerId ? 'bg-blue-900' : 'bg-gray-800'
                }`}
                onClick={() => setSelectedLayer(layerId)}
              >
                <span className="text-sm">Layer {index + 1}</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReorderLayer(layerId, 'up');
                    }}
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReorderLayer(layerId, 'down');
                    }}
                    disabled={index === (settings?.layerOrdering?.length ?? 0) - 1}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <Label>Track Matte</Label>
            <Switch
              checked={settings?.trackMatteEnabled || false}
              onCheckedChange={handleToggleTrackMatte}
            />
          </div>

          {settings?.trackMatteEnabled && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Matte Source</Label>
                <Select
                  value={settings.trackMatteSource || ""}
                  onValueChange={handleSetMatteSource}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source layer" />
                  </SelectTrigger>
                  <SelectContent>
                    {layerIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Matte Target</Label>
                <Select
                  value={settings.trackMatteTarget || ""}
                  onValueChange={handleSetMatteTarget}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target layer" />
                  </SelectTrigger>
                  <SelectContent>
                    {layerIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-400 pt-2 border-t border-gray-700">
          <p>💡 Tip: Drag layers to reorder them. Higher layers appear on top.</p>
          <p className="mt-1">Track matte uses one layer's alpha channel to mask another.</p>
        </div>
      </div>
    </div>
  );
}