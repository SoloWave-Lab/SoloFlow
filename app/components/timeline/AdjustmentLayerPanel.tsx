import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAdjustmentLayers } from "~/hooks/useMasks";
import type { AdjustmentLayer, BlendMode } from "./advanced-types";
import { Plus, Trash2, Layers } from "lucide-react";

interface AdjustmentLayerPanelProps {
  projectId: string;
}

export function AdjustmentLayerPanel({ projectId }: AdjustmentLayerPanelProps) {
  const { layers, loading, createLayer, updateLayer, deleteLayer } = useAdjustmentLayers(projectId);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const handleCreateLayer = async () => {
    const newLayer: Omit<AdjustmentLayer, 'id'> = {
      name: `Adjustment Layer ${layers.length + 1}`,
      startTime: 0,
      endTime: 10,
      trackIndex: 0,
      opacity: 100,
      blendMode: 'normal',
      effects: [],
      colorCorrection: {
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
        gamma: 1.0
      }
    };

    const created = await createLayer(newLayer);
    setSelectedLayerId(created.id);
  };

  const handleUpdateLayer = async (updates: Partial<AdjustmentLayer>) => {
    if (!selectedLayerId) return;
    await updateLayer(selectedLayerId, updates);
  };

  const handleDeleteLayer = async () => {
    if (!selectedLayerId) return;
    await deleteLayer(selectedLayerId);
    setSelectedLayerId(null);
  };

  const blendModes: BlendMode[] = [
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color_dodge', 'color_burn', 'hard_light', 'soft_light',
    'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
  ];

  return (
    <div className="p-4 space-y-4 bg-gray-900 text-white rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Adjustment Layers
        </h3>
        <Button size="sm" onClick={handleCreateLayer}>
          <Plus className="w-4 h-4 mr-2" />
          Add Layer
        </Button>
      </div>

      {loading && <div className="text-sm text-gray-400">Loading layers...</div>}

      {layers.length === 0 && !loading && (
        <div className="text-sm text-gray-400 text-center py-8">
          No adjustment layers yet. Click "Add Layer" to create one.
        </div>
      )}

      {layers.length > 0 && (
        <div className="space-y-2">
          <Label>Select Layer</Label>
          <Select value={selectedLayerId || ""} onValueChange={setSelectedLayerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a layer" />
            </SelectTrigger>
            <SelectContent>
              {layers.map((layer) => (
                <SelectItem key={layer.id} value={layer.id}>
                  {layer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedLayer && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Layer Name</Label>
            <Input
              value={selectedLayer.name}
              onChange={(e) => handleUpdateLayer({ name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time (s)</Label>
              <Input
                type="number"
                value={selectedLayer.startTime}
                onChange={(e) => handleUpdateLayer({ startTime: parseFloat(e.target.value) })}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time (s)</Label>
              <Input
                type="number"
                value={selectedLayer.endTime}
                onChange={(e) => handleUpdateLayer({ endTime: parseFloat(e.target.value) })}
                step={0.1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Blend Mode</Label>
            <Select
              value={selectedLayer.blendMode}
              onValueChange={(blendMode: BlendMode) => handleUpdateLayer({ blendMode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {blendModes.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Opacity: {selectedLayer.opacity}%</Label>
            <Slider
              value={[selectedLayer.opacity]}
              onValueChange={([opacity]: number[]) => handleUpdateLayer({ opacity })}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-semibold mb-3">Color Correction</h4>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Brightness: {selectedLayer.colorCorrection.brightness}</Label>
                <Slider
                  value={[selectedLayer.colorCorrection.brightness]}
                  onValueChange={([brightness]: number[]) => handleUpdateLayer({
                    colorCorrection: { ...selectedLayer.colorCorrection, brightness }
                  })}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Contrast: {selectedLayer.colorCorrection.contrast}</Label>
                <Slider
                  value={[selectedLayer.colorCorrection.contrast]}
                  onValueChange={([contrast]: number[]) => handleUpdateLayer({
                    colorCorrection: { ...selectedLayer.colorCorrection, contrast }
                  })}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Saturation: {selectedLayer.colorCorrection.saturation}</Label>
                <Slider
                  value={[selectedLayer.colorCorrection.saturation]}
                  onValueChange={([saturation]: number[]) => handleUpdateLayer({
                    colorCorrection: { ...selectedLayer.colorCorrection, saturation }
                  })}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Exposure: {selectedLayer.colorCorrection.exposure.toFixed(2)}</Label>
                <Slider
                  value={[selectedLayer.colorCorrection.exposure]}
                  onValueChange={([exposure]: number[]) => handleUpdateLayer({
                    colorCorrection: { ...selectedLayer.colorCorrection, exposure }
                  })}
                  min={-2}
                  max={2}
                  step={0.1}
                />
              </div>
            </div>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteLayer}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Layer
          </Button>
        </div>
      )}
    </div>
  );
}