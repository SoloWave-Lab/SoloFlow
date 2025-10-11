/**
 * Effect Presets Manager
 * 
 * Manages effect presets for saving, loading, importing, and exporting effect configurations.
 * Provides a library of pre-made effect combinations and user-created presets.
 */

export interface EffectPreset {
  id: string;
  name: string;
  description: string;
  category: 'color' | 'blur' | 'distortion' | 'artistic' | 'custom';
  effects: Array<{
    type: string;
    parameters: Record<string, any>;
    enabled: boolean;
  }>;
  thumbnail?: string;
  author?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isBuiltIn: boolean;
}

export class EffectPresetsManager {
  private presets: Map<string, EffectPreset> = new Map();
  private builtInPresets: EffectPreset[] = [];

  constructor() {
    this.initializeBuiltInPresets();
  }

  /**
   * Initialize built-in presets
   */
  private initializeBuiltInPresets(): void {
    this.builtInPresets = [
      // Color Grading Presets
      {
        id: 'preset_cinematic_warm',
        name: 'Cinematic Warm',
        description: 'Warm, cinematic color grading with enhanced contrast',
        category: 'color',
        effects: [
          {
            type: 'colorCorrection',
            parameters: {
              temperature: 0.2,
              tint: -0.05,
              contrast: 0.15,
              saturation: 0.1,
              exposure: 0.05,
            },
            enabled: true,
          },
          {
            type: 'vignette',
            parameters: {
              amount: 0.3,
              size: 0.7,
              softness: 0.5,
            },
            enabled: true,
          },
        ],
        tags: ['cinematic', 'warm', 'film', 'color grading'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBuiltIn: true,
      },
      {
        id: 'preset_cinematic_cool',
        name: 'Cinematic Cool',
        description: 'Cool, moody color grading with blue tones',
        category: 'color',
        effects: [
          {
            type: 'colorCorrection',
            parameters: {
              temperature: -0.2,
              tint: 0.05,
              contrast: 0.2,
              saturation: -0.1,
              exposure: -0.05,
            },
            enabled: true,
          },
          {
            type: 'vignette',
            parameters: {
              amount: 0.4,
              size: 0.6,
              softness: 0.6,
            },
            enabled: true,
          },
        ],
        tags: ['cinematic', 'cool', 'moody', 'blue'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBuiltIn: true,
      },
      {
        id: 'preset_vintage',
        name: 'Vintage Film',
        description: 'Classic vintage film look with grain and faded colors',
        category: 'color',
        effects: [
          {
            type: 'colorCorrection',
            parameters: {
              contrast: -0.1,
              saturation: -0.2,
              exposure: 0.1,
            },
            enabled: true,
          },
          {
            type: 'noise',
            parameters: {
              amount: 0.15,
              time: 0,
            },
            enabled: true,
          },
          {
            type: 'vignette',
            parameters: {
              amount: 0.5,
              size: 0.5,
              softness: 0.7,
            },
            enabled: true,
          },
        ],
        tags: ['vintage', 'retro', 'film', 'grain'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBuiltIn: true,
      },

      // Blur Presets
      {
        id: 'preset_soft_focus',
        name: 'Soft Focus',
        description: 'Gentle blur for dreamy, soft-focus effect',
        category: 'blur',
        effects: [
          {
            type: 'gaussianBlur',
            parameters: {
              blurAmount: 2.0,
            },
            enabled: true,
          },
        ],
        tags: ['blur', 'soft', 'dreamy'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBuiltIn: true,
      },
      {
        id: 'preset_tilt_shift',
        name: 'Tilt-Shift',
        description: 'Miniature effect with selective blur',
        category: 'blur',
        effects: [
          {
            type: 'gaussianBlur',
            parameters: {
              blurAmount: 5.0,
            },
            enabled: true,
          },
          {
            type: 'colorCorrection',
            parameters: {
              saturation: 0.3,
              contrast: 0.2,
            },
            enabled: true,
          },
        ],
        tags: ['tilt-shift', 'miniature', 'blur'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBuiltIn: true,
      },

      // Artistic Presets
      {
        id: 'preset_high_contrast_bw',
        name: 'High Contrast B&W',
        description: 'Dramatic black and white with high contrast',
        category: 'artistic',
        effects: [
          {
            type: 'colorCorrection',
            parameters: {
              saturation: -1.0,
              contrast: 0.4,
              brightness: 0.05,
            },
            enabled: true,
          },
        ],
        tags: ['black and white', 'contrast', 'dramatic'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBuiltIn: true,
      },
      {
        id: 'preset_glow',
        name: 'Ethereal Glow',
        description: 'Soft glow effect for magical atmosphere',
        category: 'artistic',
        effects: [
          {
            type: 'bloom',
            parameters: {
              threshold: 0.6,
              intensity: 1.5,
            },
            enabled: true,
          },
          {
            type: 'colorCorrection',
            parameters: {
              exposure: 0.1,
              saturation: 0.2,
            },
            enabled: true,
          },
        ],
        tags: ['glow', 'bloom', 'magical', 'ethereal'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBuiltIn: true,
      },
      {
        id: 'preset_edge_enhance',
        name: 'Edge Enhancement',
        description: 'Sharpen and enhance edges for crisp details',
        category: 'artistic',
        effects: [
          {
            type: 'sharpen',
            parameters: {
              amount: 1.5,
            },
            enabled: true,
          },
          {
            type: 'colorCorrection',
            parameters: {
              contrast: 0.15,
            },
            enabled: true,
          },
        ],
        tags: ['sharpen', 'enhance', 'crisp'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBuiltIn: true,
      },

      // Distortion Presets
      {
        id: 'preset_chromatic',
        name: 'Chromatic Aberration',
        description: 'RGB split effect for stylized look',
        category: 'distortion',
        effects: [
          {
            type: 'chromaticAberration',
            parameters: {
              amount: 3.0,
            },
            enabled: true,
          },
        ],
        tags: ['chromatic', 'rgb split', 'glitch'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBuiltIn: true,
      },
      {
        id: 'preset_pixelate',
        name: 'Pixel Art',
        description: 'Retro pixel art effect',
        category: 'distortion',
        effects: [
          {
            type: 'pixelate',
            parameters: {
              pixelSize: 8.0,
            },
            enabled: true,
          },
          {
            type: 'colorCorrection',
            parameters: {
              saturation: 0.2,
              contrast: 0.1,
            },
            enabled: true,
          },
        ],
        tags: ['pixel', 'retro', '8-bit'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBuiltIn: true,
      },
    ];

    // Load built-in presets
    this.builtInPresets.forEach(preset => {
      this.presets.set(preset.id, preset);
    });
  }

  /**
   * Get all presets
   */
  getAllPresets(): EffectPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category: EffectPreset['category']): EffectPreset[] {
    return Array.from(this.presets.values()).filter(p => p.category === category);
  }

  /**
   * Get preset by ID
   */
  getPreset(id: string): EffectPreset | null {
    return this.presets.get(id) || null;
  }

  /**
   * Search presets
   */
  searchPresets(query: string): EffectPreset[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.presets.values()).filter(preset =>
      preset.name.toLowerCase().includes(lowerQuery) ||
      preset.description.toLowerCase().includes(lowerQuery) ||
      preset.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Create custom preset
   */
  createPreset(preset: Omit<EffectPreset, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>): EffectPreset {
    const newPreset: EffectPreset = {
      ...preset,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBuiltIn: false,
    };

    this.presets.set(newPreset.id, newPreset);
    return newPreset;
  }

  /**
   * Update preset
   */
  updatePreset(id: string, updates: Partial<Omit<EffectPreset, 'id' | 'createdAt' | 'isBuiltIn'>>): EffectPreset | null {
    const preset = this.presets.get(id);
    if (!preset || preset.isBuiltIn) {
      return null;
    }

    const updatedPreset: EffectPreset = {
      ...preset,
      ...updates,
      updatedAt: Date.now(),
    };

    this.presets.set(id, updatedPreset);
    return updatedPreset;
  }

  /**
   * Delete preset
   */
  deletePreset(id: string): boolean {
    const preset = this.presets.get(id);
    if (!preset || preset.isBuiltIn) {
      return false;
    }

    return this.presets.delete(id);
  }

  /**
   * Export preset to JSON
   */
  exportPreset(id: string): string | null {
    const preset = this.presets.get(id);
    if (!preset) {
      return null;
    }

    return JSON.stringify(preset, null, 2);
  }

  /**
   * Export all presets
   */
  exportAllPresets(): string {
    const customPresets = Array.from(this.presets.values()).filter(p => !p.isBuiltIn);
    return JSON.stringify(customPresets, null, 2);
  }

  /**
   * Import preset from JSON
   */
  importPreset(json: string): EffectPreset | null {
    try {
      const preset = JSON.parse(json) as EffectPreset;
      
      // Generate new ID to avoid conflicts
      const newPreset: EffectPreset = {
        ...preset,
        id: this.generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBuiltIn: false,
      };

      this.presets.set(newPreset.id, newPreset);
      return newPreset;
    } catch (error) {
      console.error('Failed to import preset:', error);
      return null;
    }
  }

  /**
   * Import multiple presets
   */
  importPresets(json: string): EffectPreset[] {
    try {
      const presets = JSON.parse(json) as EffectPreset[];
      const imported: EffectPreset[] = [];

      presets.forEach(preset => {
        const newPreset: EffectPreset = {
          ...preset,
          id: this.generateId(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isBuiltIn: false,
        };

        this.presets.set(newPreset.id, newPreset);
        imported.push(newPreset);
      });

      return imported;
    } catch (error) {
      console.error('Failed to import presets:', error);
      return [];
    }
  }

  /**
   * Duplicate preset
   */
  duplicatePreset(id: string, newName?: string): EffectPreset | null {
    const preset = this.presets.get(id);
    if (!preset) {
      return null;
    }

    const duplicated: EffectPreset = {
      ...preset,
      id: this.generateId(),
      name: newName || `${preset.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBuiltIn: false,
    };

    this.presets.set(duplicated.id, duplicated);
    return duplicated;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Singleton instance
 */
let presetsManagerInstance: EffectPresetsManager | null = null;

/**
 * Get effect presets manager instance
 */
export function getEffectPresetsManager(): EffectPresetsManager {
  if (!presetsManagerInstance) {
    presetsManagerInstance = new EffectPresetsManager();
  }
  return presetsManagerInstance;
}