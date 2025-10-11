import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Switch } from "~/components/ui/switch";
import { 
  RotateCcw, 
  Sun, 
  Contrast, 
  Droplet, 
  Palette,
  Thermometer,
  Lightbulb,
  Moon,
  Sparkles
} from "lucide-react";
import type { ColorCorrection } from "~/components/timeline/advanced-types";

interface ColorCorrectionPanelProps {
  scrubberId: string | null;
  colorCorrection: ColorCorrection | null;
  onUpdate: (scrubberId: string, correction: Partial<ColorCorrection>) => void;
  onReset: (scrubberId: string) => void;
}

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

export function ColorCorrectionPanel({
  scrubberId,
  colorCorrection,
  onUpdate,
  onReset,
}: ColorCorrectionPanelProps) {
  const [localCorrection, setLocalCorrection] = useState<ColorCorrection>(
    colorCorrection || defaultColorCorrection
  );
  const [autoApply, setAutoApply] = useState(true);

  useEffect(() => {
    if (colorCorrection) {
      setLocalCorrection(colorCorrection);
    } else {
      setLocalCorrection(defaultColorCorrection);
    }
  }, [colorCorrection, scrubberId]);

  const handleChange = (property: keyof ColorCorrection, value: number) => {
    const updated = { ...localCorrection, [property]: value };
    setLocalCorrection(updated);
    
    if (autoApply && scrubberId) {
      onUpdate(scrubberId, { [property]: value });
    }
  };

  const handleApply = () => {
    if (scrubberId) {
      onUpdate(scrubberId, localCorrection);
    }
  };

  const handleReset = () => {
    if (scrubberId) {
      setLocalCorrection(defaultColorCorrection);
      onReset(scrubberId);
    }
  };

  if (!scrubberId) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Select a clip to adjust color</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="sticky top-0 bg-background z-10 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Color Correction
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-apply" className="text-xs">Auto Apply</Label>
              <Switch
                id="auto-apply"
                checked={autoApply}
                onCheckedChange={setAutoApply}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            {!autoApply && (
              <Button
                size="sm"
                onClick={handleApply}
              >
                Apply
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-4">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="creative">Creative</TabsTrigger>
          </TabsList>

          {/* BASIC TAB */}
          <TabsContent value="basic" className="space-y-6 mt-4">
            {/* Brightness */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Brightness
                </Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.brightness.toFixed(0)}
                </span>
              </div>
              <Slider
                value={[localCorrection.brightness]}
                onValueChange={([value]) => handleChange("brightness", value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Contrast className="w-4 h-4" />
                  Contrast
                </Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.contrast.toFixed(0)}
                </span>
              </div>
              <Slider
                value={[localCorrection.contrast]}
                onValueChange={([value]) => handleChange("contrast", value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Droplet className="w-4 h-4" />
                  Saturation
                </Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.saturation.toFixed(0)}
                </span>
              </div>
              <Slider
                value={[localCorrection.saturation]}
                onValueChange={([value]) => handleChange("saturation", value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Hue */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Hue
                </Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.hue.toFixed(0)}°
                </span>
              </div>
              <Slider
                value={[localCorrection.hue]}
                onValueChange={([value]) => handleChange("hue", value)}
                min={-180}
                max={180}
                step={1}
                className="w-full"
              />
            </div>

            {/* Exposure */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Exposure
                </Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.exposure.toFixed(2)} stops
                </span>
              </div>
              <Slider
                value={[localCorrection.exposure]}
                onValueChange={([value]) => handleChange("exposure", value)}
                min={-2}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>
          </TabsContent>

          {/* ADVANCED TAB */}
          <TabsContent value="advanced" className="space-y-6 mt-4">
            {/* Highlights */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Highlights
                </Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.highlights.toFixed(0)}
                </span>
              </div>
              <Slider
                value={[localCorrection.highlights]}
                onValueChange={([value]) => handleChange("highlights", value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Shadows */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Shadows
                </Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.shadows.toFixed(0)}
                </span>
              </div>
              <Slider
                value={[localCorrection.shadows]}
                onValueChange={([value]) => handleChange("shadows", value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Whites */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Whites</Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.whites.toFixed(0)}
                </span>
              </div>
              <Slider
                value={[localCorrection.whites]}
                onValueChange={([value]) => handleChange("whites", value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Blacks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Blacks</Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.blacks.toFixed(0)}
                </span>
              </div>
              <Slider
                value={[localCorrection.blacks]}
                onValueChange={([value]) => handleChange("blacks", value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Gamma */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Gamma</Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.gamma.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[localCorrection.gamma]}
                onValueChange={([value]) => handleChange("gamma", value)}
                min={0.1}
                max={3.0}
                step={0.1}
                className="w-full"
              />
            </div>
          </TabsContent>

          {/* CREATIVE TAB */}
          <TabsContent value="creative" className="space-y-6 mt-4">
            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4" />
                  Temperature
                </Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.temperature > 0 ? "Warm" : localCorrection.temperature < 0 ? "Cool" : "Neutral"} ({localCorrection.temperature.toFixed(0)})
                </span>
              </div>
              <Slider
                value={[localCorrection.temperature]}
                onValueChange={([value]) => handleChange("temperature", value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Tint */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tint</Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.tint > 0 ? "Magenta" : localCorrection.tint < 0 ? "Green" : "Neutral"} ({localCorrection.tint.toFixed(0)})
                </span>
              </div>
              <Slider
                value={[localCorrection.tint]}
                onValueChange={([value]) => handleChange("tint", value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Vibrance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Vibrance
                </Label>
                <span className="text-sm text-muted-foreground">
                  {localCorrection.vibrance.toFixed(0)}
                </span>
              </div>
              <Slider
                value={[localCorrection.vibrance]}
                onValueChange={([value]) => handleChange("vibrance", value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}