/**
 * LUT (Look-Up Table) Parser
 * Supports .cube and .3dl formats
 */

export interface LUTData {
  size: number;
  data: number[][][][]; // 4D array [b][g][r] -> [r, g, b]
  title?: string;
  domain: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

/**
 * Parse a .cube LUT file
 * Format: Adobe Cube LUT format
 */
export function parseCubeLUT(content: string): LUTData {
  const lines = content.split('\n').map(line => line.trim());
  
  let size = 0;
  let title: string | undefined;
  let domainMin: [number, number, number] = [0, 0, 0];
  let domainMax: [number, number, number] = [1, 1, 1];
  const values: number[][] = [];

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      continue;
    }

    // Parse title
    if (line.startsWith('TITLE')) {
      title = line.substring(5).trim().replace(/"/g, '');
      continue;
    }

    // Parse LUT size
    if (line.startsWith('LUT_3D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1]);
      continue;
    }

    // Parse domain min
    if (line.startsWith('DOMAIN_MIN')) {
      const parts = line.split(/\s+/);
      domainMin = [
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3]),
      ];
      continue;
    }

    // Parse domain max
    if (line.startsWith('DOMAIN_MAX')) {
      const parts = line.split(/\s+/);
      domainMax = [
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3]),
      ];
      continue;
    }

    // Parse RGB values
    const parts = line.split(/\s+/);
    if (parts.length === 3) {
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        values.push([r, g, b]);
      }
    }
  }

  if (size === 0) {
    throw new Error('Invalid LUT file: LUT_3D_SIZE not found');
  }

  if (values.length !== size * size * size) {
    throw new Error(`Invalid LUT file: Expected ${size * size * size} values, got ${values.length}`);
  }

  // Convert flat array to 4D array [b][g][r] -> [r, g, b]
  const data: number[][][][] = [];
  let index = 0;

  for (let b = 0; b < size; b++) {
    data[b] = [];
    for (let g = 0; g < size; g++) {
      data[b][g] = [];
      for (let r = 0; r < size; r++) {
        data[b][g][r] = values[index];
        index++;
      }
    }
  }

  return {
    size,
    data,
    title,
    domain: {
      min: domainMin,
      max: domainMax,
    },
  };
}

/**
 * Parse a .3dl LUT file
 * Format: Autodesk 3D LUT format
 */
export function parse3dlLUT(content: string): LUTData {
  const lines = content.split('\n').map(line => line.trim());
  
  const values: number[][] = [];
  let size = 0;

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      continue;
    }

    // Parse RGB values (0-1023 range in 3dl format)
    const parts = line.split(/\s+/);
    if (parts.length === 3) {
      const r = parseInt(parts[0]) / 1023;
      const g = parseInt(parts[1]) / 1023;
      const b = parseInt(parts[2]) / 1023;
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        values.push([r, g, b]);
      }
    }
  }

  // Determine size from number of values
  const totalValues = values.length;
  size = Math.round(Math.cbrt(totalValues));

  if (size * size * size !== totalValues) {
    throw new Error(`Invalid 3DL file: Cannot determine cube size from ${totalValues} values`);
  }

  // Convert flat array to 4D array [b][g][r] -> [r, g, b]
  const data: number[][][][] = [];
  let index = 0;

  for (let b = 0; b < size; b++) {
    data[b] = [];
    for (let g = 0; g < size; g++) {
      data[b][g] = [];
      for (let r = 0; r < size; r++) {
        data[b][g][r] = values[index];
        index++;
      }
    }
  }

  return {
    size,
    data,
    domain: {
      min: [0, 0, 0],
      max: [1, 1, 1],
    },
  };
}

/**
 * Apply LUT to RGB color
 */
export function applyLUT(
  lut: LUTData,
  r: number,
  g: number,
  b: number,
  intensity: number = 1.0
): [number, number, number] {
  const { size, data, domain } = lut;

  // Normalize input to 0-1 range based on domain
  const rNorm = (r - domain.min[0]) / (domain.max[0] - domain.min[0]);
  const gNorm = (g - domain.min[1]) / (domain.max[1] - domain.min[1]);
  const bNorm = (b - domain.min[2]) / (domain.max[2] - domain.min[2]);

  // Clamp to 0-1
  const rClamped = Math.max(0, Math.min(1, rNorm));
  const gClamped = Math.max(0, Math.min(1, gNorm));
  const bClamped = Math.max(0, Math.min(1, bNorm));

  // Convert to LUT coordinates
  const rIndex = rClamped * (size - 1);
  const gIndex = gClamped * (size - 1);
  const bIndex = bClamped * (size - 1);

  // Get integer and fractional parts for trilinear interpolation
  const r0 = Math.floor(rIndex);
  const g0 = Math.floor(gIndex);
  const b0 = Math.floor(bIndex);
  const r1 = Math.min(r0 + 1, size - 1);
  const g1 = Math.min(g0 + 1, size - 1);
  const b1 = Math.min(b0 + 1, size - 1);

  const rFrac = rIndex - r0;
  const gFrac = gIndex - g0;
  const bFrac = bIndex - b0;

  // Trilinear interpolation
  const c000 = data[b0][g0][r0];
  const c001 = data[b0][g0][r1];
  const c010 = data[b0][g1][r0];
  const c011 = data[b0][g1][r1];
  const c100 = data[b1][g0][r0];
  const c101 = data[b1][g0][r1];
  const c110 = data[b1][g1][r0];
  const c111 = data[b1][g1][r1];

  const c00 = lerp3(c000, c001, rFrac);
  const c01 = lerp3(c010, c011, rFrac);
  const c10 = lerp3(c100, c101, rFrac);
  const c11 = lerp3(c110, c111, rFrac);

  const c0 = lerp3(c00, c01, gFrac);
  const c1 = lerp3(c10, c11, gFrac);

  const result = lerp3(c0, c1, bFrac);

  // Apply intensity (blend with original)
  const finalR = r + (result[0] - r) * intensity;
  const finalG = g + (result[1] - g) * intensity;
  const finalB = b + (result[2] - b) * intensity;

  return [finalR, finalG, finalB];
}

/**
 * Linear interpolation for 3-component vectors
 */
function lerp3(a: number[], b: number[], t: number): number[] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/**
 * Parse LUT file based on extension
 */
export function parseLUT(filename: string, content: string): LUTData {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'cube':
      return parseCubeLUT(content);
    case '3dl':
      return parse3dlLUT(content);
    default:
      throw new Error(`Unsupported LUT format: ${ext}`);
  }
}

/**
 * Convert LUT data to WebGL texture data (flat Float32Array)
 */
export function lutToTextureData(lut: LUTData): Float32Array {
  const { size, data } = lut;
  const textureData = new Float32Array(size * size * size * 4); // RGBA

  let index = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rgb = data[b][g][r];
        textureData[index++] = rgb[0];
        textureData[index++] = rgb[1];
        textureData[index++] = rgb[2];
        textureData[index++] = 1.0; // Alpha
      }
    }
  }

  return textureData;
}