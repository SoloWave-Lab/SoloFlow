import { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Switch } from "../ui/switch";
import {
  useAutoColorCorrection,
  useSceneDetection,
  useBackgroundRemoval,
  useSmartCrop
} from "~/hooks/useAI";
import { Wand2, Scissors, Eraser, Crop, Sparkles } from "lucide-react";

interface AIFeaturesPanelProps {
  projectId: string;
  scrubberId?: string;
  assetId?: string;
}

export function AIFeaturesPanel({ projectId, scrubberId, assetId }: AIFeaturesPanelProps) {
  const [activeTab, setActiveTab] = useState("color");

  return (
    <div className="p-4 space-y-4 bg-gray-900 text-white rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Features
        </h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="color">
            <Wand2 className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="scene">
            <Scissors className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="background">
            <Eraser className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="crop">
            <Crop className="w-4 h-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="color" className="space-y-4">
          {scrubberId ? (
            <AutoColorCorrectionTab projectId={projectId} scrubberId={scrubberId} />
          ) : (
            <div className="text-sm text-gray-400 text-center py-8">
              Select a clip to use auto color correction
            </div>
          )}
        </TabsContent>

        <TabsContent value="scene" className="space-y-4">
          {assetId ? (
            <SceneDetectionTab projectId={projectId} assetId={assetId} />
          ) : (
            <div className="text-sm text-gray-400 text-center py-8">
              Select a clip to detect scenes
            </div>
          )}
        </TabsContent>

        <TabsContent value="background" className="space-y-4">
          {scrubberId ? (
            <BackgroundRemovalTab projectId={projectId} scrubberId={scrubberId} />
          ) : (
            <div className="text-sm text-gray-400 text-center py-8">
              Select a clip to remove background
            </div>
          )}
        </TabsContent>

        <TabsContent value="crop" className="space-y-4">
          {scrubberId ? (
            <SmartCropTab projectId={projectId} scrubberId={scrubberId} />
          ) : (
            <div className="text-sm text-gray-400 text-center py-8">
              Select a clip to use smart crop
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AutoColorCorrectionTab({ projectId, scrubberId }: { projectId: string; scrubberId: string }) {
  const { correction, loading, applyCorrection, updateCorrection } = useAutoColorCorrection(scrubberId);
  const [style, setStyle] = useState<string>('natural');
  const [intensity, setIntensity] = useState<number>(50);

  const handleApply = async () => {
    await applyCorrection({ enabled: true, style: style as any, intensity });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Auto Color Correction</h4>

      <div className="space-y-2">
        <Label>Style</Label>
        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="natural">Natural</SelectItem>
            <SelectItem value="cinematic">Cinematic</SelectItem>
            <SelectItem value="vibrant">Vibrant</SelectItem>
            <SelectItem value="vintage">Vintage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Intensity: {intensity}%</Label>
        <Slider
          value={[intensity]}
          onValueChange={([val]: number[]) => setIntensity(val)}
          min={0}
          max={100}
          step={1}
        />
      </div>

      <Button onClick={handleApply} disabled={loading} className="w-full">
        {loading ? 'Processing...' : 'Apply Auto Color'}
      </Button>

      {correction && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <Label className="text-xs">Enabled</Label>
          <Switch
            checked={correction.enabled}
            onCheckedChange={(enabled) => updateCorrection({ enabled })}
          />
        </div>
      )}
    </div>
  );
}

function SceneDetectionTab({ projectId, assetId }: { projectId: string; assetId: string }) {
  const { detection, loading, runDetection, applySceneSplits } = useSceneDetection(assetId);
  const [sensitivity, setSensitivity] = useState<number>(50);
  const [minDuration, setMinDuration] = useState<number>(2);

  const handleDetect = async () => {
    await runDetection({ enabled: true, sensitivity, minSceneDuration: minDuration });
  };

  const handleApply = async () => {
    if (detection?.id) {
      await applySceneSplits(detection.id);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Scene Detection</h4>

      <div className="space-y-2">
        <Label>Sensitivity: {sensitivity}%</Label>
        <Slider
          value={[sensitivity]}
          onValueChange={([val]: number[]) => setSensitivity(val)}
          min={0}
          max={100}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <Label>Min Scene Duration: {minDuration}s</Label>
        <Slider
          value={[minDuration]}
          onValueChange={([val]: number[]) => setMinDuration(val)}
          min={0.5}
          max={10}
          step={0.5}
        />
      </div>

      <Button onClick={handleDetect} disabled={loading} className="w-full">
        {loading ? 'Detecting...' : 'Detect Scenes'}
      </Button>

      {detection?.scenes && detection.scenes.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Detected {detection.scenes.length} scenes</Label>
          <Button onClick={handleApply} variant="outline" className="w-full">
            Apply Scene Splits
          </Button>
        </div>
      )}
    </div>
  );
}

function BackgroundRemovalTab({ projectId, scrubberId }: { projectId: string; scrubberId: string }) {
  const { removal, loading, applyRemoval, updateRemoval } = useBackgroundRemoval(scrubberId);
  const [model, setModel] = useState<string>('u2net');
  const [quality, setQuality] = useState<string>('medium');
  const [edgeRefinement, setEdgeRefinement] = useState<boolean>(true);

  const handleApply = async () => {
    await applyRemoval({
      enabled: true,
      model: model as any,
      quality: quality as any,
      edgeRefinement
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Background Removal</h4>

      <div className="space-y-2">
        <Label>Model</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="u2net">U2Net (Fast)</SelectItem>
            <SelectItem value="modnet">ModNet (Balanced)</SelectItem>
            <SelectItem value="backgroundmattingv2">BackgroundMattingV2 (Best)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Quality</Label>
        <Select value={quality} onValueChange={setQuality}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label>Edge Refinement</Label>
        <Switch checked={edgeRefinement} onCheckedChange={setEdgeRefinement} />
      </div>

      <Button onClick={handleApply} disabled={loading} className="w-full">
        {loading ? 'Processing...' : 'Remove Background'}
      </Button>

      {removal && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <Label className="text-xs">Enabled</Label>
          <Switch
            checked={removal.enabled}
            onCheckedChange={(enabled) => updateRemoval({ enabled })}
          />
        </div>
      )}
    </div>
  );
}

function SmartCropTab({ projectId, scrubberId }: { projectId: string; scrubberId: string }) {
  const { crop, loading, applyCrop, updateCrop } = useSmartCrop(scrubberId);
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');

  const handleApply = async () => {
    await applyCrop(aspectRatio);
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Smart Crop/Reframe</h4>

      <div className="space-y-2">
        <Label>Target Aspect Ratio</Label>
        <Select value={aspectRatio} onValueChange={setAspectRatio}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
            <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
            <SelectItem value="1:1">1:1 (Square)</SelectItem>
            <SelectItem value="4:3">4:3 (Standard)</SelectItem>
            <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleApply} disabled={loading} className="w-full">
        {loading ? 'Processing...' : 'Apply Smart Crop'}
      </Button>

      {crop && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <Label className="text-xs">Enabled</Label>
          <Switch
            checked={crop.enabled}
            onCheckedChange={(enabled) => updateCrop({ enabled })}
          />
        </div>
      )}
    </div>
  );
}