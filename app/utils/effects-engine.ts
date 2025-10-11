// Effects Engine - Core utilities for applying visual and audio effects

import type {
  VisualEffect,
  AudioEffect,
  ColorCorrection,
  Keyframe,
  KeyframeTrack,
  SpeedRemap,
  Transform3D,
} from "~/components/timeline/advanced-types";

// ============================================
// KEYFRAME INTERPOLATION
// ============================================

/**
 * Interpolate between keyframes at a given time
 */
export function interpolateKeyframes(
  keyframes: Keyframe[],
  currentTime: number
): number | string | { x: number; y: number } | { r: number; g: number; b: number; a: number } | null {
  if (keyframes.length === 0) return null;
  if (keyframes.length === 1) return keyframes[0].value;

  // Sort keyframes by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Find surrounding keyframes
  let prevKeyframe: Keyframe | null = null;
  let nextKeyframe: Keyframe | null = null;

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].time <= currentTime) {
      prevKeyframe = sorted[i];
    }
    if (sorted[i].time > currentTime && !nextKeyframe) {
      nextKeyframe = sorted[i];
      break;
    }
  }

  // Before first keyframe
  if (!prevKeyframe) return sorted[0].value;
  
  // After last keyframe
  if (!nextKeyframe) return prevKeyframe.value;

  // Interpolate between keyframes
  const duration = nextKeyframe.time - prevKeyframe.time;
  const elapsed = currentTime - prevKeyframe.time;
  const progress = elapsed / duration;

  // Apply easing
  const easedProgress = applyEasing(progress, prevKeyframe.easing, prevKeyframe.bezierPoints);

  // Interpolate based on value type
  if (typeof prevKeyframe.value === "number" && typeof nextKeyframe.value === "number") {
    return prevKeyframe.value + (nextKeyframe.value - prevKeyframe.value) * easedProgress;
  }

  // For complex types, return the previous value (no interpolation)
  return prevKeyframe.value;
}

/**
 * Apply easing function to progress value
 */
function applyEasing(
  progress: number,
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut" | "bezier",
  bezierPoints?: [number, number, number, number]
): number {
  switch (easing) {
    case "linear":
      return progress;
    case "easeIn":
      return progress * progress;
    case "easeOut":
      return 1 - Math.pow(1 - progress, 2);
    case "easeInOut":
      return progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    case "bezier":
      if (bezierPoints) {
        return cubicBezier(progress, bezierPoints);
      }
      return progress;
    default:
      return progress;
  }
}

/**
 * Cubic bezier interpolation
 */
function cubicBezier(t: number, points: [number, number, number, number]): number {
  const [p1, p2, p3, p4] = points;
  const u = 1 - t;
  return u * u * u * p1 + 3 * u * u * t * p2 + 3 * u * t * t * p3 + t * t * t * p4;
}

// ============================================
// COLOR CORRECTION
// ============================================

/**
 * Apply color correction to RGB values
 */
export function applyColorCorrection(
  r: number,
  g: number,
  b: number,
  correction: ColorCorrection
): [number, number, number] {
  let [nr, ng, nb] = [r, g, b];

  // Brightness
  const brightnessFactor = 1 + correction.brightness / 100;
  nr *= brightnessFactor;
  ng *= brightnessFactor;
  nb *= brightnessFactor;

  // Contrast
  const contrastFactor = (259 * (correction.contrast + 255)) / (255 * (259 - correction.contrast));
  nr = contrastFactor * (nr - 128) + 128;
  ng = contrastFactor * (ng - 128) + 128;
  nb = contrastFactor * (nb - 128) + 128;

  // Convert to HSL for saturation and hue adjustments
  const [h, s, l] = rgbToHsl(nr, ng, nb);

  // Saturation
  const newS = Math.max(0, Math.min(1, s * (1 + correction.saturation / 100)));

  // Hue
  const newH = (h + correction.hue / 360) % 1;

  // Convert back to RGB
  [nr, ng, nb] = hslToRgb(newH, newS, l);

  // Exposure
  const exposureFactor = Math.pow(2, correction.exposure);
  nr *= exposureFactor;
  ng *= exposureFactor;
  nb *= exposureFactor;

  // Clamp values
  return [
    Math.max(0, Math.min(255, nr)),
    Math.max(0, Math.min(255, ng)),
    Math.max(0, Math.min(255, nb)),
  ];
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return [h, s, l];
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const gray = l * 255;
    return [gray, gray, gray];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);

  return [r * 255, g * 255, b * 255];
}

// ============================================
// CHROMA KEY
// ============================================

/**
 * Calculate chroma key mask value
 */
export function chromaKeyMask(
  r: number,
  g: number,
  b: number,
  keyColor: string,
  tolerance: number,
  softness: number
): number {
  // Parse key color
  const keyRgb = hexToRgb(keyColor);
  if (!keyRgb) return 1;

  // Calculate color distance
  const distance = Math.sqrt(
    Math.pow(r - keyRgb.r, 2) +
    Math.pow(g - keyRgb.g, 2) +
    Math.pow(b - keyRgb.b, 2)
  );

  // Normalize distance (max distance in RGB space is ~441)
  const normalizedDistance = distance / 441;

  // Apply tolerance
  const toleranceNormalized = tolerance / 100;
  const softnessNormalized = softness / 100;

  if (normalizedDistance < toleranceNormalized) {
    // Inside tolerance - transparent
    return 0;
  } else if (normalizedDistance < toleranceNormalized + softnessNormalized) {
    // In softness range - gradual transparency
    const softRange = normalizedDistance - toleranceNormalized;
    return softRange / softnessNormalized;
  } else {
    // Outside range - opaque
    return 1;
  }
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// ============================================
// SPEED REMAPPING
// ============================================

/**
 * Calculate output time based on speed remap settings
 */
export function calculateRemappedTime(
  inputTime: number,
  speedRemap: SpeedRemap
): number {
  if (!speedRemap.enabled) return inputTime;

  if (speedRemap.timeRemapCurve && speedRemap.timeRemapCurve.length > 0) {
    // Use time remap curve
    const curve = speedRemap.timeRemapCurve;
    const sorted = [...curve].sort((a, b) => a.inputTime - b.inputTime);

    // Find surrounding points
    let prevPoint = sorted[0];
    let nextPoint = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i++) {
      if (inputTime >= sorted[i].inputTime && inputTime <= sorted[i + 1].inputTime) {
        prevPoint = sorted[i];
        nextPoint = sorted[i + 1];
        break;
      }
    }

    // Interpolate
    const duration = nextPoint.inputTime - prevPoint.inputTime;
    const elapsed = inputTime - prevPoint.inputTime;
    const progress = duration > 0 ? elapsed / duration : 0;

    const easedProgress = applyEasing(progress, prevPoint.easing);

    return prevPoint.outputTime + (nextPoint.outputTime - prevPoint.outputTime) * easedProgress;
  } else {
    // Simple speed multiplier
    return inputTime * speedRemap.speed;
  }
}

// ============================================
// 3D TRANSFORMS
// ============================================

/**
 * Calculate 3D transform matrix
 */
export function calculate3DTransform(transform: Transform3D): string {
  const { rotationX, rotationY, rotationZ, perspectiveDistance, anchorX, anchorY } = transform;

  const transforms = [
    `perspective(${perspectiveDistance}px)`,
    `rotateX(${rotationX}deg)`,
    `rotateY(${rotationY}deg)`,
    `rotateZ(${rotationZ}deg)`,
  ];

  return transforms.join(" ");
}

// ============================================
// AUDIO EFFECTS
// ============================================

/**
 * Calculate volume with fade
 */
export function calculateVolumeWithFade(
  currentTime: number,
  startTime: number,
  endTime: number,
  baseVolume: number,
  fadeInDuration: number,
  fadeOutDuration: number
): number {
  const duration = endTime - startTime;
  const elapsed = currentTime - startTime;

  let volume = baseVolume;

  // Fade in
  if (elapsed < fadeInDuration) {
    volume *= elapsed / fadeInDuration;
  }

  // Fade out
  const timeUntilEnd = duration - elapsed;
  if (timeUntilEnd < fadeOutDuration) {
    volume *= timeUntilEnd / fadeOutDuration;
  }

  return Math.max(0, Math.min(1, volume));
}

/**
 * Calculate auto ducking volume
 */
export function calculateDuckingVolume(
  currentVolume: number,
  voicePresent: boolean,
  duckingAmount: number,
  duckingAttack: number,
  duckingRelease: number,
  deltaTime: number,
  currentDuckingLevel: number
): { volume: number; duckingLevel: number } {
  const targetDuckingLevel = voicePresent ? duckingAmount : 0;
  const rate = voicePresent ? duckingAttack : duckingRelease;

  // Smooth transition
  const newDuckingLevel = currentDuckingLevel + (targetDuckingLevel - currentDuckingLevel) * (deltaTime / rate);

  const volume = currentVolume * (1 - newDuckingLevel);

  return { volume, duckingLevel: newDuckingLevel };
}

// ============================================
// BLEND MODES
// ============================================

/**
 * Apply blend mode to two colors
 */
export function applyBlendMode(
  baseR: number,
  baseG: number,
  baseB: number,
  blendR: number,
  blendG: number,
  blendB: number,
  mode: string,
  opacity: number
): [number, number, number] {
  let [r, g, b] = [baseR, baseG, baseB];

  switch (mode) {
    case "multiply":
      r = (baseR * blendR) / 255;
      g = (baseG * blendG) / 255;
      b = (baseB * blendB) / 255;
      break;
    case "screen":
      r = 255 - ((255 - baseR) * (255 - blendR)) / 255;
      g = 255 - ((255 - baseG) * (255 - blendG)) / 255;
      b = 255 - ((255 - baseB) * (255 - blendB)) / 255;
      break;
    case "overlay":
      r = baseR < 128 ? (2 * baseR * blendR) / 255 : 255 - (2 * (255 - baseR) * (255 - blendR)) / 255;
      g = baseG < 128 ? (2 * baseG * blendG) / 255 : 255 - (2 * (255 - baseG) * (255 - blendG)) / 255;
      b = baseB < 128 ? (2 * baseB * blendB) / 255 : 255 - (2 * (255 - baseB) * (255 - blendB)) / 255;
      break;
    case "add":
      r = Math.min(255, baseR + blendR);
      g = Math.min(255, baseG + blendG);
      b = Math.min(255, baseB + blendB);
      break;
    case "subtract":
      r = Math.max(0, baseR - blendR);
      g = Math.max(0, baseG - blendG);
      b = Math.max(0, baseB - blendB);
      break;
    default:
      // Normal blend
      r = blendR;
      g = blendG;
      b = blendB;
  }

  // Apply opacity
  const alpha = opacity / 100;
  r = baseR + (r - baseR) * alpha;
  g = baseG + (g - baseG) * alpha;
  b = baseB + (b - baseB) * alpha;

  return [
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b)),
  ];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Map value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}