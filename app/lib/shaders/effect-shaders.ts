/**
 * WebGL Shader Programs for Video Effects
 * 
 * Each shader is a GLSL program that processes video frames in real-time.
 * Shaders are compiled and executed on the GPU for maximum performance.
 */

// Vertex shader (shared by all effects)
export const vertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// Fragment shader for Gaussian Blur
export const gaussianBlurShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform float u_blurAmount;
  varying vec2 v_texCoord;
  
  void main() {
    vec2 texelSize = 1.0 / u_resolution;
    vec4 color = vec4(0.0);
    float total = 0.0;
    
    // 9-tap Gaussian blur
    for (float x = -2.0; x <= 2.0; x += 1.0) {
      for (float y = -2.0; y <= 2.0; y += 1.0) {
        vec2 offset = vec2(x, y) * texelSize * u_blurAmount;
        float weight = exp(-(x*x + y*y) / 2.0);
        color += texture2D(u_image, v_texCoord + offset) * weight;
        total += weight;
      }
    }
    
    gl_FragColor = color / total;
  }
`;

// Fragment shader for Sharpen
export const sharpenShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform float u_amount;
  varying vec2 v_texCoord;
  
  void main() {
    vec2 texelSize = 1.0 / u_resolution;
    
    vec4 center = texture2D(u_image, v_texCoord);
    vec4 top = texture2D(u_image, v_texCoord + vec2(0.0, texelSize.y));
    vec4 bottom = texture2D(u_image, v_texCoord - vec2(0.0, texelSize.y));
    vec4 left = texture2D(u_image, v_texCoord - vec2(texelSize.x, 0.0));
    vec4 right = texture2D(u_image, v_texCoord + vec2(texelSize.x, 0.0));
    
    vec4 edges = (top + bottom + left + right) * 0.25;
    vec4 sharpened = center + (center - edges) * u_amount;
    
    gl_FragColor = clamp(sharpened, 0.0, 1.0);
  }
`;

// Fragment shader for Chroma Key (Green Screen)
export const chromaKeyShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform vec3 u_keyColor;
  uniform float u_tolerance;
  uniform float u_softness;
  uniform float u_spillSuppression;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // Calculate color distance
    float dist = distance(color.rgb, u_keyColor);
    
    // Calculate alpha based on tolerance and softness
    float alpha = smoothstep(u_tolerance, u_tolerance + u_softness, dist);
    
    // Spill suppression
    if (u_spillSuppression > 0.0) {
      float spillAmount = max(0.0, 1.0 - dist / u_tolerance);
      color.rgb = mix(color.rgb, color.rgb * (1.0 - u_keyColor), spillAmount * u_spillSuppression);
    }
    
    gl_FragColor = vec4(color.rgb, color.a * alpha);
  }
`;

// Fragment shader for Vignette
export const vignetteShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_amount;
  uniform float u_size;
  uniform float u_softness;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // Calculate distance from center
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(v_texCoord, center);
    
    // Calculate vignette
    float vignette = smoothstep(u_size, u_size - u_softness, dist);
    vignette = mix(1.0, vignette, u_amount);
    
    gl_FragColor = vec4(color.rgb * vignette, color.a);
  }
`;

// Fragment shader for Noise/Grain
export const noiseShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_amount;
  uniform float u_time;
  varying vec2 v_texCoord;
  
  // Random function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // Generate noise
    float noise = random(v_texCoord + u_time) * 2.0 - 1.0;
    
    // Apply noise
    color.rgb += noise * u_amount;
    
    gl_FragColor = clamp(color, 0.0, 1.0);
  }
`;

// Fragment shader for Pixelate
export const pixelateShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform float u_pixelSize;
  varying vec2 v_texCoord;
  
  void main() {
    vec2 pixelSize = vec2(u_pixelSize) / u_resolution;
    vec2 coord = floor(v_texCoord / pixelSize) * pixelSize;
    
    gl_FragColor = texture2D(u_image, coord);
  }
`;

// Fragment shader for Edge Detection
export const edgeDetectShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;
  
  void main() {
    vec2 texelSize = 1.0 / u_resolution;
    
    // Sobel operator
    mat3 sobelX = mat3(
      -1.0, 0.0, 1.0,
      -2.0, 0.0, 2.0,
      -1.0, 0.0, 1.0
    );
    
    mat3 sobelY = mat3(
      -1.0, -2.0, -1.0,
       0.0,  0.0,  0.0,
       1.0,  2.0,  1.0
    );
    
    float gx = 0.0;
    float gy = 0.0;
    
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        vec2 offset = vec2(float(i), float(j)) * texelSize;
        float intensity = texture2D(u_image, v_texCoord + offset).r;
        gx += intensity * sobelX[i+1][j+1];
        gy += intensity * sobelY[i+1][j+1];
      }
    }
    
    float edge = sqrt(gx * gx + gy * gy);
    gl_FragColor = vec4(vec3(edge), 1.0);
  }
`;

// Fragment shader for Bloom
export const bloomShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform float u_threshold;
  uniform float u_intensity;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // Extract bright areas
    float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    vec3 bloom = vec3(0.0);
    
    if (brightness > u_threshold) {
      bloom = color.rgb * (brightness - u_threshold) * u_intensity;
    }
    
    // Simple blur for bloom
    vec2 texelSize = 1.0 / u_resolution;
    for (float x = -2.0; x <= 2.0; x += 1.0) {
      for (float y = -2.0; y <= 2.0; y += 1.0) {
        vec2 offset = vec2(x, y) * texelSize * 2.0;
        vec4 sample = texture2D(u_image, v_texCoord + offset);
        float sampleBrightness = dot(sample.rgb, vec3(0.2126, 0.7152, 0.0722));
        if (sampleBrightness > u_threshold) {
          bloom += sample.rgb * 0.04;
        }
      }
    }
    
    gl_FragColor = vec4(color.rgb + bloom, color.a);
  }
`;

// Fragment shader for Chromatic Aberration
export const chromaticAberrationShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_amount;
  varying vec2 v_texCoord;
  
  void main() {
    vec2 direction = v_texCoord - vec2(0.5);
    
    float r = texture2D(u_image, v_texCoord + direction * u_amount * 0.01).r;
    float g = texture2D(u_image, v_texCoord).g;
    float b = texture2D(u_image, v_texCoord - direction * u_amount * 0.01).b;
    float a = texture2D(u_image, v_texCoord).a;
    
    gl_FragColor = vec4(r, g, b, a);
  }
`;

// Fragment shader for Color Correction
export const colorCorrectionShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_brightness;
  uniform float u_contrast;
  uniform float u_saturation;
  uniform float u_hue;
  uniform float u_exposure;
  uniform float u_temperature;
  uniform float u_tint;
  varying vec2 v_texCoord;
  
  // RGB to HSV conversion
  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }
  
  // HSV to RGB conversion
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }
  
  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // Exposure
    color.rgb *= pow(2.0, u_exposure);
    
    // Brightness
    color.rgb += u_brightness;
    
    // Contrast
    color.rgb = (color.rgb - 0.5) * (1.0 + u_contrast) + 0.5;
    
    // Temperature (warm/cool)
    color.r += u_temperature * 0.1;
    color.b -= u_temperature * 0.1;
    
    // Tint (magenta/green)
    color.g += u_tint * 0.1;
    
    // Saturation and Hue (via HSV)
    vec3 hsv = rgb2hsv(color.rgb);
    hsv.x += u_hue / 360.0;
    hsv.y *= (1.0 + u_saturation);
    color.rgb = hsv2rgb(hsv);
    
    gl_FragColor = clamp(color, 0.0, 1.0);
  }
`;

// Fragment shader for Distortion
export const distortionShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_amount;
  uniform int u_type; // 0=barrel, 1=pincushion, 2=wave, 3=ripple
  uniform float u_time;
  varying vec2 v_texCoord;
  
  void main() {
    vec2 coord = v_texCoord;
    vec2 center = vec2(0.5, 0.5);
    
    if (u_type == 0 || u_type == 1) {
      // Barrel/Pincushion distortion
      vec2 delta = coord - center;
      float dist = length(delta);
      float factor = u_type == 0 ? 
        1.0 + u_amount * dist * dist : 
        1.0 - u_amount * dist * dist;
      coord = center + delta * factor;
    } else if (u_type == 2) {
      // Wave distortion
      coord.x += sin(coord.y * 10.0 + u_time) * u_amount * 0.1;
      coord.y += cos(coord.x * 10.0 + u_time) * u_amount * 0.1;
    } else if (u_type == 3) {
      // Ripple distortion
      vec2 delta = coord - center;
      float dist = length(delta);
      float ripple = sin(dist * 20.0 - u_time * 5.0) * u_amount * 0.05;
      coord = center + delta * (1.0 + ripple);
    }
    
    gl_FragColor = texture2D(u_image, coord);
  }
`;

// 12. LUT (Look-Up Table) Shader
export const lutShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform sampler2D u_lut; // 3D LUT as 2D texture
  uniform float u_lutSize; // Size of the LUT (e.g., 32 for 32x32x32)
  uniform float u_intensity; // 0-1, blend amount
  varying vec2 v_texCoord;

  vec3 applyLUT(vec3 color, sampler2D lut, float size) {
    // Clamp color to 0-1
    color = clamp(color, 0.0, 1.0);
    
    // Calculate LUT coordinates
    float blueSlice = color.b * (size - 1.0);
    float blueSliceFloor = floor(blueSlice);
    float blueSliceCeil = ceil(blueSlice);
    float blueSliceFrac = blueSlice - blueSliceFloor;
    
    // Calculate 2D texture coordinates for 3D LUT
    // LUT is stored as horizontal slices
    vec2 lutCoord1 = vec2(
      (color.r * (size - 1.0) + blueSliceFloor * size) / (size * size),
      color.g
    );
    vec2 lutCoord2 = vec2(
      (color.r * (size - 1.0) + blueSliceCeil * size) / (size * size),
      color.g
    );
    
    // Sample LUT
    vec3 color1 = texture2D(lut, lutCoord1).rgb;
    vec3 color2 = texture2D(lut, lutCoord2).rgb;
    
    // Interpolate between slices
    return mix(color1, color2, blueSliceFrac);
  }

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    vec3 lutColor = applyLUT(color.rgb, u_lut, u_lutSize);
    vec3 finalColor = mix(color.rgb, lutColor, u_intensity);
    gl_FragColor = vec4(finalColor, color.a);
  }
`;

// Shader registry
export const shaderRegistry = {
  gaussianBlur: gaussianBlurShader,
  sharpen: sharpenShader,
  chromaKey: chromaKeyShader,
  vignette: vignetteShader,
  noise: noiseShader,
  pixelate: pixelateShader,
  edgeDetect: edgeDetectShader,
  bloom: bloomShader,
  chromaticAberration: chromaticAberrationShader,
  colorCorrection: colorCorrectionShader,
  distortion: distortionShader,
  lut: lutShader,
};

export type ShaderType = keyof typeof shaderRegistry;