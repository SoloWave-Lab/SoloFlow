/**
 * WebGL Rendering Service
 * Handles real-time preview rendering with GPU acceleration
 */

// ============================================
// TYPES
// ============================================

export interface RenderContext {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  programs: Map<string, WebGLProgram>;
  textures: Map<string, WebGLTexture>;
  framebuffers: Map<string, WebGLFramebuffer>;
}

export interface MaskRenderData {
  type: 'rectangle' | 'ellipse' | 'polygon' | 'bezier';
  enabled: boolean;
  inverted: boolean;
  feather: number;
  opacity: number;
  shape?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };
  points?: Array<{ x: number; y: number }>;
}

export interface LayerRenderData {
  id: string;
  type: 'video' | 'image' | 'adjustment';
  source?: HTMLVideoElement | HTMLImageElement;
  opacity: number;
  blendMode: string;
  transform: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  };
  colorCorrection?: {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    temperature: number;
    tint: number;
  };
  masks?: MaskRenderData[];
}

// ============================================
// WEBGL RENDERER
// ============================================

export class WebGLRenderer {
  private context: RenderContext | null = null;
  private animationFrameId: number | null = null;
  private layers: LayerRenderData[] = [];

  /**
   * Initialize WebGL context
   */
  initialize(canvas: HTMLCanvasElement): void {
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true
    });

    if (!gl) {
      throw new Error('WebGL 2 not supported');
    }

    this.context = {
      canvas,
      gl,
      programs: new Map(),
      textures: new Map(),
      framebuffers: new Map()
    };

    // Initialize shaders
    this.initializeShaders();

    // Set up viewport
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  /**
   * Initialize shader programs
   */
  private initializeShaders(): void {
    if (!this.context) return;

    const { gl } = this.context;

    // Basic video shader
    this.createProgram('video', VERTEX_SHADER, VIDEO_FRAGMENT_SHADER);

    // Mask shaders
    this.createProgram('mask-rectangle', VERTEX_SHADER, MASK_RECTANGLE_SHADER);
    this.createProgram('mask-ellipse', VERTEX_SHADER, MASK_ELLIPSE_SHADER);
    this.createProgram('mask-polygon', VERTEX_SHADER, MASK_POLYGON_SHADER);

    // Color correction shader
    this.createProgram('color-correction', VERTEX_SHADER, COLOR_CORRECTION_SHADER);

    // Blend mode shaders
    this.createProgram('blend-normal', VERTEX_SHADER, BLEND_NORMAL_SHADER);
    this.createProgram('blend-multiply', VERTEX_SHADER, BLEND_MULTIPLY_SHADER);
    this.createProgram('blend-screen', VERTEX_SHADER, BLEND_SCREEN_SHADER);
    this.createProgram('blend-overlay', VERTEX_SHADER, BLEND_OVERLAY_SHADER);
  }

  /**
   * Create shader program
   */
  private createProgram(name: string, vertexSource: string, fragmentSource: string): void {
    if (!this.context) return;

    const { gl, programs } = this.context;

    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create program');

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`Failed to link program: ${info}`);
    }

    programs.set(name, program);
  }

  /**
   * Compile shader
   */
  private compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Failed to compile shader: ${info}`);
    }

    return shader;
  }

  /**
   * Add layer to render
   */
  addLayer(layer: LayerRenderData): void {
    this.layers.push(layer);
    this.layers.sort((a, b) => {
      // Sort by z-index if available, otherwise maintain order
      return 0;
    });
  }

  /**
   * Remove layer
   */
  removeLayer(layerId: string): void {
    this.layers = this.layers.filter(l => l.id !== layerId);
  }

  /**
   * Update layer
   */
  updateLayer(layerId: string, updates: Partial<LayerRenderData>): void {
    const layer = this.layers.find(l => l.id === layerId);
    if (layer) {
      Object.assign(layer, updates);
    }
  }

  /**
   * Start rendering loop
   */
  startRendering(): void {
    if (this.animationFrameId !== null) return;

    const render = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  /**
   * Stop rendering loop
   */
  stopRendering(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Render frame
   */
  private render(): void {
    if (!this.context) return;

    const { gl, canvas } = this.context;

    // Clear canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Render each layer
    for (const layer of this.layers) {
      this.renderLayer(layer);
    }
  }

  /**
   * Render single layer
   */
  private renderLayer(layer: LayerRenderData): void {
    if (!this.context) return;

    const { gl } = this.context;

    // Create texture from source
    const texture = this.createTextureFromSource(layer.source);
    if (!texture) return;

    // Apply masks
    let maskedTexture = texture;
    if (layer.masks && layer.masks.length > 0) {
      maskedTexture = this.applyMasks(texture, layer.masks);
    }

    // Apply color correction
    let correctedTexture = maskedTexture;
    if (layer.colorCorrection) {
      correctedTexture = this.applyColorCorrection(maskedTexture, layer.colorCorrection);
    }

    // Apply transform and blend
    this.renderTexture(correctedTexture, layer.transform, layer.opacity, layer.blendMode);
  }

  /**
   * Create texture from video or image element
   */
  private createTextureFromSource(
    source?: HTMLVideoElement | HTMLImageElement
  ): WebGLTexture | null {
    if (!this.context || !source) return null;

    const { gl } = this.context;

    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
  }

  /**
   * Apply masks to texture
   */
  private applyMasks(texture: WebGLTexture, masks: MaskRenderData[]): WebGLTexture {
    if (!this.context) return texture;

    const { gl, programs } = this.context;

    // Create framebuffer for mask rendering
    const framebuffer = gl.createFramebuffer();
    const maskTexture = gl.createTexture();

    if (!framebuffer || !maskTexture) return texture;

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, maskTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, maskTexture, 0);

    // Render each mask
    for (const mask of masks) {
      if (!mask.enabled) continue;

      const programName = `mask-${mask.type}`;
      const program = programs.get(programName);
      if (!program) continue;

      gl.useProgram(program);

      // Set uniforms
      const featherLoc = gl.getUniformLocation(program, 'u_feather');
      const opacityLoc = gl.getUniformLocation(program, 'u_opacity');
      const invertedLoc = gl.getUniformLocation(program, 'u_inverted');

      gl.uniform1f(featherLoc, mask.feather);
      gl.uniform1f(opacityLoc, mask.opacity);
      gl.uniform1i(invertedLoc, mask.inverted ? 1 : 0);

      // Set shape-specific uniforms
      if (mask.shape) {
        const shapeLoc = gl.getUniformLocation(program, 'u_shape');
        gl.uniform4f(shapeLoc, mask.shape.x, mask.shape.y, mask.shape.width, mask.shape.height);
      }

      // Draw mask
      this.drawQuad();
    }

    // Combine original texture with mask
    const combinedTexture = this.combineTextureWithMask(texture, maskTexture);

    // Cleanup
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(maskTexture);

    return combinedTexture;
  }

  /**
   * Apply color correction to texture
   */
  private applyColorCorrection(
    texture: WebGLTexture,
    correction: NonNullable<LayerRenderData['colorCorrection']>
  ): WebGLTexture {
    if (!this.context) return texture;

    const { gl, programs } = this.context;

    const program = programs.get('color-correction');
    if (!program) return texture;

    // Create framebuffer
    const framebuffer = gl.createFramebuffer();
    const outputTexture = gl.createTexture();

    if (!framebuffer || !outputTexture) return texture;

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, outputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);

    gl.useProgram(program);

    // Set uniforms
    gl.uniform1f(gl.getUniformLocation(program, 'u_brightness'), correction.brightness);
    gl.uniform1f(gl.getUniformLocation(program, 'u_contrast'), correction.contrast);
    gl.uniform1f(gl.getUniformLocation(program, 'u_saturation'), correction.saturation);
    gl.uniform1f(gl.getUniformLocation(program, 'u_hue'), correction.hue);
    gl.uniform1f(gl.getUniformLocation(program, 'u_temperature'), correction.temperature);
    gl.uniform1f(gl.getUniformLocation(program, 'u_tint'), correction.tint);

    // Bind input texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);

    // Draw
    this.drawQuad();

    // Cleanup
    gl.deleteFramebuffer(framebuffer);

    return outputTexture;
  }

  /**
   * Render texture with transform and blend mode
   */
  private renderTexture(
    texture: WebGLTexture,
    transform: LayerRenderData['transform'],
    opacity: number,
    blendMode: string
  ): void {
    if (!this.context) return;

    const { gl, programs } = this.context;

    const programName = `blend-${blendMode}`;
    const program = programs.get(programName) || programs.get('blend-normal');
    if (!program) return;

    gl.useProgram(program);

    // Set transform uniforms
    const transformLoc = gl.getUniformLocation(program, 'u_transform');
    gl.uniformMatrix3fv(transformLoc, false, this.createTransformMatrix(transform));

    // Set opacity
    const opacityLoc = gl.getUniformLocation(program, 'u_opacity');
    gl.uniform1f(opacityLoc, opacity);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);

    // Draw
    this.drawQuad();
  }

  /**
   * Create transform matrix
   */
  private createTransformMatrix(transform: LayerRenderData['transform']): Float32Array {
    const { x, y, scaleX, scaleY, rotation } = transform;

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    return new Float32Array([
      scaleX * cos, scaleX * sin, 0,
      -scaleY * sin, scaleY * cos, 0,
      x, y, 1
    ]);
  }

  /**
   * Draw quad
   */
  private drawQuad(): void {
    if (!this.context) return;

    const { gl } = this.context;

    const vertices = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = 0; // Assuming position is at location 0
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.deleteBuffer(buffer);
  }

  /**
   * Combine texture with mask
   */
  private combineTextureWithMask(texture: WebGLTexture, mask: WebGLTexture): WebGLTexture {
    // Multiply texture alpha by mask
    // Implementation would use a shader to combine
    return texture; // Placeholder
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopRendering();

    if (this.context) {
      const { gl, programs, textures, framebuffers } = this.context;

      // Delete programs
      programs.forEach(program => gl.deleteProgram(program));
      programs.clear();

      // Delete textures
      textures.forEach(texture => gl.deleteTexture(texture));
      textures.clear();

      // Delete framebuffers
      framebuffers.forEach(fb => gl.deleteFramebuffer(fb));
      framebuffers.clear();

      this.context = null;
    }

    this.layers = [];
  }
}

// ============================================
// SHADERS
// ============================================

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;

uniform mat3 u_transform;

void main() {
  vec3 pos = u_transform * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
  v_texCoord = a_position * 0.5 + 0.5;
}
`;

const VIDEO_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_opacity;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  fragColor = vec4(color.rgb, color.a * u_opacity);
}
`;

const MASK_RECTANGLE_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform vec4 u_shape; // x, y, width, height
uniform float u_feather;
uniform float u_opacity;
uniform bool u_inverted;

void main() {
  vec2 pos = v_texCoord;
  vec2 rectMin = u_shape.xy;
  vec2 rectMax = u_shape.xy + u_shape.zw;
  
  float alpha = 1.0;
  
  if (pos.x < rectMin.x || pos.x > rectMax.x || pos.y < rectMin.y || pos.y > rectMax.y) {
    alpha = 0.0;
  } else if (u_feather > 0.0) {
    float distX = min(pos.x - rectMin.x, rectMax.x - pos.x);
    float distY = min(pos.y - rectMin.y, rectMax.y - pos.y);
    float dist = min(distX, distY);
    alpha = smoothstep(0.0, u_feather, dist);
  }
  
  if (u_inverted) {
    alpha = 1.0 - alpha;
  }
  
  fragColor = vec4(1.0, 1.0, 1.0, alpha * u_opacity);
}
`;

const MASK_ELLIPSE_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform vec4 u_shape; // x, y, width, height
uniform float u_feather;
uniform float u_opacity;
uniform bool u_inverted;

void main() {
  vec2 center = u_shape.xy + u_shape.zw * 0.5;
  vec2 radius = u_shape.zw * 0.5;
  vec2 pos = v_texCoord;
  
  float dist = length((pos - center) / radius);
  float alpha = 1.0 - smoothstep(1.0 - u_feather, 1.0, dist);
  
  if (u_inverted) {
    alpha = 1.0 - alpha;
  }
  
  fragColor = vec4(1.0, 1.0, 1.0, alpha * u_opacity);
}
`;

const MASK_POLYGON_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_feather;
uniform float u_opacity;
uniform bool u_inverted;

// Simplified polygon mask - would need point data passed in
void main() {
  float alpha = 1.0;
  
  if (u_inverted) {
    alpha = 1.0 - alpha;
  }
  
  fragColor = vec4(1.0, 1.0, 1.0, alpha * u_opacity);
}
`;

const COLOR_CORRECTION_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_hue;
uniform float u_temperature;
uniform float u_tint;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  
  // Brightness
  color.rgb += u_brightness;
  
  // Contrast
  color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
  
  // Saturation & Hue
  vec3 hsv = rgb2hsv(color.rgb);
  hsv.x += u_hue;
  hsv.y *= u_saturation;
  color.rgb = hsv2rgb(hsv);
  
  // Temperature (simplified)
  color.r += u_temperature * 0.1;
  color.b -= u_temperature * 0.1;
  
  // Tint
  color.g += u_tint * 0.1;
  
  fragColor = color;
}
`;

const BLEND_NORMAL_SHADER = VIDEO_FRAGMENT_SHADER;

const BLEND_MULTIPLY_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_opacity;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  // Multiply blend mode
  fragColor = vec4(color.rgb * color.rgb, color.a * u_opacity);
}
`;

const BLEND_SCREEN_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_opacity;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  // Screen blend mode
  vec3 result = 1.0 - (1.0 - color.rgb) * (1.0 - color.rgb);
  fragColor = vec4(result, color.a * u_opacity);
}
`;

const BLEND_OVERLAY_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_opacity;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  // Overlay blend mode
  vec3 result = mix(
    2.0 * color.rgb * color.rgb,
    1.0 - 2.0 * (1.0 - color.rgb) * (1.0 - color.rgb),
    step(0.5, color.rgb)
  );
  fragColor = vec4(result, color.a * u_opacity);
}
`;