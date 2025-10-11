// Advanced feature types for video editing

// ============================================
// KEYFRAME ANIMATION SYSTEM
// ============================================
export interface Keyframe {
  id: string;
  time: number; // in seconds
  property: KeyframeProperty;
  value: number | string | { x: number; y: number } | { r: number; g: number; b: number; a: number };
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut" | "bezier";
  bezierPoints?: [number, number, number, number]; // For custom bezier curves
}

export type KeyframeProperty =
  | "opacity"
  | "rotation"
  | "scale"
  | "scaleX"
  | "scaleY"
  | "positionX"
  | "positionY"
  | "blur"
  | "brightness"
  | "contrast"
  | "saturation"
  | "hue"
  | "volume";

export interface KeyframeTrack {
  scrubberId: string;
  keyframes: Keyframe[];
}

// ============================================
// COLOR CORRECTION & GRADING
// ============================================
export interface ColorCorrection {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  hue: number; // -180 to 180
  temperature: number; // -100 to 100 (warm/cool)
  tint: number; // -100 to 100 (green/magenta)
  exposure: number; // -2 to 2 (stops)
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  whites: number; // -100 to 100
  blacks: number; // -100 to 100
  vibrance: number; // -100 to 100
  gamma: number; // 0.1 to 3.0
}

export interface LUT {
  id: string;
  name: string;
  url: string;
  format: string;
  size: number;
  intensity: number; // 0 to 100
  uploadDate?: string | Date;
  data?: any; // Parsed LUT data
  metadata?: {
    title?: string;
    description?: string;
    uploadedAt?: string;
    fileSize?: number;
  };
}

// ============================================
// VISUAL EFFECTS
// ============================================
export interface VisualEffect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: EffectParameters;
}

export type EffectType =
  | "blur"
  | "sharpen"
  | "vignette"
  | "chromaKey"
  | "colorKey"
  | "noise"
  | "grain"
  | "pixelate"
  | "mosaic"
  | "glitch"
  | "distortion"
  | "mirror"
  | "kaleidoscope"
  | "edgeDetect"
  | "emboss"
  | "posterize"
  | "threshold"
  | "invert"
  | "sepia"
  | "grayscale"
  | "duotone"
  | "tritone"
  | "colorOverlay"
  | "gradientOverlay"
  | "shadow"
  | "glow"
  | "stroke"
  | "bevel"
  | "lens_distortion"
  | "chromatic_aberration"
  | "chromaticAberration"
  | "bloom"
  | "lens_flare"
  | "light_rays"
  | "particles";

export interface EffectParameters {
  // Blur
  blurAmount?: number;
  blurType?: "gaussian" | "motion" | "radial" | "zoom";
  blurAngle?: number;

  // Chroma Key
  keyColor?: string;
  tolerance?: number;
  softness?: number;
  spillSuppression?: number;

  // Vignette
  vignetteAmount?: number;
  vignetteSize?: number;
  vignetteSoftness?: number;

  // Sharpen
  sharpenAmount?: number;

  // Noise/Grain
  noiseAmount?: number;
  noiseType?: "gaussian" | "uniform" | "salt_pepper";

  // Pixelate
  pixelSize?: number;

  // Distortion
  distortionAmount?: number;
  distortionType?: "barrel" | "pincushion" | "wave" | "ripple";

  // Generic parameters
  intensity?: number;
  mix?: number;
  [key: string]: any;
}

// ============================================
// AUDIO EFFECTS
// ============================================
export interface AudioEffect {
  id: string;
  type: AudioEffectType;
  enabled: boolean;
  parameters: AudioEffectParameters;
}

export type AudioEffectType =
  | "volume"
  | "fade_in"
  | "fade_out"
  | "normalize"
  | "compressor"
  | "limiter"
  | "equalizer"
  | "reverb"
  | "echo"
  | "delay"
  | "chorus"
  | "flanger"
  | "phaser"
  | "distortion"
  | "pitch_shift"
  | "time_stretch"
  | "noise_reduction"
  | "noise_gate"
  | "de_esser"
  | "auto_ducking";

export interface AudioEffectParameters {
  // Volume
  volume?: number; // 0 to 200 (percentage)
  
  // Fade
  fadeDuration?: number; // in seconds
  
  // Normalize
  targetLevel?: number; // in dB
  
  // Compressor
  threshold?: number; // in dB
  ratio?: number;
  attack?: number; // in ms
  release?: number; // in ms
  knee?: number;
  makeupGain?: number; // in dB
  
  // Limiter
  ceiling?: number; // in dB
  
  // Equalizer
  bands?: EqualizerBand[];
  
  // Reverb
  roomSize?: number;
  damping?: number;
  wetLevel?: number;
  dryLevel?: number;
  
  // Delay/Echo
  delayTime?: number; // in ms
  feedback?: number;
  
  // Noise Reduction
  noiseProfile?: number[];
  reductionAmount?: number;
  
  // Auto Ducking
  duckingAmount?: number; // in dB
  duckingThreshold?: number; // in dB
  duckingAttack?: number; // in ms
  duckingRelease?: number; // in ms
  
  [key: string]: any;
}

export interface EqualizerBand {
  frequency: number; // in Hz
  gain: number; // in dB
  q: number; // Quality factor
  type: "lowshelf" | "highshelf" | "peaking" | "lowpass" | "highpass" | "notch";
}

// ============================================
// MASKING & COMPOSITING
// ============================================
export interface Mask {
  id: string;
  type: MaskType;
  enabled: boolean;
  inverted: boolean;
  feather: number;
  opacity: number;
  expansion: number;
  points?: MaskPoint[]; // For bezier/polygon masks
  shape?: MaskShape; // For shape masks
}

export type MaskType = "rectangle" | "ellipse" | "polygon" | "bezier" | "text" | "image";

export interface MaskPoint {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}

export interface MaskShape {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color_dodge"
  | "color_burn"
  | "hard_light"
  | "soft_light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity"
  | "add"
  | "subtract";

export interface CompositingSettings {
  id?: string;
  blendMode: BlendMode;
  opacity: number;
  preserveTransparency: boolean;
  knockoutGroup: boolean;
  layerOrdering?: string[];
  trackMatteEnabled?: boolean;
  trackMatteSource?: string | null;
  trackMatteTarget?: string | null;
}

// ============================================
// MOTION TRACKING
// ============================================
export interface MotionTracker {
  id: string;
  name: string;
  trackPoints: TrackPoint[];
  startFrame: number;
  endFrame: number;
  confidence: number;
}

export interface TrackPoint {
  frame: number;
  x: number;
  y: number;
  confidence: number;
}

// ============================================
// STABILIZATION
// ============================================
export interface StabilizationSettings {
  enabled: boolean;
  smoothness: number; // 0 to 100
  method: "point" | "subspace" | "optical_flow";
  cropToFit: boolean;
  rollingShutterCorrection: boolean;
  maxAngle: number;
  maxShift: number;
}

// ============================================
// 3D TRANSFORMS
// ============================================
export interface Transform3D {
  rotationX: number; // in degrees
  rotationY: number;
  rotationZ: number;
  perspectiveDistance: number;
  anchorX: number; // 0 to 1
  anchorY: number;
  anchorZ: number;
}

// ============================================
// SPEED & TIME REMAPPING
// ============================================
export interface SpeedRemap {
  enabled: boolean;
  speed: number; // 0.1 to 10 (1 = normal speed)
  method: "frame_blend" | "optical_flow" | "nearest";
  maintainPitch: boolean; // For audio
  timeRemapCurve?: TimeRemapPoint[];
}

export interface TimeRemapPoint {
  inputTime: number; // in seconds
  outputTime: number; // in seconds
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut";
}

// ============================================
// MARKERS & ANNOTATIONS
// ============================================
export interface TimelineMarker {
  id: string;
  time: number; // in seconds
  label: string;
  color: string;
  type: "marker" | "chapter" | "comment" | "todo";
  notes?: string;
}

// ============================================
// EXPORT PRESETS
// ============================================
export interface ExportPreset {
  id: string;
  name: string;
  platform: "youtube" | "instagram" | "tiktok" | "twitter" | "facebook" | "custom";
  width: number;
  height: number;
  fps: number;
  bitrate: number; // in kbps
  codec: "h264" | "h265" | "vp9" | "av1" | "prores";
  format: "mp4" | "mov" | "webm" | "avi" | "mkv";
  audioCodec: "aac" | "mp3" | "opus" | "flac";
  audioBitrate: number; // in kbps
  audioSampleRate: number; // in Hz
}

// ============================================
// ADJUSTMENT LAYERS
// ============================================
export interface AdjustmentLayer {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  trackIndex: number;
  effects: VisualEffect[];
  colorCorrection: ColorCorrection;
  opacity: number;
  blendMode: BlendMode;
}

// ============================================
// PROXY SETTINGS
// ============================================
export interface ProxySettings {
  enabled: boolean;
  resolution: "quarter" | "half" | "full";
  format: "h264" | "prores_proxy";
  autoGenerate: boolean;
}

// ============================================
// PERFORMANCE SETTINGS
// ============================================
export interface PerformanceSettings {
  gpuAcceleration: boolean;
  hardwareEncoder: "none" | "nvenc" | "quicksync" | "videotoolbox" | "amf";
  cacheSize: number; // in MB
  previewQuality: "low" | "medium" | "high" | "full";
  maxThreads: number;
  memoryLimit: number; // in MB
}

// ============================================
// EXTENDED SCRUBBER WITH ADVANCED FEATURES
// ============================================
export interface AdvancedScrubberProperties {
  // Visual Effects
  effects?: VisualEffect[];
  
  // Color Correction
  colorCorrection?: ColorCorrection;
  lut?: LUT;
  
  // Audio Effects
  audioEffects?: AudioEffect[];
  
  // Masking
  masks?: Mask[];
  blendMode?: BlendMode;
  
  // Motion Tracking
  motionTrackers?: MotionTracker[];
  
  // Stabilization
  stabilization?: StabilizationSettings;
  
  // 3D Transform
  transform3D?: Transform3D;
  
  // Speed Remapping
  speedRemap?: SpeedRemap;
  
  // Keyframe Animation
  keyframeTracks?: KeyframeTrack[];
  
  // Opacity
  opacity?: number; // 0 to 100
}

// ============================================
// PROJECT SETTINGS
// ============================================
export interface ProjectSettings {
  name: string;
  width: number;
  height: number;
  fps: number;
  sampleRate: number;
  backgroundColor: string;
  duration: number; // in seconds
  
  // Advanced settings
  colorSpace: "sRGB" | "rec709" | "rec2020" | "dci_p3";
  hdr: boolean;
  bitDepth: 8 | 10 | 12 | 16;
  
  // Performance
  performance: PerformanceSettings;
  proxy: ProxySettings;
  
  // Markers
  markers: TimelineMarker[];
  
  // Adjustment Layers
  adjustmentLayers: AdjustmentLayer[];
}

// ============================================
// RENDER QUEUE
// ============================================
export interface RenderQueueItem {
  id: string;
  projectId: string;
  preset: ExportPreset;
  status: "pending" | "rendering" | "completed" | "failed" | "cancelled";
  progress: number; // 0 to 100
  startTime?: Date;
  endTime?: Date;
  outputPath?: string;
  error?: string;
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
export interface KeyboardShortcut {
  id: string;
  action: string;
  keys: string[]; // e.g., ["Ctrl", "S"]
  description: string;
  category: "timeline" | "playback" | "editing" | "effects" | "view" | "file";
}

// ============================================
// WORKSPACE LAYOUT
// ============================================
export interface WorkspaceLayout {
  id: string;
  name: string;
  panels: {
    timeline: { visible: boolean; height: number };
    preview: { visible: boolean; width: number };
    mediaBin: { visible: boolean; width: number };
    effects: { visible: boolean; width: number };
    inspector: { visible: boolean; width: number };
    audio: { visible: boolean; height: number };
  };
}

// ============================================
// ASSET METADATA
// ============================================
export interface AssetMetadata {
  id: string;
  tags: string[];
  description: string;
  rating: number; // 0 to 5
  favorite: boolean;
  dateAdded: Date;
  dateModified: Date;
  fileSize: number; // in bytes
  codec?: string;
  bitrate?: number;
  colorSpace?: string;
  customFields?: { [key: string]: string };
}

// ============================================
// COLLABORATION
// ============================================
export interface CollaborationSession {
  id: string;
  projectId: string;
  users: CollaborationUser[];
  changes: CollaborationChange[];
  locked: boolean;
}

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  selection?: string[]; // IDs of selected items
}

export interface CollaborationChange {
  id: string;
  userId: string;
  timestamp: Date;
  type: "add" | "modify" | "delete";
  target: string; // ID of affected item
  data: any;
}

// ============================================
// AUTO/AI FEATURES
// ============================================
export interface AutoCaptionSettings {
  enabled: boolean;
  language: string;
  model: "whisper" | "google" | "azure" | "aws";
  maxLineLength: number;
  maxLinesPerCaption: number;
  style: CaptionStyle;
}

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  position: "top" | "center" | "bottom";
  alignment: "left" | "center" | "right";
}

export interface AutoColorSettings {
  enabled: boolean;
  style: "natural" | "cinematic" | "vibrant" | "vintage" | "custom";
  intensity: number;
}

export interface SceneDetectionSettings {
  enabled: boolean;
  sensitivity: number; // 0 to 100
  minSceneDuration: number; // in seconds
}

export interface BackgroundRemovalSettings {
  enabled: boolean;
  model: "u2net" | "modnet" | "backgroundmattingv2";
  quality: "low" | "medium" | "high";
  edgeRefinement: boolean;
}