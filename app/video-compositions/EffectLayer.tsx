import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import type {
  VisualEffect,
  ColorCorrection,
  BlendMode as BlendModeType,
} from "~/components/timeline/advanced-types";

interface EffectLayerProps {
  children: React.ReactNode;
  visualEffects?: VisualEffect[];
  colorCorrection?: ColorCorrection | null;
  blendMode?: BlendModeType;
  opacity?: number;
}

/**
 * EffectLayer - Applies visual effects, color correction, and blend modes to video content
 * 
 * This component wraps Remotion media elements and applies CSS filters and transforms
 * for real-time preview. For final rendering, these should be replaced with WebGL shaders.
 */
export function EffectLayer({
  children,
  visualEffects = [],
  colorCorrection = null,
  blendMode = "normal",
  opacity = 1,
}: EffectLayerProps) {
  // Build CSS filter string from visual effects
  const filterString = useMemo(() => {
    const filters: string[] = [];

    // Apply enabled visual effects
    for (const effect of visualEffects) {
      if (!effect.enabled) continue;

      switch (effect.type) {
        case "blur":
          const blurAmount = effect.parameters.amount || 5;
          filters.push(`blur(${blurAmount}px)`);
          break;

        case "sharpen":
          // CSS doesn't have sharpen, but we can approximate with contrast
          const sharpenAmount = effect.parameters.amount || 1;
          filters.push(`contrast(${100 + sharpenAmount * 20}%)`);
          break;

        case "grayscale":
          filters.push("grayscale(100%)");
          break;

        case "sepia":
          filters.push("sepia(100%)");
          break;

        case "vignette":
          // Vignette requires custom implementation (see below)
          break;

        case "chromaKey":
          // Chroma key requires WebGL shader
          break;

        case "noise":
        case "grain":
          // Noise/grain requires WebGL shader
          break;

        case "pixelate":
          // Pixelate requires custom implementation
          break;

        default:
          // Other effects require WebGL shaders
          break;
      }
    }

    // Apply color correction
    if (colorCorrection) {
      if (colorCorrection.brightness !== undefined && colorCorrection.brightness !== 0) {
        filters.push(`brightness(${100 + colorCorrection.brightness}%)`);
      }
      if (colorCorrection.contrast !== undefined && colorCorrection.contrast !== 0) {
        filters.push(`contrast(${100 + colorCorrection.contrast}%)`);
      }
      if (colorCorrection.saturation !== undefined && colorCorrection.saturation !== 0) {
        filters.push(`saturate(${100 + colorCorrection.saturation}%)`);
      }
      if (colorCorrection.hue !== undefined && colorCorrection.hue !== 0) {
        filters.push(`hue-rotate(${colorCorrection.hue}deg)`);
      }
      if (colorCorrection.exposure !== undefined && colorCorrection.exposure !== 0) {
        // Exposure approximation using brightness
        filters.push(`brightness(${100 + colorCorrection.exposure * 2}%)`);
      }
    }

    return filters.length > 0 ? filters.join(" ") : "none";
  }, [visualEffects, colorCorrection]);

  // Build CSS transform string
  const transformString = useMemo(() => {
    const transforms: string[] = [];

    // Check for mirror effect
    const mirrorEffect = visualEffects.find(
      (e) => e.enabled && e.type === "mirror"
    );
    if (mirrorEffect) {
      const direction = mirrorEffect.parameters.direction || "horizontal";
      if (direction === "horizontal") {
        transforms.push("scaleX(-1)");
      } else if (direction === "vertical") {
        transforms.push("scaleY(-1)");
      }
    }

    return transforms.length > 0 ? transforms.join(" ") : "none";
  }, [visualEffects]);

  // Get blend mode CSS value
  const blendModeCSS = useMemo(() => {
    const blendModeMap: Record<string, string> = {
      normal: "normal",
      multiply: "multiply",
      screen: "screen",
      overlay: "overlay",
      darken: "darken",
      lighten: "lighten",
      colorDodge: "color-dodge",
      colorBurn: "color-burn",
      hardLight: "hard-light",
      softLight: "soft-light",
      difference: "difference",
      exclusion: "exclusion",
      hue: "hue",
      saturation: "saturation",
      color: "color",
      luminosity: "luminosity",
    };
    return blendModeMap[blendMode] || "normal";
  }, [blendMode]);

  // Check if we need vignette overlay
  const vignetteEffect = visualEffects.find(
    (e) => e.enabled && e.type === "vignette"
  );

  // Check if we need pixelate effect
  const pixelateEffect = visualEffects.find(
    (e) => e.enabled && e.type === "pixelate"
  );

  return (
    <AbsoluteFill
      style={{
        filter: filterString,
        transform: transformString,
        mixBlendMode: blendModeCSS as any,
        opacity,
      }}
    >
      {/* Apply pixelate effect using image-rendering */}
      {pixelateEffect ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            imageRendering: "pixelated",
            transform: `scale(${1 / (pixelateEffect.parameters.pixelSize || 10)})`,
            transformOrigin: "top left",
          }}
        >
          <div
            style={{
              width: `${(pixelateEffect.parameters.pixelSize || 10) * 100}%`,
              height: `${(pixelateEffect.parameters.pixelSize || 10) * 100}%`,
              transform: `scale(${1 / (pixelateEffect.parameters.pixelSize || 10)})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      ) : (
        children
      )}

      {/* Vignette overlay */}
      {vignetteEffect && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(
              ellipse at center,
              transparent ${100 - (vignetteEffect.parameters.size || 50)}%,
              rgba(0, 0, 0, ${(vignetteEffect.parameters.amount || 50) / 100}) 100%
            )`,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
}

/**
 * Advanced effect rendering using WebGL shaders
 * TODO: Implement for production use
 * 
 * This would use WebGL to apply effects frame-by-frame:
 * 1. Load video frame into WebGL texture
 * 2. Apply shader programs for each effect
 * 3. Render to canvas
 * 4. Use canvas as Remotion source
 */
export function WebGLEffectLayer({
  children,
  visualEffects = [],
  colorCorrection = null,
}: Omit<EffectLayerProps, "blendMode" | "opacity">) {
  // TODO: Implement WebGL rendering
  // For now, fall back to CSS-based rendering
  return (
    <EffectLayer
      visualEffects={visualEffects}
      colorCorrection={colorCorrection}
    >
      {children}
    </EffectLayer>
  );
}