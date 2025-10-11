import { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useMasks } from "~/hooks/useMasks";
import type { Mask, MaskType } from "./advanced-types";
import { Square, Circle, Pentagon, PenTool as Bezier, Plus, Trash2 } from "lucide-react";

interface MaskPanelProps {
  projectId: string;
  scrubberId: string;
}

export function MaskPanel({ projectId, scrubberId }: MaskPanelProps) {
  const { masks, loading, createMask, updateMask, deleteMask } = useMasks(projectId, scrubberId);
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);

  const selectedMask = masks.find(m => m.id === selectedMaskId);

  const handleCreateMask = async (type: MaskType) => {
    const newMask: Omit<Mask, 'id'> = {
      type,
      enabled: true,
      inverted: false,
      feather: 0,
      opacity: 100,
      expansion: 0,
      shape: type === 'rectangle' || type === 'ellipse' ? {
        x: 50,
        y: 50,
        width: 200,
        height: 200,
        rotation: 0
      } : undefined,
      points: type === 'polygon' || type === 'bezier' ? [] : undefined
    };

    const created = await createMask(newMask);
    setSelectedMaskId(created.id);
  };

  const handleUpdateMask = async (updates: Partial<Mask>) => {
    if (!selectedMaskId) return;
    await updateMask(selectedMaskId, updates);
  };

  const handleDeleteMask = async () => {
    if (!selectedMaskId) return;
    await deleteMask(selectedMaskId);
    setSelectedMaskId(null);
  };

  return (
    <div className="p-4 space-y-4 bg-gray-900 text-white rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Masks</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCreateMask('rectangle')}
            title="Rectangle Mask"
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCreateMask('ellipse')}
            title="Ellipse Mask"
          >
            <Circle className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCreateMask('polygon')}
            title="Polygon Mask"
          >
            <Pentagon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCreateMask('bezier')}
            title="Bezier Mask"
          >
            <Bezier className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-400">Loading masks...</div>}

      {masks.length === 0 && !loading && (
        <div className="text-sm text-gray-400 text-center py-8">
          No masks yet. Click a button above to create one.
        </div>
      )}

      {masks.length > 0 && (
        <div className="space-y-2">
          <Label>Select Mask</Label>
          <Select value={selectedMaskId || ""} onValueChange={setSelectedMaskId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a mask" />
            </SelectTrigger>
            <SelectContent>
              {masks.map((mask) => (
                <SelectItem key={mask.id} value={mask.id}>
                  {mask.type.charAt(0).toUpperCase() + mask.type.slice(1)} Mask
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedMask && (
        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="shape">Shape</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enabled</Label>
              <Switch
                checked={selectedMask.enabled}
                onCheckedChange={(enabled) => handleUpdateMask({ enabled })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Inverted</Label>
              <Switch
                checked={selectedMask.inverted}
                onCheckedChange={(inverted) => handleUpdateMask({ inverted })}
              />
            </div>

            <div className="space-y-2">
              <Label>Feather: {selectedMask.feather}px</Label>
              <Slider
                value={[selectedMask.feather]}
                onValueChange={(value: number[]) => handleUpdateMask({ feather: value[0] })}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Opacity: {selectedMask.opacity}%</Label>
              <Slider
                value={[selectedMask.opacity]}
                onValueChange={(value: number[]) => handleUpdateMask({ opacity: value[0] })}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Expansion: {selectedMask.expansion}px</Label>
              <Slider
                value={[selectedMask.expansion]}
                onValueChange={(value: number[]) => handleUpdateMask({ expansion: value[0] })}
                min={-50}
                max={50}
                step={1}
              />
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteMask}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Mask
            </Button>
          </TabsContent>

          <TabsContent value="shape" className="space-y-4">
            {selectedMask.shape && (
              <>
                <div className="space-y-2">
                  <Label>X Position: {selectedMask.shape.x}px</Label>
                  <Slider
                    value={[selectedMask.shape.x]}
                    onValueChange={(value: number[]) => handleUpdateMask({
                      shape: { ...selectedMask.shape!, x: value[0] }
                    })}
                    min={0}
                    max={1920}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Y Position: {selectedMask.shape.y}px</Label>
                  <Slider
                    value={[selectedMask.shape.y]}
                    onValueChange={(value: number[]) => handleUpdateMask({
                      shape: { ...selectedMask.shape!, y: value[0] }
                    })}
                    min={0}
                    max={1080}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Width: {selectedMask.shape.width}px</Label>
                  <Slider
                    value={[selectedMask.shape.width]}
                    onValueChange={(value: number[]) => handleUpdateMask({
                      shape: { ...selectedMask.shape!, width: value[0] }
                    })}
                    min={10}
                    max={1920}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Height: {selectedMask.shape.height}px</Label>
                  <Slider
                    value={[selectedMask.shape.height]}
                    onValueChange={(value: number[]) => handleUpdateMask({
                      shape: { ...selectedMask.shape!, height: value[0] }
                    })}
                    min={10}
                    max={1080}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rotation: {selectedMask.shape.rotation}°</Label>
                  <Slider
                    value={[selectedMask.shape.rotation]}
                    onValueChange={(value: number[]) => handleUpdateMask({
                      shape: { ...selectedMask.shape!, rotation: value[0] }
                    })}
                    min={0}
                    max={360}
                    step={1}
                  />
                </div>
              </>
            )}

            {(selectedMask.type === 'polygon' || selectedMask.type === 'bezier') && (
              <div className="text-sm text-gray-400">
                Use the canvas to draw points for this mask type.
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}