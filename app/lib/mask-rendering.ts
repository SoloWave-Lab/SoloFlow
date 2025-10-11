/**
 * Mask Rendering Service
 * Handles mask rendering with keyframe animation support
 */

import { db } from './db.server';
import type { Mask } from '../components/timeline/advanced-types';

// ============================================
// TYPES
// ============================================

export interface MaskKeyframe {
  time: number;
  properties: Partial<Mask>;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
  bezierPoints?: [number, number, number, number];
}

export interface AnimatedMask extends Mask {
  keyframes: MaskKeyframe[];
}

export interface MaskRenderOptions {
  width: number;
  height: number;
  fps: number;
  duration: number;
}

// ============================================
// MASK ANIMATION SERVICE
// ============================================

export class MaskAnimationService {
  /**
   * Add keyframe to mask
   */
  static async addKeyframe(
    maskId: string,
    time: number,
    properties: Partial<Mask>,
    easing: MaskKeyframe['easing'] = 'linear'
  ): Promise<void> {
    await db.query(`
      INSERT INTO mask_keyframes (mask_id, time, properties, easing)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (mask_id, time) DO UPDATE SET
        properties = EXCLUDED.properties,
        easing = EXCLUDED.easing
    `, [maskId, time, JSON.stringify(properties), easing]);
  }

  /**
   * Get all keyframes for a mask
   */
  static async getKeyframes(maskId: string): Promise<MaskKeyframe[]> {
    const result = await db.query(`
      SELECT time, properties, easing, bezier_points
      FROM mask_keyframes
      WHERE mask_id = $1
      ORDER BY time ASC
    `, [maskId]);

    return result.rows.map(row => ({
      time: row.time,
      properties: row.properties,
      easing: row.easing,
      bezierPoints: row.bezier_points
    }));
  }

  /**
   * Delete keyframe
   */
  static async deleteKeyframe(maskId: string, time: number): Promise<void> {
    await db.query(`
      DELETE FROM mask_keyframes
      WHERE mask_id = $1 AND time = $2
    `, [maskId, time]);
  }

  /**
   * Interpolate mask properties at specific time
   */
  static interpolateMask(
    mask: AnimatedMask,
    time: number
  ): Mask {
    if (mask.keyframes.length === 0) {
      return mask;
    }

    // Find surrounding keyframes
    let prevKeyframe: MaskKeyframe | null = null;
    let nextKeyframe: MaskKeyframe | null = null;

    for (let i = 0; i < mask.keyframes.length; i++) {
      const kf = mask.keyframes[i];
      
      if (kf.time <= time) {
        prevKeyframe = kf;
      }
      
      if (kf.time >= time && !nextKeyframe) {
        nextKeyframe = kf;
        break;
      }
    }

    // If before first keyframe or after last keyframe
    if (!prevKeyframe) {
      return { ...mask, ...nextKeyframe!.properties };
    }
    if (!nextKeyframe) {
      return { ...mask, ...prevKeyframe.properties };
    }

    // If exactly on a keyframe
    if (prevKeyframe.time === time) {
      return { ...mask, ...prevKeyframe.properties };
    }

    // Interpolate between keyframes
    const t = (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);
    const easedT = this.applyEasing(t, prevKeyframe.easing || 'linear', prevKeyframe.bezierPoints);

    const interpolated: Partial<Mask> = {};

    // Interpolate numeric properties
    const numericProps = ['feather', 'opacity', 'expansion'];
    for (const prop of numericProps) {
      const prevVal = (prevKeyframe.properties as any)[prop];
      const nextVal = (nextKeyframe.properties as any)[prop];
      
      if (prevVal !== undefined && nextVal !== undefined) {
        (interpolated as any)[prop] = this.lerp(prevVal, nextVal, easedT);
      }
    }

    // Interpolate shape properties
    if (prevKeyframe.properties.shape && nextKeyframe.properties.shape) {
      interpolated.shape = {
        x: this.lerp(prevKeyframe.properties.shape.x, nextKeyframe.properties.shape.x, easedT),
        y: this.lerp(prevKeyframe.properties.shape.y, nextKeyframe.properties.shape.y, easedT),
        width: this.lerp(prevKeyframe.properties.shape.width, nextKeyframe.properties.shape.width, easedT),
        height: this.lerp(prevKeyframe.properties.shape.height, nextKeyframe.properties.shape.height, easedT),
        rotation: this.lerp(prevKeyframe.properties.shape.rotation, nextKeyframe.properties.shape.rotation, easedT)
      };
    }

    // Interpolate points for polygon/bezier masks
    if (prevKeyframe.properties.points && nextKeyframe.properties.points) {
      const prevPoints = prevKeyframe.properties.points;
      const nextPoints = nextKeyframe.properties.points;
      
      if (prevPoints.length === nextPoints.length) {
        interpolated.points = prevPoints.map((prevPoint, i) => ({
          x: this.lerp(prevPoint.x, nextPoints[i].x, easedT),
          y: this.lerp(prevPoint.y, nextPoints[i].y, easedT)
        }));
      }
    }

    return { ...mask, ...interpolated };
  }

  /**
   * Linear interpolation
   */
  private static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Apply easing function
   */
  private static applyEasing(
    t: number,
    easing: MaskKeyframe['easing'],
    bezierPoints?: [number, number, number, number]
  ): number {
    switch (easing) {
      case 'linear':
        return t;
      
      case 'ease-in':
        return t * t;
      
      case 'ease-out':
        return t * (2 - t);
      
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      
      case 'bezier':
        if (bezierPoints) {
          return this.cubicBezier(t, bezierPoints);
        }
        return t;
      
      default:
        return t;
    }
  }

  /**
   * Cubic bezier easing
   */
  private static cubicBezier(
    t: number,
    [p1x, p1y, p2x, p2y]: [number, number, number, number]
  ): number {
    // Simplified cubic bezier calculation
    const cx = 3 * p1x;
    const bx = 3 * (p2x - p1x) - cx;
    const ax = 1 - cx - bx;

    const cy = 3 * p1y;
    const by = 3 * (p2y - p1y) - cy;
    const ay = 1 - cy - by;

    const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;

    // Binary search to find t for given x
    let t0 = 0;
    let t1 = 1;
    let t2 = t;

    for (let i = 0; i < 8; i++) {
      const x2 = sampleCurveX(t2) - t;
      if (Math.abs(x2) < 0.001) break;
      
      const d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
      if (Math.abs(d2) < 0.000001) break;
      
      t2 -= x2 / d2;
    }

    return sampleCurveY(t2);
  }
}

// ============================================
// MASK RENDERING SERVICE
// ============================================

export class MaskRenderingService {
  /**
   * Render mask to video
   */
  static async renderMask(
    maskId: string,
    videoFilePath: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<{ outputPath: string; duration: number }> {
    // Get mask data
    const maskResult = await db.query(`
      SELECT * FROM masks WHERE id = $1
    `, [maskId]);

    if (maskResult.rows.length === 0) {
      throw new Error('Mask not found');
    }

    const maskData = maskResult.rows[0];

    // Get keyframes
    const keyframes = await MaskAnimationService.getKeyframes(maskId);

    const animatedMask: AnimatedMask = {
      id: maskData.id,
      type: maskData.mask_type,
      enabled: maskData.enabled,
      inverted: maskData.inverted,
      feather: maskData.feather,
      opacity: maskData.opacity,
      expansion: maskData.expansion,
      shape: maskData.x !== null ? {
        x: maskData.x,
        y: maskData.y,
        width: maskData.width,
        height: maskData.height,
        rotation: maskData.rotation
      } : undefined,
      points: maskData.points || [],
      keyframes
    };

    // Get video metadata
    const { VideoProcessingService } = await import('./video-processing');
    const metadata = await VideoProcessingService.getVideoMetadata(videoFilePath);

    // Render mask frame by frame
    const fps = metadata.fps;
    const duration = metadata.duration;
    const totalFrames = Math.ceil(duration * fps);

    // Generate mask frames
    const maskFrames: string[] = [];
    
    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / fps;
      const interpolatedMask = MaskAnimationService.interpolateMask(animatedMask, time);
      
      // Generate mask image for this frame
      const maskImagePath = await this.generateMaskImage(
        interpolatedMask,
        metadata.width,
        metadata.height,
        frame
      );
      
      maskFrames.push(maskImagePath);

      if (onProgress) {
        onProgress((frame / totalFrames) * 90);
      }
    }

    // Apply mask to video using FFmpeg
    const result = await this.applyMaskToVideo(
      videoFilePath,
      maskFrames,
      outputPath,
      fps
    );

    if (onProgress) {
      onProgress(100);
    }

    // Cleanup temporary mask frames
    for (const framePath of maskFrames) {
      try {
        const fs = await import('fs');
        fs.unlinkSync(framePath);
      } catch (error) {
        console.error('Failed to cleanup mask frame:', error);
      }
    }

    return result;
  }

  /**
   * Generate mask image for a single frame
   */
  private static async generateMaskImage(
    mask: Mask,
    width: number,
    height: number,
    frameNumber: number
  ): Promise<string> {
    const { createCanvas } = await import('canvas');
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.fillStyle = mask.inverted ? 'white' : 'black';
    ctx.fillRect(0, 0, width, height);

    // Set mask color
    ctx.fillStyle = mask.inverted ? 'black' : 'white';
    ctx.globalAlpha = mask.opacity;

    // Draw mask based on type
    switch (mask.type) {
      case 'rectangle':
        this.drawRectangleMask(ctx, mask, width, height);
        break;
      
      case 'ellipse':
        this.drawEllipseMask(ctx, mask, width, height);
        break;
      
      case 'polygon':
        this.drawPolygonMask(ctx, mask, width, height);
        break;
      
      case 'bezier':
        this.drawBezierMask(ctx, mask, width, height);
        break;
    }

    // Apply feather (blur)
    if (mask.feather > 0) {
      (ctx as any).filter = `blur(${mask.feather}px)`;
    }

    // Save to file
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const tempDir = os.tmpdir();
    const maskPath = path.join(tempDir, `mask_${mask.id}_${frameNumber}.png`);
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(maskPath, buffer);

    return maskPath;
  }

  /**
   * Draw rectangle mask
   */
  private static drawRectangleMask(
    ctx: any,
    mask: Mask,
    width: number,
    height: number
  ): void {
    if (!mask.shape) return;

    ctx.save();
    
    // Apply rotation
    const centerX = mask.shape.x + mask.shape.width / 2;
    const centerY = mask.shape.y + mask.shape.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((mask.shape.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    // Draw rectangle
    ctx.fillRect(
      mask.shape.x,
      mask.shape.y,
      mask.shape.width,
      mask.shape.height
    );

    ctx.restore();
  }

  /**
   * Draw ellipse mask
   */
  private static drawEllipseMask(
    ctx: any,
    mask: Mask,
    width: number,
    height: number
  ): void {
    if (!mask.shape) return;

    ctx.save();

    const centerX = mask.shape.x + mask.shape.width / 2;
    const centerY = mask.shape.y + mask.shape.height / 2;
    const radiusX = mask.shape.width / 2;
    const radiusY = mask.shape.height / 2;

    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY,
      radiusX,
      radiusY,
      (mask.shape.rotation * Math.PI) / 180,
      0,
      2 * Math.PI
    );
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw polygon mask
   */
  private static drawPolygonMask(
    ctx: any,
    mask: Mask,
    width: number,
    height: number
  ): void {
    if (!mask.points || mask.points.length < 3) return;

    ctx.beginPath();
    ctx.moveTo(mask.points[0].x, mask.points[0].y);

    for (let i = 1; i < mask.points.length; i++) {
      ctx.lineTo(mask.points[i].x, mask.points[i].y);
    }

    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draw bezier mask
   */
  private static drawBezierMask(
    ctx: any,
    mask: Mask,
    width: number,
    height: number
  ): void {
    if (!mask.points || mask.points.length < 4) return;

    ctx.beginPath();
    ctx.moveTo(mask.points[0].x, mask.points[0].y);

    for (let i = 1; i < mask.points.length; i += 3) {
      if (i + 2 < mask.points.length) {
        ctx.bezierCurveTo(
          mask.points[i].x, mask.points[i].y,
          mask.points[i + 1].x, mask.points[i + 1].y,
          mask.points[i + 2].x, mask.points[i + 2].y
        );
      }
    }

    ctx.closePath();
    ctx.fill();
  }

  /**
   * Apply mask frames to video
   */
  private static async applyMaskToVideo(
    videoPath: string,
    maskFrames: string[],
    outputPath: string,
    fps: number
  ): Promise<{ outputPath: string; duration: number }> {
    const { VideoProcessingService } = await import('./video-processing');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const path = await import('path');
    const fs = await import('fs');

    // Create concat file for mask frames
    const maskDir = path.dirname(maskFrames[0]);
    const maskPattern = path.join(maskDir, 'mask_%d.png');

    // Use FFmpeg to apply mask
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const command = `${ffmpegPath} -i "${videoPath}" -i "${maskPattern}" -filter_complex "[0:v][1:v]alphamerge" -c:v libx264 -preset medium -crf 23 "${outputPath}"`;

    await execAsync(command);

    const metadata = await VideoProcessingService.getVideoMetadata(outputPath);

    return {
      outputPath,
      duration: metadata.duration
    };
  }

  /**
   * Generate real-time mask preview
   */
  static async generatePreview(
    maskId: string,
    videoFilePath: string,
    timestamp: number
  ): Promise<string> {
    // Get mask data
    const maskResult = await db.query(`
      SELECT * FROM masks WHERE id = $1
    `, [maskId]);

    if (maskResult.rows.length === 0) {
      throw new Error('Mask not found');
    }

    const maskData = maskResult.rows[0];

    // Get keyframes and interpolate
    const keyframes = await MaskAnimationService.getKeyframes(maskId);
    const animatedMask: AnimatedMask = {
      id: maskData.id,
      type: maskData.mask_type,
      enabled: maskData.enabled,
      inverted: maskData.inverted,
      feather: maskData.feather,
      opacity: maskData.opacity,
      expansion: maskData.expansion,
      shape: maskData.x !== null ? {
        x: maskData.x,
        y: maskData.y,
        width: maskData.width,
        height: maskData.height,
        rotation: maskData.rotation
      } : undefined,
      points: maskData.points || [],
      keyframes
    };

    const interpolatedMask = MaskAnimationService.interpolateMask(animatedMask, timestamp);

    // Get video frame at timestamp
    const { VideoProcessingService } = await import('./video-processing');
    const path = await import('path');
    const os = await import('os');
    
    const tempDir = os.tmpdir();
    const framePath = path.join(tempDir, `frame_${Date.now()}.png`);
    
    await VideoProcessingService.generateThumbnail(videoFilePath, framePath, timestamp);

    // Get video metadata
    const metadata = await VideoProcessingService.getVideoMetadata(videoFilePath);

    // Generate mask image
    const maskImagePath = await this.generateMaskImage(
      interpolatedMask,
      metadata.width,
      metadata.height,
      0
    );

    // Composite frame with mask
    const outputPath = path.join(tempDir, `preview_${Date.now()}.png`);
    await VideoProcessingService.overlayImage(framePath, maskImagePath, outputPath);

    // Cleanup
    const fs = await import('fs');
    fs.unlinkSync(framePath);
    fs.unlinkSync(maskImagePath);

    return outputPath;
  }
}