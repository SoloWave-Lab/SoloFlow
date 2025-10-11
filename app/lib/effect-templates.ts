/**
 * Effect Templates Library
 * 
 * Pre-made effect combinations and templates for common video editing tasks.
 * Provides categorized templates with customizable parameters.
 */

import type { EffectPreset } from './effect-presets';

export interface EffectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'intro' | 'outro' | 'transition' | 'title' | 'lower-third' | 'overlay' | 'color-grade' | 'creative';
  thumbnail?: string;
  duration?: number; // seconds
  effects: Array<{
    type: string;
    parameters: Record<string, any>;
    enabled: boolean;
    startTime?: number;
    endTime?: number;
    keyframes?: Array<{
      time: number;
      parameters: Record<string, any>;
    }>;
  }>;
  animations?: Array<{
    property: string;
    from: any;
    to: any;
    duration: number;
    easing: string;
  }>;
  audio?: {
    track?: string;
    volume: number;
    fadeIn?: number;
    fadeOut?: number;
  };
  tags: string[];
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Effect Templates Manager
 */
export class EffectTemplatesManager {
  private templates: Map<string, EffectTemplate> = new Map();
  private builtInTemplates: EffectTemplate[] = [];

  constructor() {
    this.initializeBuiltInTemplates();
  }

  /**
   * Initialize built-in templates
   */
  private initializeBuiltInTemplates(): void {
    this.builtInTemplates = [
      // Intro Templates
      {
        id: 'template_fade_in_intro',
        name: 'Fade In Intro',
        description: 'Simple fade in from black with title',
        category: 'intro',
        duration: 3,
        effects: [
          {
            type: 'colorCorrection',
            parameters: { brightness: -1 },
            enabled: true,
            startTime: 0,
            endTime: 0,
          },
          {
            type: 'colorCorrection',
            parameters: { brightness: 0 },
            enabled: true,
            startTime: 2,
            endTime: 3,
          },
        ],
        animations: [
          {
            property: 'opacity',
            from: 0,
            to: 1,
            duration: 2,
            easing: 'ease-in',
          },
        ],
        tags: ['intro', 'fade', 'simple'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'template_zoom_intro',
        name: 'Zoom In Intro',
        description: 'Dynamic zoom in with blur effect',
        category: 'intro',
        duration: 4,
        effects: [
          {
            type: 'gaussianBlur',
            parameters: { blurAmount: 10 },
            enabled: true,
            startTime: 0,
            endTime: 0,
          },
          {
            type: 'gaussianBlur',
            parameters: { blurAmount: 0 },
            enabled: true,
            startTime: 2,
            endTime: 4,
          },
        ],
        animations: [
          {
            property: 'scale',
            from: 1.5,
            to: 1.0,
            duration: 3,
            easing: 'ease-out',
          },
        ],
        tags: ['intro', 'zoom', 'dynamic'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },

      // Outro Templates
      {
        id: 'template_fade_out_outro',
        name: 'Fade Out Outro',
        description: 'Smooth fade to black with credits',
        category: 'outro',
        duration: 3,
        effects: [
          {
            type: 'colorCorrection',
            parameters: { brightness: 0 },
            enabled: true,
            startTime: 0,
            endTime: 1,
          },
          {
            type: 'colorCorrection',
            parameters: { brightness: -1 },
            enabled: true,
            startTime: 2,
            endTime: 3,
          },
        ],
        animations: [
          {
            property: 'opacity',
            from: 1,
            to: 0,
            duration: 2,
            easing: 'ease-out',
          },
        ],
        tags: ['outro', 'fade', 'credits'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },

      // Transition Templates
      {
        id: 'template_cross_dissolve',
        name: 'Cross Dissolve',
        description: 'Classic cross dissolve transition',
        category: 'transition',
        duration: 1,
        effects: [
          {
            type: 'colorCorrection',
            parameters: { brightness: 0 },
            enabled: true,
          },
        ],
        animations: [
          {
            property: 'opacity',
            from: 1,
            to: 0,
            duration: 1,
            easing: 'linear',
          },
        ],
        tags: ['transition', 'dissolve', 'classic'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'template_wipe_transition',
        name: 'Wipe Transition',
        description: 'Directional wipe transition',
        category: 'transition',
        duration: 0.5,
        effects: [
          {
            type: 'colorCorrection',
            parameters: {},
            enabled: true,
          },
        ],
        animations: [
          {
            property: 'position.x',
            from: -1920,
            to: 0,
            duration: 0.5,
            easing: 'ease-in-out',
          },
        ],
        tags: ['transition', 'wipe', 'directional'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },

      // Title Templates
      {
        id: 'template_title_card',
        name: 'Title Card',
        description: 'Centered title with background',
        category: 'title',
        duration: 5,
        effects: [
          {
            type: 'vignette',
            parameters: { amount: 0.5, size: 0.6, softness: 0.5 },
            enabled: true,
          },
        ],
        animations: [
          {
            property: 'scale',
            from: 0.8,
            to: 1.0,
            duration: 0.5,
            easing: 'ease-out',
          },
          {
            property: 'opacity',
            from: 0,
            to: 1,
            duration: 0.5,
            easing: 'ease-in',
          },
        ],
        tags: ['title', 'card', 'centered'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },

      // Lower Third Templates
      {
        id: 'template_lower_third',
        name: 'Lower Third',
        description: 'Animated lower third with name and title',
        category: 'lower-third',
        duration: 8,
        effects: [
          {
            type: 'colorCorrection',
            parameters: {},
            enabled: true,
          },
        ],
        animations: [
          {
            property: 'position.x',
            from: -500,
            to: 50,
            duration: 0.5,
            easing: 'ease-out',
          },
        ],
        tags: ['lower-third', 'name', 'title'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },

      // Color Grade Templates
      {
        id: 'template_cinematic_teal_orange',
        name: 'Cinematic Teal & Orange',
        description: 'Popular teal and orange color grade',
        category: 'color-grade',
        effects: [
          {
            type: 'colorCorrection',
            parameters: {
              temperature: 0.15,
              tint: -0.1,
              contrast: 0.2,
              saturation: 0.15,
            },
            enabled: true,
          },
          {
            type: 'vignette',
            parameters: { amount: 0.3, size: 0.7, softness: 0.6 },
            enabled: true,
          },
        ],
        tags: ['color-grade', 'cinematic', 'teal', 'orange'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'template_vintage_film',
        name: 'Vintage Film Look',
        description: 'Retro film aesthetic with grain',
        category: 'color-grade',
        effects: [
          {
            type: 'colorCorrection',
            parameters: {
              contrast: -0.1,
              saturation: -0.3,
              exposure: 0.1,
            },
            enabled: true,
          },
          {
            type: 'noise',
            parameters: { amount: 0.2, time: 0 },
            enabled: true,
          },
          {
            type: 'vignette',
            parameters: { amount: 0.6, size: 0.5, softness: 0.7 },
            enabled: true,
          },
        ],
        tags: ['color-grade', 'vintage', 'film', 'retro'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },

      // Creative Templates
      {
        id: 'template_glitch_effect',
        name: 'Glitch Effect',
        description: 'Digital glitch with chromatic aberration',
        category: 'creative',
        duration: 0.2,
        effects: [
          {
            type: 'chromaticAberration',
            parameters: { amount: 5 },
            enabled: true,
          },
          {
            type: 'pixelate',
            parameters: { pixelSize: 4 },
            enabled: true,
          },
        ],
        animations: [
          {
            property: 'position.x',
            from: 0,
            to: 10,
            duration: 0.1,
            easing: 'linear',
          },
        ],
        tags: ['creative', 'glitch', 'digital'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'template_dream_sequence',
        name: 'Dream Sequence',
        description: 'Soft, dreamy effect with glow',
        category: 'creative',
        effects: [
          {
            type: 'gaussianBlur',
            parameters: { blurAmount: 1.5 },
            enabled: true,
          },
          {
            type: 'bloom',
            parameters: { threshold: 0.5, intensity: 1.2 },
            enabled: true,
          },
          {
            type: 'colorCorrection',
            parameters: { exposure: 0.15, saturation: 0.2 },
            enabled: true,
          },
        ],
        tags: ['creative', 'dream', 'soft', 'glow'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },

      // Overlay Templates
      {
        id: 'template_light_leak',
        name: 'Light Leak Overlay',
        description: 'Warm light leak effect',
        category: 'overlay',
        effects: [
          {
            type: 'bloom',
            parameters: { threshold: 0.3, intensity: 2.0 },
            enabled: true,
          },
          {
            type: 'colorCorrection',
            parameters: { temperature: 0.3, exposure: 0.2 },
            enabled: true,
          },
        ],
        tags: ['overlay', 'light-leak', 'warm'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    // Load built-in templates
    this.builtInTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Get all templates
   */
  getAllTemplates(): EffectTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: EffectTemplate['category']): EffectTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): EffectTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): EffectTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Create custom template
   */
  createTemplate(template: Omit<EffectTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>): EffectTemplate {
    const newTemplate: EffectTemplate = {
      ...template,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBuiltIn: false,
    };

    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  /**
   * Update template
   */
  updateTemplate(id: string, updates: Partial<Omit<EffectTemplate, 'id' | 'createdAt' | 'isBuiltIn'>>): EffectTemplate | null {
    const template = this.templates.get(id);
    if (!template || template.isBuiltIn) {
      return null;
    }

    const updatedTemplate: EffectTemplate = {
      ...template,
      ...updates,
      updatedAt: Date.now(),
    };

    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  /**
   * Delete template
   */
  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template || template.isBuiltIn) {
      return false;
    }

    return this.templates.delete(id);
  }

  /**
   * Export template
   */
  exportTemplate(id: string): string | null {
    const template = this.templates.get(id);
    if (!template) {
      return null;
    }

    return JSON.stringify(template, null, 2);
  }

  /**
   * Import template
   */
  importTemplate(json: string): EffectTemplate | null {
    try {
      const template = JSON.parse(json) as EffectTemplate;
      
      const newTemplate: EffectTemplate = {
        ...template,
        id: this.generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBuiltIn: false,
      };

      this.templates.set(newTemplate.id, newTemplate);
      return newTemplate;
    } catch (error) {
      console.error('Failed to import template:', error);
      return null;
    }
  }

  /**
   * Duplicate template
   */
  duplicateTemplate(id: string, newName?: string): EffectTemplate | null {
    const template = this.templates.get(id);
    if (!template) {
      return null;
    }

    const duplicated: EffectTemplate = {
      ...template,
      id: this.generateId(),
      name: newName || `${template.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBuiltIn: false,
    };

    this.templates.set(duplicated.id, duplicated);
    return duplicated;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get categories
   */
  getCategories(): Array<{ id: EffectTemplate['category']; name: string; count: number }> {
    const categories: EffectTemplate['category'][] = [
      'intro', 'outro', 'transition', 'title', 'lower-third', 'overlay', 'color-grade', 'creative'
    ];

    return categories.map(category => ({
      id: category,
      name: category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      count: this.getTemplatesByCategory(category).length,
    }));
  }
}

/**
 * Singleton instance
 */
let templatesManagerInstance: EffectTemplatesManager | null = null;

/**
 * Get effect templates manager instance
 */
export function getEffectTemplatesManager(): EffectTemplatesManager {
  if (!templatesManagerInstance) {
    templatesManagerInstance = new EffectTemplatesManager();
  }
  return templatesManagerInstance;
}