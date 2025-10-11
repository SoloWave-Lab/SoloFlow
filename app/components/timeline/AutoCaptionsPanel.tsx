import { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { useAutoCaptions } from "~/hooks/useAI";
import type { AutoCaptionSettings } from "./advanced-types";
import { Subtitles, Download, Edit, Play } from "lucide-react";

interface AutoCaptionsPanelProps {
  assetId: string;
  projectId: string;
}

export function AutoCaptionsPanel({ assetId, projectId }: AutoCaptionsPanelProps) {
  const { captions, loading, generateCaptions, editCaption, exportCaptions } = useAutoCaptions(assetId);
  const [settings, setSettings] = useState<AutoCaptionSettings>({
    enabled: true,
    language: 'en',
    model: 'whisper',
    maxLineLength: 42,
    maxLinesPerCaption: 2,
    style: {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#FFFFFF',
      backgroundColor: '#000000',
      position: 'bottom',
      alignment: 'center'
    }
  });

  const handleGenerate = async () => {
    try {
      await generateCaptions(settings);
    } catch (error) {
      console.error('Failed to generate captions:', error);
    }
  };

  const handleExport = async (format: string) => {
    if (captions.length === 0) return;
    
    try {
      const blob = await exportCaptions(captions[0].id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `captions.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export captions:', error);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-gray-900 text-white rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Subtitles className="w-5 h-5" />
          Auto Captions
        </h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Language</Label>
          <Select
            value={settings.language}
            onValueChange={(language) => setSettings({ ...settings, language })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="it">Italian</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="ko">Korean</SelectItem>
              <SelectItem value="zh">Chinese</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          <Select
            value={settings.model}
            onValueChange={(model: any) => setSettings({ ...settings, model })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whisper">Whisper (OpenAI)</SelectItem>
              <SelectItem value="google">Google Speech-to-Text</SelectItem>
              <SelectItem value="azure">Azure Speech</SelectItem>
              <SelectItem value="aws">AWS Transcribe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-semibold mb-3">Caption Style</h4>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Font Family</Label>
              <Input
                value={settings.style.fontFamily}
                onChange={(e) => setSettings({
                  ...settings,
                  style: { ...settings.style, fontFamily: e.target.value }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Font Size</Label>
              <Input
                type="number"
                value={settings.style.fontSize}
                onChange={(e) => setSettings({
                  ...settings,
                  style: { ...settings.style, fontSize: parseInt(e.target.value) }
                })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Text Color</Label>
                <Input
                  type="color"
                  value={settings.style.color}
                  onChange={(e) => setSettings({
                    ...settings,
                    style: { ...settings.style, color: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Background</Label>
                <Input
                  type="color"
                  value={settings.style.backgroundColor}
                  onChange={(e) => setSettings({
                    ...settings,
                    style: { ...settings.style, backgroundColor: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Position</Label>
              <Select
                value={settings.style.position}
                onValueChange={(position: any) => setSettings({
                  ...settings,
                  style: { ...settings.style, position }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={loading} className="w-full">
          <Play className="w-4 h-4 mr-2" />
          {loading ? 'Generating...' : 'Generate Captions'}
        </Button>

        {captions.length > 0 && (
          <div className="border-t border-gray-700 pt-4 space-y-2">
            <Label>Export Captions</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport('srt')}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                SRT
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport('vtt')}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                VTT
              </Button>
            </div>

            <div className="mt-4">
              <Label className="text-xs mb-2">Generated Captions</Label>
              <div className="max-h-48 overflow-y-auto space-y-2 text-xs">
                {captions[0]?.captions?.map((caption: any, idx: number) => (
                  <div key={idx} className="p-2 bg-gray-800 rounded">
                    <div className="text-gray-400">
                      {caption.startTime.toFixed(2)}s - {caption.endTime.toFixed(2)}s
                    </div>
                    <div>{caption.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}