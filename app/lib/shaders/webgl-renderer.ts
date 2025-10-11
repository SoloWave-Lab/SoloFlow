/**
 * WebGL Effect Renderer
 * 
 * Manages WebGL context, compiles shaders, and applies effects to video frames.
 * This is the core rendering engine for all visual effects.
 */

import { vertexShader, shaderRegistry, type ShaderType } from "./effect-shaders";

export class WebGLEffectRenderer {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private programs: Map<ShaderType, WebGLProgram> = new Map();
  private vertexBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      throw new Error("WebGL not supported");
    }

    this.gl = gl;
    this.initBuffers();
  }

  /**
   * Initialize vertex and texture coordinate buffers
   */
  private initBuffers() {
    const gl = this.gl;

    // Vertex positions (full screen quad)
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Texture coordinates
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    // Create texture
    this.texture = gl.createTexture();
  }

  /**
   * Compile a shader program
   */
  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);

    if (!shader) {
      throw new Error("Failed to create shader");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${info}`);
    }

    return shader;
  }

  /**
   * Create a shader program
   */
  private createProgram(fragmentShaderSource: string): WebGLProgram {
    const gl = this.gl;

    const vertShader = this.compileShader(gl.VERTEX_SHADER, vertexShader);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    if (!program) {
      throw new Error("Failed to create program");
    }

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program linking failed: ${info}`);
    }

    // Clean up shaders (they're now part of the program)
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);

    return program;
  }

  /**
   * Get or create a shader program
   */
  private getProgram(shaderType: ShaderType): WebGLProgram {
    if (!this.programs.has(shaderType)) {
      const fragmentShader = shaderRegistry[shaderType];
      const program = this.createProgram(fragmentShader);
      this.programs.set(shaderType, program);
    }

    return this.programs.get(shaderType)!;
  }

  /**
   * Load an image or video frame into a texture
   */
  private loadTexture(source: TexImageSource) {
    const gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  /**
   * Apply a single effect to the current texture
   */
  applyEffect(
    shaderType: ShaderType,
    uniforms: Record<string, number | number[]>
  ) {
    const gl = this.gl;
    const program = this.getProgram(shaderType);

    gl.useProgram(program);

    // Set up vertex attributes
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Set texture uniform
    const imageLocation = gl.getUniformLocation(program, "u_image");
    gl.uniform1i(imageLocation, 0);

    // Set resolution uniform (common to most shaders)
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    if (resolutionLocation) {
      gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
    }

    // Set custom uniforms
    for (const [name, value] of Object.entries(uniforms)) {
      const location = gl.getUniformLocation(program, name);
      if (location) {
        if (Array.isArray(value)) {
          if (value.length === 2) {
            gl.uniform2fv(location, value);
          } else if (value.length === 3) {
            gl.uniform3fv(location, value);
          } else if (value.length === 4) {
            gl.uniform4fv(location, value);
          }
        } else {
          gl.uniform1f(location, value);
        }
      }
    }

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Render a video frame with effects
   */
  render(
    source: TexImageSource,
    effects: Array<{ type: ShaderType; uniforms: Record<string, number | number[]> }>
  ) {
    const gl = this.gl;

    // Set canvas size to match source
    if (source instanceof HTMLVideoElement) {
      this.canvas.width = source.videoWidth;
      this.canvas.height = source.videoHeight;
    } else if (source instanceof HTMLImageElement) {
      this.canvas.width = source.width;
      this.canvas.height = source.height;
    }

    // Set viewport
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Load source into texture
    this.loadTexture(source);

    // Apply effects in sequence
    for (const effect of effects) {
      this.applyEffect(effect.type, effect.uniforms);
    }
  }

  /**
   * Get the rendered frame as a data URL
   */
  toDataURL(type = "image/png", quality = 1.0): string {
    return this.canvas.toDataURL(type, quality);
  }

  /**
   * Get the rendered frame as a Blob
   */
  async toBlob(type = "image/png", quality = 1.0): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob"));
          }
        },
        type,
        quality
      );
    });
  }

  /**
   * Clean up resources
   */
  dispose() {
    const gl = this.gl;

    // Delete programs
    for (const program of this.programs.values()) {
      gl.deleteProgram(program);
    }
    this.programs.clear();

    // Delete buffers
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);

    // Delete texture
    if (this.texture) gl.deleteTexture(this.texture);
  }
}

/**
 * Helper function to create a renderer
 */
export function createEffectRenderer(
  width: number,
  height: number
): WebGLEffectRenderer {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return new WebGLEffectRenderer(canvas);
}