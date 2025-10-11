import React, { useState, useEffect } from "react";
import {
  Settings,
  Info,
  Key,
  Save,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Separator } from "~/components/ui/separator";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { AI_MODELS } from "~/lib/ai-models";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StudioInfo {
  videoName: string;
  developedBy: string;
  version: string;
  description: string;
  website: string;
  email: string;
}

interface AIApiKeys {
  gemini: string;
  openrouter: string;
  freepik: string;
  replicate: string;
  runwayml: string;
  rapidapi: string;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState("studio");
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});
  
  const [studioInfo, setStudioInfo] = useState<StudioInfo>({
    videoName: "Kylo Video Editor",
    developedBy: "Kylo Team",
    version: "1.0.0",
    description: "Professional video editing software with AI capabilities",
    website: "https://Kylo.video",
    email: "info@Kylo.video",
  });

  const [apiKeys, setApiKeys] = useState<AIApiKeys>({
    gemini: "",
    openrouter: "",
    freepik: "",
    replicate: "",
    runwayml: "",
    rapidapi: "",
  });

  // Load settings from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const savedStudioInfo = localStorage.getItem("studioInfo");
    const savedApiKeys = localStorage.getItem("aiApiKeys");

    if (savedStudioInfo) {
      try {
        setStudioInfo(JSON.parse(savedStudioInfo));
      } catch (e) {
        console.error("Failed to load studio info:", e);
      }
    }

    if (savedApiKeys) {
      try {
        setApiKeys(JSON.parse(savedApiKeys));
      } catch (e) {
        console.error("Failed to load API keys:", e);
      }
    }
  }, []);

  const handleSaveStudioInfo = () => {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.setItem("studioInfo", JSON.stringify(studioInfo));
      toast.success("Studio information saved successfully");
    } catch (e) {
      console.error("Failed to save studio info:", e);
      toast.error("Failed to save studio information");
    }
  };

  const handleSaveApiKeys = () => {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.setItem("aiApiKeys", JSON.stringify(apiKeys));
      toast.success("AI API keys saved successfully");
    } catch (e) {
      console.error("Failed to save API keys:", e);
      toast.error("Failed to save API keys");
    }
  };

  const toggleShowApiKey = (key: string) => {
    setShowApiKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-background border border-border rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-12 bg-muted/20">
              <TabsTrigger value="studio" className="gap-2">
                <Info className="h-4 w-4" />
                Studio Info
              </TabsTrigger>
              <TabsTrigger value="ai-keys" className="gap-2">
                <Key className="h-4 w-4" />
                AI Categories
              </TabsTrigger>
            </TabsList>

            {/* Studio Info Tab */}
            <TabsContent value="studio" className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="videoName">Video Editor Name</Label>
                  <Input
                    id="videoName"
                    value={studioInfo.videoName}
                    onChange={(e) =>
                      setStudioInfo({ ...studioInfo, videoName: e.target.value })
                    }
                    placeholder="Enter video editor name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="developedBy">Developed By</Label>
                  <Input
                    id="developedBy"
                    value={studioInfo.developedBy}
                    onChange={(e) =>
                      setStudioInfo({ ...studioInfo, developedBy: e.target.value })
                    }
                    placeholder="Enter developer name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={studioInfo.version}
                    onChange={(e) =>
                      setStudioInfo({ ...studioInfo, version: e.target.value })
                    }
                    placeholder="e.g., 1.0.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={studioInfo.description}
                    onChange={(e) =>
                      setStudioInfo({ ...studioInfo, description: e.target.value })
                    }
                    placeholder="Brief description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={studioInfo.website}
                    onChange={(e) =>
                      setStudioInfo({ ...studioInfo, website: e.target.value })
                    }
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={studioInfo.email}
                    onChange={(e) =>
                      setStudioInfo({ ...studioInfo, email: e.target.value })
                    }
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveStudioInfo} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Studio Info
                </Button>
              </div>
            </TabsContent>

            {/* AI Categories Tab */}
            <TabsContent value="ai-keys" className="p-6 space-y-6">
              <div className="space-y-6">
                {/* Gemini */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="gemini" className="text-base font-semibold">
                      Google Gemini
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {AI_MODELS.gemini.length} models
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="gemini"
                      type={showApiKeys.gemini ? "text" : "password"}
                      value={apiKeys.gemini}
                      onChange={(e) =>
                        setApiKeys({ ...apiKeys, gemini: e.target.value })
                      }
                      placeholder="Enter Gemini API key"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey("gemini")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showApiKeys.gemini ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {AI_MODELS.gemini.map((model) => (
                      <span
                        key={model}
                        className="text-xs px-2 py-1 bg-muted rounded-md">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* OpenRouter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="openrouter" className="text-base font-semibold">
                      OpenRouter
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {AI_MODELS.openrouter.length} models
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="openrouter"
                      type={showApiKeys.openrouter ? "text" : "password"}
                      value={apiKeys.openrouter}
                      onChange={(e) =>
                        setApiKeys({ ...apiKeys, openrouter: e.target.value })
                      }
                      placeholder="Enter OpenRouter API key"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey("openrouter")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showApiKeys.openrouter ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {AI_MODELS.openrouter.map((model) => (
                      <span
                        key={model}
                        className="text-xs px-2 py-1 bg-muted rounded-md">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Freepik */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="freepik" className="text-base font-semibold">
                      Freepik
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {AI_MODELS.freepik.length} models
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="freepik"
                      type={showApiKeys.freepik ? "text" : "password"}
                      value={apiKeys.freepik}
                      onChange={(e) =>
                        setApiKeys({ ...apiKeys, freepik: e.target.value })
                      }
                      placeholder="Enter Freepik API key"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey("freepik")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showApiKeys.freepik ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {AI_MODELS.freepik.map((model) => (
                      <span
                        key={model}
                        className="text-xs px-2 py-1 bg-muted rounded-md">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Replicate */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="replicate" className="text-base font-semibold">
                      Replicate
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {AI_MODELS.replicate.length} models
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="replicate"
                      type={showApiKeys.replicate ? "text" : "password"}
                      value={apiKeys.replicate}
                      onChange={(e) =>
                        setApiKeys({ ...apiKeys, replicate: e.target.value })
                      }
                      placeholder="Enter Replicate API key"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey("replicate")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showApiKeys.replicate ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {AI_MODELS.replicate.map((model) => (
                      <span
                        key={model}
                        className="text-xs px-2 py-1 bg-muted rounded-md">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* RunwayML */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="runwayml" className="text-base font-semibold">
                      RunwayML
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {AI_MODELS.runwayml.length} models
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="runwayml"
                      type={showApiKeys.runwayml ? "text" : "password"}
                      value={apiKeys.runwayml}
                      onChange={(e) =>
                        setApiKeys({ ...apiKeys, runwayml: e.target.value })
                      }
                      placeholder="Enter RunwayML API key"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey("runwayml")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showApiKeys.runwayml ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {AI_MODELS.runwayml.map((model) => (
                      <span
                        key={model}
                        className="text-xs px-2 py-1 bg-muted rounded-md">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* RapidAPI */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rapidapi" className="text-base font-semibold">
                      RapidAPI
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {AI_MODELS.rapidapi.length} models
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="rapidapi"
                      type={showApiKeys.rapidapi ? "text" : "password"}
                      value={apiKeys.rapidapi}
                      onChange={(e) =>
                        setApiKeys({ ...apiKeys, rapidapi: e.target.value })
                      }
                      placeholder="Enter RapidAPI key"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey("rapidapi")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showApiKeys.rapidapi ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {AI_MODELS.rapidapi.map((model) => (
                      <span
                        key={model}
                        className="text-xs px-2 py-1 bg-muted rounded-md">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveApiKeys} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save API Keys
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}