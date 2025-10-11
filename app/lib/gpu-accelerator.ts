/**
 * GPU Acceleration Manager
 * 
 * Manages GPU-accelerated rendering with WebGL for real-time video effects.
 * Provides performance monitoring, fallback mechanisms, and optimization.
 */

import { WebGLEffectRenderer } from './shaders/webgl-renderer';
import type { ShaderType } from './shaders/effect-shaders';

export interface GPUCapabilities {
  webgl: boolean;
  webgl2: boolean;
  maxTextureSize: number;
  maxRenderBufferSize: number;
  maxVertexTextureImageUnits: number;
  maxFragmentTextureImageUnits: number;
  vendor: string;
  renderer: string;
}

export interface RenderPerformance {
  fps: number;
  frameTime: number;
  gpuTime: number;
  cpuTime: number;
  droppedFrames: number;
}

export class GPUAccelerator {
  private renderer: WebGLEffectRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private capabilities: GPUCapabilities | null = null;
  private performance: RenderPerformance = {
    fps: 0,
    frameTime: 0,
    gpuTime: 0,
    cpuTime: 0,
    droppedFrames: 0,
  };
  private frameCount = 0;
  private lastFrameTime = 0;
  private fpsUpdateInterval = 1000; // Update FPS every second
  private lastFpsUpdate = 0;

  /**
   * Initialize GPU accelerator
   */
  async initialize(canvas?: HTMLCanvasElement): Promise<boolean> {
    try {
      // Create or use provided canvas
      this.canvas = canvas || document.createElement('canvas');
      
      // Detect GPU capabilities
      this.capabilities = this.detectCapabilities();
      
      if (!this.capabilities.webgl) {
        console.warn('WebGL not supported, falling back to CPU rendering');
        return false;
      }

      // Create WebGL renderer
      this.renderer = new WebGLEffectRenderer(this.canvas);
      
      console.log('GPU Accelerator initialized:', this.capabilities);
      return true;
    } catch (error) {
      console.error('Failed to initialize GPU accelerator:', error);
      return false;
    }
  }

  /**
   * Detect GPU capabilities
   */
  private detectCapabilities(): GPUCapabilities {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') as WebGLRenderingContext | null || 
                testCanvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    const gl2 = testCanvas.getContext('webgl2');

    if (!gl) {
      return {
        webgl: false,
        webgl2: false,
        maxTextureSize: 0,
        maxRenderBufferSize: 0,
        maxVertexTextureImageUnits: 0,
        maxFragmentTextureImageUnits: 0,
        vendor: 'Unknown',
        renderer: 'Unknown',
      };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    
    return {
      webgl: true,
      webgl2: !!gl2,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
      maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
      maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) as number,
      maxFragmentTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number,
      vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string : gl.getParameter(gl.VENDOR) as string,
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string : gl.getParameter(gl.RENDERER) as string,
    };
  }

  /**
   * Render frame with effects (GPU-accelerated)
   */
  async renderFrame(
    source: TexImageSource,
    effects: Array<{ type: ShaderType; uniforms: Record<string, number | number[]> }>,
    onProgress?: (progress: number) => void
  ): Promise<HTMLCanvasElement | null> {
    if (!this.renderer || !this.canvas) {
      console.warn('GPU renderer not initialized');
      return null;
    }

    const startTime = performance.now();

    try {
      // Render with GPU
      this.renderer.render(source, effects);
      
      // Update performance metrics
      const endTime = performance.now();
      this.updatePerformance(startTime, endTime);

      if (onProgress) {
        onProgress(100);
      }

      return this.canvas;
    } catch (error) {
      console.error('GPU rendering failed:', error);
      this.performance.droppedFrames++;
      return null;
    }
  }

  /**
   * Render video with real-time preview
   */
  async renderVideoRealtime(
    video: HTMLVideoElement,
    effects: Array<{ type: ShaderType; uniforms: Record<string, number | number[]> }>,
    onFrame?: (canvas: HTMLCanvasElement, time: number) => void
  ): Promise<void> {
    if (!this.renderer || !this.canvas) {
      throw new Error('GPU renderer not initialized');
    }

    const renderLoop = () => {
      if (video.paused || video.ended) {
        return;
      }

      // Render current frame
      this.renderer!.render(video, effects);
      
      if (onFrame) {
        onFrame(this.canvas!, video.currentTime);
      }

      // Continue loop
      requestAnimationFrame(renderLoop);
    };

    // Start render loop
    requestAnimationFrame(renderLoop);
  }

  /**
   * Update performance metrics
   */
  private updatePerformance(startTime: number, endTime: number) {
    const frameTime = endTime - startTime;
    this.performance.frameTime = frameTime;
    this.performance.gpuTime = frameTime; // Approximate (actual GPU time requires extensions)
    this.performance.cpuTime = 0; // Minimal CPU time with GPU acceleration

    this.frameCount++;
    const now = performance.now();

    // Update FPS every second
    if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      const elapsed = now - this.lastFpsUpdate;
      this.performance.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformance(): RenderPerformance {
    return { ...this.performance };
  }

  /**
   * Get GPU capabilities
   */
  getCapabilities(): GPUCapabilities | null {
    return this.capabilities;
  }

  /**
   * Check if GPU acceleration is available
   */
  isAvailable(): boolean {
    return this.capabilities?.webgl ?? false;
  }

  /**
   * Get recommended quality settings based on GPU capabilities
   */
  getRecommendedSettings(): {
    maxResolution: { width: number; height: number };
    maxEffects: number;
    enableRealtime: boolean;
  } {
    if (!this.capabilities) {
      return {
        maxResolution: { width: 1280, height: 720 },
        maxEffects: 3,
        enableRealtime: false,
      };
    }

    const maxTextureSize = this.capabilities.maxTextureSize;

    // Determine settings based on GPU capabilities
    if (maxTextureSize >= 8192) {
      // High-end GPU
      return {
        maxResolution: { width: 3840, height: 2160 }, // 4K
        maxEffects: 10,
        enableRealtime: true,
      };
    } else if (maxTextureSize >= 4096) {
      // Mid-range GPU
      return {
        maxResolution: { width: 1920, height: 1080 }, // 1080p
        maxEffects: 6,
        enableRealtime: true,
      };
    } else {
      // Low-end GPU
      return {
        maxResolution: { width: 1280, height: 720 }, // 720p
        maxEffects: 3,
        enableRealtime: false,
      };
    }
  }

  /**
   * Export rendered frame
   */
  async exportFrame(format: 'png' | 'jpeg' | 'webp' = 'png', quality = 1.0): Promise<Blob | null> {
    if (!this.renderer) {
      return null;
    }

    try {
      return await this.renderer.toBlob(`image/${format}`, quality);
    } catch (error) {
      console.error('Failed to export frame:', error);
      return null;
    }
  }

  /**
   * Dispose GPU resources
   */
  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.canvas = null;
    this.capabilities = null;
  }
}

/**
 * Singleton instance
 */
let gpuAcceleratorInstance: GPUAccelerator | null = null;

/**
 * Get GPU accelerator instance
 */
export function getGPUAccelerator(): GPUAccelerator {
  if (!gpuAcceleratorInstance) {
    gpuAcceleratorInstance = new GPUAccelerator();
  }
  return gpuAcceleratorInstance;
}

/**
 * Initialize GPU acceleration
 */
export async function initializeGPUAcceleration(canvas?: HTMLCanvasElement): Promise<boolean> {
  const accelerator = getGPUAccelerator();
  return await accelerator.initialize(canvas);
}