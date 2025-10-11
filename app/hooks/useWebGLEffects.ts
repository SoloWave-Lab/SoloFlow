import { useEffect, useRef, useState } from "react";
import { WebGLEffectRenderer } from "~/lib/shaders/webgl-renderer";
import type { ShaderType } from "~/lib/shaders/effect-shaders";
import type { VisualEffect, ColorCorrection } from "~/components/timeline/advanced-types";

interface UseWebGLEffectsOptions {
  width: number;
  height: number;
  visualEffects?: VisualEffect[];
  colorCorrection?: ColorCorrection | null;
}

/**
 * React hook for applying WebGL effects to video frames
 * 
 * Usage:
 * ```tsx
 * const { canvasRef, applyEffects } = useWebGLEffects({
 *   width: 1920,
 *   height: 1080,
 *   visualEffects: effects,
 *   colorCorrection: correction,
 * });
 * 
 * // In your render:
 * <canvas ref={canvasRef} />
 * ```
 */
export function useWebGLEffects({
  width,
  height,
  visualEffects = [],
  colorCorrection = null,
}: UseWebGLEffectsOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLEffectRenderer | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      rendererRef.current = new WebGLEffectRenderer(canvasRef.current);
      setIsReady(true);
    } catch (error) {
      console.error("Failed to initialize WebGL renderer:", error);
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  // Update canvas size
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, [width, height]);

  /**
   * Convert visual effects to shader effects
   */
  const convertEffectsToShaders = () => {
    const shaderEffects: Array<{
      type: ShaderType;
      uniforms: Record<string, number | number[]>;
    }> = [];

    // Process visual effects
    for (const effect of visualEffects) {
      if (!effect.enabled) continue;

      switch (effect.type) {
        case "blur":
          shaderEffects.push({
            type: "gaussianBlur",
            uniforms: {
              u_blurAmount: effect.parameters.amount || 5,
            },
          });
          break;

        case "sharpen":
          shaderEffects.push({
            type: "sharpen",
            uniforms: {
              u_amount: (effect.parameters.amount || 1) / 100,
            },
          });
          break;

        case "chromaKey":
          const keyColor = effect.parameters.keyColor || "#00ff00";
          const rgb = hexToRgb(keyColor);
          shaderEffects.push({
            type: "chromaKey",
            uniforms: {
              u_keyColor: [rgb.r / 255, rgb.g / 255, rgb.b / 255],
              u_tolerance: (effect.parameters.tolerance || 50) / 100,
              u_softness: (effect.parameters.softness || 10) / 100,
              u_spillSuppression: (effect.parameters.spillSuppression || 50) / 100,
            },
          });
          break;

        case "vignette":
          shaderEffects.push({
            type: "vignette",
            uniforms: {
              u_amount: (effect.parameters.amount || 50) / 100,
              u_size: (effect.parameters.size || 50) / 100,
              u_softness: (effect.parameters.softness || 50) / 100,
            },
          });
          break;

        case "noise":
        case "grain":
          shaderEffects.push({
            type: "noise",
            uniforms: {
              u_amount: (effect.parameters.amount || 50) / 1000,
              u_time: Date.now() / 1000,
            },
          });
          break;

        case "pixelate":
          shaderEffects.push({
            type: "pixelate",
            uniforms: {
              u_pixelSize: effect.parameters.pixelSize || 10,
            },
          });
          break;

        case "edgeDetect":
          shaderEffects.push({
            type: "edgeDetect",
            uniforms: {},
          });
          break;

        case "bloom":
          shaderEffects.push({
            type: "bloom",
            uniforms: {
              u_threshold: (effect.parameters.threshold || 80) / 100,
              u_intensity: (effect.parameters.intensity || 50) / 100,
            },
          });
          break;

        case "chromaticAberration":
          shaderEffects.push({
            type: "chromaticAberration",
            uniforms: {
              u_amount: effect.parameters.amount || 5,
            },
          });
          break;

        case "distortion":
          const distortionTypes = {
            barrel: 0,
            pincushion: 1,
            wave: 2,
            ripple: 3,
          };
          shaderEffects.push({
            type: "distortion",
            uniforms: {
              u_amount: (effect.parameters.amount || 50) / 100,
              u_type: distortionTypes[effect.parameters.type as keyof typeof distortionTypes] || 0,
              u_time: Date.now() / 1000,
            },
          });
          break;
      }
    }

    // Process color correction
    if (colorCorrection) {
      shaderEffects.push({
        type: "colorCorrection",
        uniforms: {
          u_brightness: (colorCorrection.brightness || 0) / 100,
          u_contrast: (colorCorrection.contrast || 0) / 100,
          u_saturation: (colorCorrection.saturation || 0) / 100,
          u_hue: colorCorrection.hue || 0,
          u_exposure: (colorCorrection.exposure || 0) / 100,
          u_temperature: (colorCorrection.temperature || 0) / 100,
          u_tint: (colorCorrection.tint || 0) / 100,
        },
      });
    }

    return shaderEffects;
  };

  /**
   * Apply effects to a video frame
   */
  const applyEffects = (source: TexImageSource) => {
    if (!rendererRef.current || !isReady) {
      console.warn("WebGL renderer not ready");
      return;
    }

    const shaderEffects = convertEffectsToShaders();

    if (shaderEffects.length === 0) {
      // No effects, just copy the source
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(source as any, 0, 0, width, height);
      }
      return;
    }

    try {
      rendererRef.current.render(source, shaderEffects);
    } catch (error) {
      console.error("Failed to apply effects:", error);
    }
  };

  return {
    canvasRef,
    applyEffects,
    isReady,
  };
}

/**
 * Helper function to convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 255, b: 0 }; // Default to green
}