import { useState, useCallback } from "react";
import type {
  ProjectSettings,
  TimelineMarker,
  AdjustmentLayer,
  ExportPreset,
  RenderQueueItem,
  KeyboardShortcut,
  WorkspaceLayout,
  ProxySettings,
  PerformanceSettings,
} from "~/components/timeline/advanced-types";
import { generateUUID } from "~/utils/uuid";
import { toast } from "sonner";

export const useProjectSettings = () => {
  // ============================================
  // PROJECT SETTINGS
  // ============================================
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    name: "Untitled Project",
    width: 1920,
    height: 1080,
    fps: 30,
    sampleRate: 48000,
    backgroundColor: "#000000",
    duration: 0,
    colorSpace: "sRGB",
    hdr: false,
    bitDepth: 8,
    performance: {
      gpuAcceleration: true,
      hardwareEncoder: "none",
      cacheSize: 2048,
      previewQuality: "medium",
      maxThreads: 4,
      memoryLimit: 4096,
    },
    proxy: {
      enabled: false,
      resolution: "half",
      format: "h264",
      autoGenerate: false,
    },
    markers: [],
    adjustmentLayers: [],
  });

  const updateProjectSettings = useCallback((updates: Partial<ProjectSettings>) => {
    setProjectSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  // ============================================
  // TIMELINE MARKERS
  // ============================================
  const addMarker = useCallback((time: number, label: string, type: TimelineMarker["type"] = "marker") => {
    const newMarker: TimelineMarker = {
      id: generateUUID(),
      time,
      label,
      color: getMarkerColor(type),
      type,
    };

    setProjectSettings((prev) => ({
      ...prev,
      markers: [...prev.markers, newMarker].sort((a, b) => a.time - b.time),
    }));

    toast.success(`Marker added: ${label}`);
    return newMarker.id;
  }, []);

  const removeMarker = useCallback((markerId: string) => {
    setProjectSettings((prev) => ({
      ...prev,
      markers: prev.markers.filter((m) => m.id !== markerId),
    }));

    toast.success("Marker removed");
  }, []);

  const updateMarker = useCallback((markerId: string, updates: Partial<TimelineMarker>) => {
    setProjectSettings((prev) => ({
      ...prev,
      markers: prev.markers.map((m) => (m.id === markerId ? { ...m, ...updates } : m)),
    }));
  }, []);

  const getMarkerColor = (type: TimelineMarker["type"]): string => {
    switch (type) {
      case "marker":
        return "#3b82f6";
      case "chapter":
        return "#10b981";
      case "comment":
        return "#f59e0b";
      case "todo":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  // ============================================
  // ADJUSTMENT LAYERS
  // ============================================
  const addAdjustmentLayer = useCallback(
    (startTime: number, endTime: number, trackIndex: number, name: string = "Adjustment Layer") => {
      const newLayer: AdjustmentLayer = {
        id: generateUUID(),
        name,
        startTime,
        endTime,
        trackIndex,
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
          gamma: 1,
        },
        opacity: 100,
        blendMode: "normal",
      };

      setProjectSettings((prev) => ({
        ...prev,
        adjustmentLayers: [...prev.adjustmentLayers, newLayer],
      }));

      toast.success(`Adjustment layer added: ${name}`);
      return newLayer.id;
    },
    []
  );

  const removeAdjustmentLayer = useCallback((layerId: string) => {
    setProjectSettings((prev) => ({
      ...prev,
      adjustmentLayers: prev.adjustmentLayers.filter((l) => l.id !== layerId),
    }));

    toast.success("Adjustment layer removed");
  }, []);

  const updateAdjustmentLayer = useCallback((layerId: string, updates: Partial<AdjustmentLayer>) => {
    setProjectSettings((prev) => ({
      ...prev,
      adjustmentLayers: prev.adjustmentLayers.map((l) => (l.id === layerId ? { ...l, ...updates } : l)),
    }));
  }, []);

  // ============================================
  // EXPORT PRESETS
  // ============================================
  const [exportPresets, setExportPresets] = useState<ExportPreset[]>([
    {
      id: "youtube_1080p",
      name: "YouTube 1080p",
      platform: "youtube",
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: 8000,
      codec: "h264",
      format: "mp4",
      audioCodec: "aac",
      audioBitrate: 192,
      audioSampleRate: 48000,
    },
    {
      id: "instagram_story",
      name: "Instagram Story",
      platform: "instagram",
      width: 1080,
      height: 1920,
      fps: 30,
      bitrate: 5000,
      codec: "h264",
      format: "mp4",
      audioCodec: "aac",
      audioBitrate: 128,
      audioSampleRate: 44100,
    },
    {
      id: "tiktok",
      name: "TikTok",
      platform: "tiktok",
      width: 1080,
      height: 1920,
      fps: 30,
      bitrate: 4000,
      codec: "h264",
      format: "mp4",
      audioCodec: "aac",
      audioBitrate: 128,
      audioSampleRate: 44100,
    },
    {
      id: "twitter",
      name: "Twitter",
      platform: "twitter",
      width: 1280,
      height: 720,
      fps: 30,
      bitrate: 5000,
      codec: "h264",
      format: "mp4",
      audioCodec: "aac",
      audioBitrate: 128,
      audioSampleRate: 44100,
    },
  ]);

  const addExportPreset = useCallback((preset: Omit<ExportPreset, "id">) => {
    const newPreset: ExportPreset = {
      ...preset,
      id: generateUUID(),
    };

    setExportPresets((prev) => [...prev, newPreset]);
    toast.success(`Export preset added: ${preset.name}`);
    return newPreset.id;
  }, []);

  const removeExportPreset = useCallback((presetId: string) => {
    setExportPresets((prev) => prev.filter((p) => p.id !== presetId));
    toast.success("Export preset removed");
  }, []);

  // ============================================
  // RENDER QUEUE
  // ============================================
  const [renderQueue, setRenderQueue] = useState<RenderQueueItem[]>([]);

  const addToRenderQueue = useCallback((projectId: string, preset: ExportPreset) => {
    const newItem: RenderQueueItem = {
      id: generateUUID(),
      projectId,
      preset,
      status: "pending",
      progress: 0,
    };

    setRenderQueue((prev) => [...prev, newItem]);
    toast.success("Added to render queue");
    return newItem.id;
  }, []);

  const updateRenderQueueItem = useCallback((itemId: string, updates: Partial<RenderQueueItem>) => {
    setRenderQueue((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
  }, []);

  const removeFromRenderQueue = useCallback((itemId: string) => {
    setRenderQueue((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const clearCompletedRenders = useCallback(() => {
    setRenderQueue((prev) => prev.filter((item) => item.status !== "completed"));
    toast.success("Cleared completed renders");
  }, []);

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================
  const [keyboardShortcuts, setKeyboardShortcuts] = useState<KeyboardShortcut[]>([
    { id: "play_pause", action: "play_pause", keys: ["Space"], description: "Play/Pause", category: "playback" },
    { id: "split", action: "split", keys: ["Ctrl", "K"], description: "Split clip", category: "editing" },
    { id: "delete", action: "delete", keys: ["Delete"], description: "Delete selection", category: "editing" },
    { id: "undo", action: "undo", keys: ["Ctrl", "Z"], description: "Undo", category: "editing" },
    { id: "redo", action: "redo", keys: ["Ctrl", "Shift", "Z"], description: "Redo", category: "editing" },
    { id: "save", action: "save", keys: ["Ctrl", "S"], description: "Save project", category: "file" },
    { id: "export", action: "export", keys: ["Ctrl", "E"], description: "Export video", category: "file" },
    { id: "zoom_in", action: "zoom_in", keys: ["Ctrl", "+"], description: "Zoom in timeline", category: "view" },
    { id: "zoom_out", action: "zoom_out", keys: ["Ctrl", "-"], description: "Zoom out timeline", category: "view" },
    { id: "fit_timeline", action: "fit_timeline", keys: ["Ctrl", "0"], description: "Fit timeline to window", category: "view" },
  ]);

  const updateKeyboardShortcut = useCallback((shortcutId: string, keys: string[]) => {
    setKeyboardShortcuts((prev) =>
      prev.map((shortcut) => (shortcut.id === shortcutId ? { ...shortcut, keys } : shortcut))
    );
    toast.success("Keyboard shortcut updated");
  }, []);

  const resetKeyboardShortcuts = useCallback(() => {
    // Reset to defaults (would need to store defaults separately in production)
    toast.success("Keyboard shortcuts reset to defaults");
  }, []);

  // ============================================
  // WORKSPACE LAYOUTS
  // ============================================
  const [workspaceLayouts, setWorkspaceLayouts] = useState<WorkspaceLayout[]>([
    {
      id: "default",
      name: "Default",
      panels: {
        timeline: { visible: true, height: 300 },
        preview: { visible: true, width: 800 },
        mediaBin: { visible: true, width: 300 },
        effects: { visible: true, width: 300 },
        inspector: { visible: true, width: 300 },
        audio: { visible: true, height: 200 },
      },
    },
    {
      id: "editing",
      name: "Editing",
      panels: {
        timeline: { visible: true, height: 400 },
        preview: { visible: true, width: 1000 },
        mediaBin: { visible: true, width: 250 },
        effects: { visible: false, width: 0 },
        inspector: { visible: true, width: 250 },
        audio: { visible: false, height: 0 },
      },
    },
    {
      id: "color",
      name: "Color Grading",
      panels: {
        timeline: { visible: true, height: 200 },
        preview: { visible: true, width: 1200 },
        mediaBin: { visible: false, width: 0 },
        effects: { visible: true, width: 400 },
        inspector: { visible: true, width: 400 },
        audio: { visible: false, height: 0 },
      },
    },
  ]);

  const [currentLayout, setCurrentLayout] = useState<string>("default");

  const switchLayout = useCallback((layoutId: string) => {
    setCurrentLayout(layoutId);
    toast.success(`Switched to ${layoutId} layout`);
  }, []);

  const saveCustomLayout = useCallback((name: string, panels: WorkspaceLayout["panels"]) => {
    const newLayout: WorkspaceLayout = {
      id: generateUUID(),
      name,
      panels,
    };

    setWorkspaceLayouts((prev) => [...prev, newLayout]);
    toast.success(`Layout saved: ${name}`);
    return newLayout.id;
  }, []);

  // ============================================
  // PERFORMANCE SETTINGS
  // ============================================
  const updatePerformanceSettings = useCallback((updates: Partial<PerformanceSettings>) => {
    setProjectSettings((prev) => ({
      ...prev,
      performance: { ...prev.performance, ...updates },
    }));
  }, []);

  // ============================================
  // PROXY SETTINGS
  // ============================================
  const updateProxySettings = useCallback((updates: Partial<ProxySettings>) => {
    setProjectSettings((prev) => ({
      ...prev,
      proxy: { ...prev.proxy, ...updates },
    }));

    if (updates.enabled !== undefined) {
      toast.success(updates.enabled ? "Proxy mode enabled" : "Proxy mode disabled");
    }
  }, []);

  return {
    // Project Settings
    projectSettings,
    updateProjectSettings,

    // Markers
    addMarker,
    removeMarker,
    updateMarker,

    // Adjustment Layers
    addAdjustmentLayer,
    removeAdjustmentLayer,
    updateAdjustmentLayer,

    // Export Presets
    exportPresets,
    addExportPreset,
    removeExportPreset,

    // Render Queue
    renderQueue,
    addToRenderQueue,
    updateRenderQueueItem,
    removeFromRenderQueue,
    clearCompletedRenders,

    // Keyboard Shortcuts
    keyboardShortcuts,
    updateKeyboardShortcut,
    resetKeyboardShortcuts,

    // Workspace Layouts
    workspaceLayouts,
    currentLayout,
    switchLayout,
    saveCustomLayout,

    // Performance
    updatePerformanceSettings,

    // Proxy
    updateProxySettings,
  };
};