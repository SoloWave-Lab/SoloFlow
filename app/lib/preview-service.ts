/**
 * Preview Generation Service
 * Handles generation of before/after previews for effects and AI features
 */

import { db } from './db.server';
import { VideoProcessingService } from './video-processing';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// ============================================
// TYPES
// ============================================

export interface PreviewOptions {
  width?: number;
  height?: number;
  quality?: 'low' | 'medium' | 'high';
  format?: 'png' | 'jpg' | 'webp';
}

export interface BeforeAfterPreview {
  before: string;
  after: string;
  sideBySide?: string;
}

// ============================================
// PREVIEW SERVICE
// ============================================

export class PreviewService {
  /**
   * Generate preview for project at specific timestamp
   */
  static async generatePreview(
    projectId: string,
    timestamp: number,
    options?: PreviewOptions
  ): Promise<string> {
    const opts = {
      width: options?.width || 1920,
      height: options?.height || 1080,
      quality: options?.quality || 'medium',
      format: options?.format || 'png'
    };

    // Get project data
    const projectResult = await db.query(`
      SELECT * FROM projects WHERE id = $1
    `, [projectId]);

    if (projectResult.rows.length === 0) {
      throw new Error('Project not found');
    }

    // Get all scrubbers at this timestamp
    const scrubbersResult = await db.query(`
      SELECT * FROM scrubbers
      WHERE project_id = $1
        AND start_time <= $2
        AND (start_time + duration) >= $2
      ORDER BY track_index, start_time
    `, [projectId, timestamp]);

    const scrubbers = scrubbersResult.rows;

    if (scrubbers.length === 0) {
      throw new Error('No content at this timestamp');
    }

    // Generate preview using first scrubber
    const scrubber = scrubbers[0];
    const localTime = timestamp - scrubber.start_time;

    const tempDir = os.tmpdir();
    const previewPath = path.join(tempDir, `preview_${projectId}_${timestamp}.${opts.format}`);

    await VideoProcessingService.generateThumbnail(
      scrubber.asset_url,
      previewPath,
      localTime
    );

    return previewPath;
  }

  /**
   * Generate before/after preview for color correction
   */
  static async generateColorCorrectionPreview(
    scrubberId: string,
    timestamp: number,
    options?: PreviewOptions
  ): Promise<BeforeAfterPreview> {
    // Get scrubber data
    const scrubberResult = await db.query(`
      SELECT * FROM scrubbers WHERE id = $1
    `, [scrubberId]);

    if (scrubberResult.rows.length === 0) {
      throw new Error('Scrubber not found');
    }

    const scrubber = scrubberResult.rows[0];

    // Get color correction settings
    const colorResult = await db.query(`
      SELECT * FROM auto_color_correction WHERE scrubber_id = $1
    `, [scrubberId]);

    const tempDir = os.tmpdir();

    // Generate "before" preview
    const beforePath = path.join(tempDir, `before_${scrubberId}_${timestamp}.png`);
    await VideoProcessingService.generateThumbnail(
      scrubber.asset_url,
      beforePath,
      timestamp
    );

    // Generate "after" preview
    const afterPath = path.join(tempDir, `after_${scrubberId}_${timestamp}.png`);
    
    if (colorResult.rows.length > 0) {
      const correction = colorResult.rows[0].correction_data || {};
      
      // Apply color correction
      await VideoProcessingService.applyColorCorrection(
        scrubber.asset_url,
        afterPath,
        correction
      );
    } else {
      // No correction, copy before
      fs.copyFileSync(beforePath, afterPath);
    }

    // Generate side-by-side preview
    const sideBySidePath = await this.createSideBySidePreview(beforePath, afterPath);

    return {
      before: beforePath,
      after: afterPath,
      sideBySide: sideBySidePath
    };
  }

  /**
   * Generate before/after preview for background removal
   */
  static async generateBackgroundRemovalPreview(
    scrubberId: string,
    timestamp: number,
    options?: PreviewOptions
  ): Promise<BeforeAfterPreview> {
    // Get scrubber data
    const scrubberResult = await db.query(`
      SELECT * FROM scrubbers WHERE id = $1
    `, [scrubberId]);

    if (scrubberResult.rows.length === 0) {
      throw new Error('Scrubber not found');
    }

    const scrubber = scrubberResult.rows[0];

    // Get background removal data
    const bgRemovalResult = await db.query(`
      SELECT * FROM background_removal WHERE scrubber_id = $1
    `, [scrubberId]);

    const tempDir = os.tmpdir();

    // Generate "before" preview
    const beforePath = path.join(tempDir, `before_bg_${scrubberId}_${timestamp}.png`);
    await VideoProcessingService.generateThumbnail(
      scrubber.asset_url,
      beforePath,
      timestamp
    );

    // Generate "after" preview
    const afterPath = path.join(tempDir, `after_bg_${scrubberId}_${timestamp}.png`);
    
    if (bgRemovalResult.rows.length > 0 && bgRemovalResult.rows[0].mask_data) {
      // Apply mask to remove background
      const maskUrl = bgRemovalResult.rows[0].mask_data;
      
      // Download mask and apply
      // This would use the mask to create transparency
      // For now, just copy the before image
      fs.copyFileSync(beforePath, afterPath);
    } else {
      fs.copyFileSync(beforePath, afterPath);
    }

    // Generate side-by-side preview
    const sideBySidePath = await this.createSideBySidePreview(beforePath, afterPath);

    return {
      before: beforePath,
      after: afterPath,
      sideBySide: sideBySidePath
    };
  }

  /**
   * Generate preview for mask
   */
  static async generateMaskPreview(
    maskId: string,
    timestamp: number,
    options?: PreviewOptions
  ): Promise<BeforeAfterPreview> {
    const { MaskRenderingService } = await import('./mask-rendering');

    // Get mask data
    const maskResult = await db.query(`
      SELECT * FROM masks WHERE id = $1
    `, [maskId]);

    if (maskResult.rows.length === 0) {
      throw new Error('Mask not found');
    }

    const mask = maskResult.rows[0];

    // Get scrubber data
    const scrubberResult = await db.query(`
      SELECT * FROM scrubbers WHERE id = $1
    `, [mask.scrubber_id]);

    if (scrubberResult.rows.length === 0) {
      throw new Error('Scrubber not found');
    }

    const scrubber = scrubberResult.rows[0];

    const tempDir = os.tmpdir();

    // Generate "before" preview (original video frame)
    const beforePath = path.join(tempDir, `before_mask_${maskId}_${timestamp}.png`);
    await VideoProcessingService.generateThumbnail(
      scrubber.asset_url,
      beforePath,
      timestamp
    );

    // Generate "after" preview (with mask applied)
    const afterPath = await MaskRenderingService.generatePreview(
      maskId,
      scrubber.asset_url,
      timestamp
    );

    // Generate side-by-side preview
    const sideBySidePath = await this.createSideBySidePreview(beforePath, afterPath);

    return {
      before: beforePath,
      after: afterPath,
      sideBySide: sideBySidePath
    };
  }

  /**
   * Generate preview for adjustment layer
   */
  static async generateAdjustmentLayerPreview(
    layerId: string,
    timestamp: number,
    options?: PreviewOptions
  ): Promise<BeforeAfterPreview> {
    // Get adjustment layer data
    const layerResult = await db.query(`
      SELECT * FROM adjustment_layers WHERE id = $1
    `, [layerId]);

    if (layerResult.rows.length === 0) {
      throw new Error('Adjustment layer not found');
    }

    const layer = layerResult.rows[0];

    // Get project data to find affected scrubbers
    const scrubbersResult = await db.query(`
      SELECT * FROM scrubbers
      WHERE project_id = $1
        AND track_index = $2
        AND start_time <= $3
        AND (start_time + duration) >= $3
      ORDER BY start_time
      LIMIT 1
    `, [layer.project_id, layer.track_index, timestamp]);

    if (scrubbersResult.rows.length === 0) {
      throw new Error('No content under adjustment layer at this timestamp');
    }

    const scrubber = scrubbersResult.rows[0];
    const localTime = timestamp - scrubber.start_time;

    const tempDir = os.tmpdir();

    // Generate "before" preview
    const beforePath = path.join(tempDir, `before_adj_${layerId}_${timestamp}.png`);
    await VideoProcessingService.generateThumbnail(
      scrubber.asset_url,
      beforePath,
      localTime
    );

    // Generate "after" preview with color correction
    const afterPath = path.join(tempDir, `after_adj_${layerId}_${timestamp}.png`);
    
    const corrections = {
      brightness: layer.brightness,
      contrast: layer.contrast,
      saturation: layer.saturation,
      hue: layer.hue,
      gamma: layer.gamma
    };

    await VideoProcessingService.applyColorCorrection(
      scrubber.asset_url,
      afterPath,
      corrections
    );

    // Generate side-by-side preview
    const sideBySidePath = await this.createSideBySidePreview(beforePath, afterPath);

    return {
      before: beforePath,
      after: afterPath,
      sideBySide: sideBySidePath
    };
  }

  /**
   * Generate preview for smart crop
   */
  static async generateSmartCropPreview(
    scrubberId: string,
    timestamp: number,
    options?: PreviewOptions
  ): Promise<BeforeAfterPreview> {
    // Get scrubber data
    const scrubberResult = await db.query(`
      SELECT * FROM scrubbers WHERE id = $1
    `, [scrubberId]);

    if (scrubberResult.rows.length === 0) {
      throw new Error('Scrubber not found');
    }

    const scrubber = scrubberResult.rows[0];

    // Get smart crop data
    const cropResult = await db.query(`
      SELECT * FROM smart_crop WHERE scrubber_id = $1
    `, [scrubberId]);

    const tempDir = os.tmpdir();

    // Generate "before" preview
    const beforePath = path.join(tempDir, `before_crop_${scrubberId}_${timestamp}.png`);
    await VideoProcessingService.generateThumbnail(
      scrubber.asset_url,
      beforePath,
      timestamp
    );

    // Generate "after" preview with crop applied
    const afterPath = path.join(tempDir, `after_crop_${scrubberId}_${timestamp}.png`);
    
    if (cropResult.rows.length > 0 && cropResult.rows[0].crop_data) {
      const cropData = cropResult.rows[0].crop_data;
      
      // Apply crop using FFmpeg
      const cropFilter = `crop=${cropData.width}:${cropData.height}:${cropData.x}:${cropData.y}`;
      await VideoProcessingService.applyFilter(
        scrubber.asset_url,
        afterPath,
        cropFilter
      );
    } else {
      fs.copyFileSync(beforePath, afterPath);
    }

    // Generate side-by-side preview
    const sideBySidePath = await this.createSideBySidePreview(beforePath, afterPath);

    return {
      before: beforePath,
      after: afterPath,
      sideBySide: sideBySidePath
    };
  }

  /**
   * Create side-by-side comparison image
   */
  private static async createSideBySidePreview(
    beforePath: string,
    afterPath: string
  ): Promise<string> {
    const { createCanvas, loadImage } = await import('canvas');

    // Load images
    const beforeImage = await loadImage(beforePath);
    const afterImage = await loadImage(afterPath);

    // Create canvas
    const width = beforeImage.width + afterImage.width + 20; // 20px gap
    const height = Math.max(beforeImage.height, afterImage.height);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw before image
    ctx.drawImage(beforeImage, 0, 0);

    // Draw "BEFORE" label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('BEFORE', 10, 30);

    // Draw after image
    ctx.drawImage(afterImage, beforeImage.width + 20, 0);

    // Draw "AFTER" label
    ctx.fillText('AFTER', beforeImage.width + 30, 30);

    // Save to file
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `comparison_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    return outputPath;
  }

  /**
   * Generate thumbnail grid for timeline
   */
  static async generateThumbnailGrid(
    projectId: string,
    count: number = 10
  ): Promise<string[]> {
    // Get project duration
    const projectResult = await db.query(`
      SELECT duration FROM projects WHERE id = $1
    `, [projectId]);

    if (projectResult.rows.length === 0) {
      throw new Error('Project not found');
    }

    const duration = projectResult.rows[0].duration;
    const interval = duration / count;

    const thumbnails: string[] = [];

    for (let i = 0; i < count; i++) {
      const timestamp = i * interval;
      const thumbnail = await this.generatePreview(projectId, timestamp);
      thumbnails.push(thumbnail);
    }

    return thumbnails;
  }

  /**
   * Generate waveform preview for audio
   */
  static async generateWaveformPreview(
    audioFilePath: string,
    width: number = 1920,
    height: number = 200
  ): Promise<string> {
    const { createCanvas } = await import('canvas');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Extract audio data using FFmpeg
    const tempDir = os.tmpdir();
    const dataPath = path.join(tempDir, `audio_data_${Date.now()}.txt`);

    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    await execAsync(
      `${ffmpegPath} -i "${audioFilePath}" -af "aformat=channel_layouts=mono,showwavespic=s=${width}x${height}" -frames:v 1 "${dataPath}"`
    );

    return dataPath;
  }

  /**
   * Cleanup temporary preview files
   */
  static async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Failed to cleanup file ${filePath}:`, error);
      }
    }
  }

  /**
   * Get preview URL for serving
   */
  static getPreviewURL(filePath: string): string {
    // Convert file path to URL
    // This would depend on your server setup
    const filename = path.basename(filePath);
    return `/api/previews/${filename}`;
  }
}