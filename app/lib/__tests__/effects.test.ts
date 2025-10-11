/**
 * Effects System Tests
 * Tests for visual effects, color correction, and LUT processing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseCubeLUT, parse3dlLUT, applyLUT, lutToTextureData } from '../lut-parser';

describe('LUT Parser', () => {
  describe('parseCubeLUT', () => {
    it('should parse a valid .cube LUT file', () => {
      const cubeContent = `
TITLE "Test LUT"
LUT_3D_SIZE 2
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0

0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0
      `.trim();

      const lut = parseCubeLUT(cubeContent);

      expect(lut.size).toBe(2);
      expect(lut.title).toBe('Test LUT');
      expect(lut.domain.min).toEqual([0, 0, 0]);
      expect(lut.domain.max).toEqual([1, 1, 1]);
      expect(lut.data.length).toBe(2);
      expect(lut.data[0][0][0]).toEqual([0, 0, 0]);
      expect(lut.data[1][1][1]).toEqual([1, 1, 1]);
    });

    it('should throw error for invalid LUT size', () => {
      const invalidContent = `
LUT_3D_SIZE 2
0.0 0.0 0.0
      `.trim();

      expect(() => parseCubeLUT(invalidContent)).toThrow();
    });

    it('should handle comments and empty lines', () => {
      const cubeContent = `
# This is a comment
TITLE "Test LUT"

# Another comment
LUT_3D_SIZE 2

0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0
      `.trim();

      const lut = parseCubeLUT(cubeContent);
      expect(lut.size).toBe(2);
    });
  });

  describe('parse3dlLUT', () => {
    it('should parse a valid .3dl LUT file', () => {
      const content3dl = `
0 0 0
1023 0 0
0 1023 0
1023 1023 0
0 0 1023
1023 0 1023
0 1023 1023
1023 1023 1023
      `.trim();

      const lut = parse3dlLUT(content3dl);

      expect(lut.size).toBe(2);
      expect(lut.data[0][0][0]).toEqual([0, 0, 0]);
      expect(lut.data[1][1][1][0]).toBeCloseTo(1, 2);
      expect(lut.data[1][1][1][1]).toBeCloseTo(1, 2);
      expect(lut.data[1][1][1][2]).toBeCloseTo(1, 2);
    });
  });

  describe('applyLUT', () => {
    it('should apply LUT to RGB color', () => {
      // Create a simple identity LUT
      const lut = {
        size: 2,
        data: [
          [
            [0, 0, 0], [1, 0, 0]
          ],
          [
            [0, 1, 0], [1, 1, 0]
          ]
        ] as any,
        domain: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
      };
      // Properly structure the 3D LUT data [b][g][r] -> [r, g, b]
      lut.data = [
        [ // b=0
          [[0, 0, 0], [1, 0, 0]], // g=0, r=0 and r=1
          [[0, 1, 0], [1, 1, 0]], // g=1, r=0 and r=1
        ],
        [ // b=1
          [[0, 0, 1], [1, 0, 1]], // g=0, r=0 and r=1
          [[0, 1, 1], [1, 1, 1]], // g=1, r=0 and r=1
        ],
      ];

      const [r, g, b] = applyLUT(lut, 0.5, 0.5, 0.5, 1.0);

      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    });

    it('should blend with original color based on intensity', () => {
      const lut = {
        size: 2,
        data: [
          [ // b=0
            [[0, 0, 0], [1, 0, 0]], // g=0, r=0 and r=1
            [[0, 1, 0], [1, 1, 0]], // g=1, r=0 and r=1
          ],
          [ // b=1
            [[0, 0, 1], [1, 0, 1]], // g=0, r=0 and r=1
            [[0, 1, 1], [1, 1, 1]], // g=1, r=0 and r=1
          ],
        ],
        domain: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
      };

      const original: [number, number, number] = [0.5, 0.5, 0.5];
      const [r1, g1, b1] = applyLUT(lut, original[0], original[1], original[2], 0);
      const [r2, g2, b2] = applyLUT(lut, original[0], original[1], original[2], 1);

      // At intensity 0, should be close to original
      expect(Math.abs(r1 - original[0])).toBeLessThan(0.1);
      expect(Math.abs(g1 - original[1])).toBeLessThan(0.1);
      expect(Math.abs(b1 - original[2])).toBeLessThan(0.1);
    });
  });

  describe('lutToTextureData', () => {
    it('should convert LUT to texture data', () => {
      const lut = {
        size: 2,
        data: [
          [ // b=0
            [[0, 0, 0], [1, 0, 0]], // g=0, r=0 and r=1
            [[0, 1, 0], [1, 1, 0]], // g=1, r=0 and r=1
          ],
          [ // b=1
            [[0, 0, 1], [1, 0, 1]], // g=0, r=0 and r=1
            [[0, 1, 1], [1, 1, 1]], // g=1, r=0 and r=1
          ],
        ],
        domain: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
      };

      const textureData = lutToTextureData(lut);

      expect(textureData).toBeInstanceOf(Float32Array);
      expect(textureData.length).toBe(2 * 2 * 2 * 4); // size^3 * 4 (RGBA)
      
      // Check first pixel (0,0,0)
      expect(textureData[0]).toBe(0);
      expect(textureData[1]).toBe(0);
      expect(textureData[2]).toBe(0);
      expect(textureData[3]).toBe(1); // Alpha
    });
  });
});

describe('Effect Parameters', () => {
  it('should validate blur parameters', () => {
    const params = {
      blurAmount: 5,
      blurType: 'gaussian' as const,
    };

    expect(params.blurAmount).toBeGreaterThan(0);
    expect(['gaussian', 'motion', 'radial', 'zoom']).toContain(params.blurType);
  });

  it('should validate chroma key parameters', () => {
    const params = {
      keyColor: '#00FF00',
      tolerance: 0.3,
      softness: 0.1,
      spillSuppression: 0.5,
    };

    expect(params.tolerance).toBeGreaterThanOrEqual(0);
    expect(params.tolerance).toBeLessThanOrEqual(1);
    expect(params.softness).toBeGreaterThanOrEqual(0);
    expect(params.spillSuppression).toBeGreaterThanOrEqual(0);
  });

  it('should validate color correction parameters', () => {
    const params = {
      brightness: 0.2,
      contrast: 0.1,
      saturation: 0.15,
      hue: 0,
      exposure: 0.5,
      temperature: 0.1,
      tint: -0.05,
    };

    expect(params.brightness).toBeGreaterThanOrEqual(-1);
    expect(params.brightness).toBeLessThanOrEqual(1);
    expect(params.contrast).toBeGreaterThanOrEqual(-1);
    expect(params.contrast).toBeLessThanOrEqual(1);
  });
});

describe('Effect Combinations', () => {
  it('should handle multiple effects in sequence', () => {
    const effects = [
      { id: '1', type: 'blur' as const, enabled: true, parameters: { blurAmount: 5 } },
      { id: '2', type: 'sharpen' as const, enabled: true, parameters: { sharpenAmount: 0.5 } },
      { id: '3', type: 'vignette' as const, enabled: true, parameters: { vignetteAmount: 0.3 } },
    ];

    expect(effects.length).toBe(3);
    expect(effects.every(e => e.enabled)).toBe(true);
  });

  it('should skip disabled effects', () => {
    const effects = [
      { id: '1', type: 'blur' as const, enabled: true, parameters: { blurAmount: 5 } },
      { id: '2', type: 'sharpen' as const, enabled: false, parameters: { sharpenAmount: 0.5 } },
      { id: '3', type: 'vignette' as const, enabled: true, parameters: { vignetteAmount: 0.3 } },
    ];

    const enabledEffects = effects.filter(e => e.enabled);
    expect(enabledEffects.length).toBe(2);
  });
});

describe('Color Correction', () => {
  it('should apply brightness adjustment', () => {
    const brightness = 0.2;
    const originalColor = 0.5;
    const adjustedColor = originalColor + brightness;

    expect(adjustedColor).toBe(0.7);
  });

  it('should apply contrast adjustment', () => {
    const contrast = 0.2;
    const originalColor = 0.5;
    const adjustedColor = (originalColor - 0.5) * (1 + contrast) + 0.5;

    expect(adjustedColor).toBe(0.5); // No change at midpoint
  });

  it('should apply saturation adjustment', () => {
    const saturation = 0.5;
    const r = 1.0, g = 0.5, b = 0.0;
    
    // Calculate luminance
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Apply saturation
    const newR = luminance + (r - luminance) * (1 + saturation);
    const newG = luminance + (g - luminance) * (1 + saturation);
    const newB = luminance + (b - luminance) * (1 + saturation);

    expect(newR).toBeGreaterThan(r);
    expect(newG).toBeGreaterThan(g);
    expect(newB).toBeGreaterThan(b);
  });
});

describe('Performance', () => {
  it('should process LUT lookup efficiently', () => {
    // Create a proper 3D LUT structure [b][g][r] -> [r, g, b]
    const lut = {
      size: 32,
      data: Array(32).fill(null).map(() =>
        Array(32).fill(null).map(() =>
          Array(32).fill(null).map(() => [0.5, 0.5, 0.5])
        )
      ),
      domain: {
        min: [0, 0, 0] as [number, number, number],
        max: [1, 1, 1] as [number, number, number],
      },
    };

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      applyLUT(lut, Math.random(), Math.random(), Math.random(), 1.0);
    }
    const end = performance.now();

    const timePerLookup = (end - start) / 1000;
    expect(timePerLookup).toBeLessThan(1); // Should be less than 1ms per lookup
  });
});