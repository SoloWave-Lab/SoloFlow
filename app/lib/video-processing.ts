/**
 * Video Processing Service
 * Handles video rendering, encoding, and FFmpeg operations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { db } from './db.server';

const execAsync = promisify(exec);

// ============================================
// TYPES
// ============================================

export interface RenderOptions {
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: string;
  format: string;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  format: string;
}

// ============================================
// VIDEO PROCESSING SERVICE
// ============================================

export class VideoProcessingService {
  private static ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  private static ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';

  /**
   * Get video metadata using FFprobe
   */
  static async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    try {
      const { stdout } = await execAsync(
        `${this.ffprobePath} -v quiet -print_format json -show_format -show_streams "${videoPath}"`
      );

      const data = JSON.parse(stdout);
      const videoStream = data.streams.find((s: any) => s.codec_type === 'video');

      if (!videoStream) {
        throw new Error('No video stream found');
      }

      return {
        duration: parseFloat(data.format.duration),
        width: videoStream.width,
        height: videoStream.height,
        fps: eval(videoStream.r_frame_rate), // e.g., "30/1" -> 30
        codec: videoStream.codec_name,
        bitrate: parseInt(data.format.bit_rate),
        format: data.format.format_name
      };
    } catch (error) {
      console.error('Failed to get video metadata:', error);
      throw new Error('Failed to analyze video file');
    }
  }

  /**
   * Extract audio from video
   */
  static async extractAudio(
    videoPath: string,
    outputPath: string
  ): Promise<string> {
    try {
      await execAsync(
        `${this.ffmpegPath} -i "${videoPath}" -vn -acodec libmp3lame -q:a 2 "${outputPath}"`
      );
      return outputPath;
    } catch (error) {
      console.error('Failed to extract audio:', error);
      throw new Error('Failed to extract audio from video');
    }
  }

  /**
   * Generate video thumbnail
   */
  static async generateThumbnail(
    videoPath: string,
    outputPath: string,
    timestamp: number = 0
  ): Promise<string> {
    try {
      await execAsync(
        `${this.ffmpegPath} -i "${videoPath}" -ss ${timestamp} -vframes 1 -q:v 2 "${outputPath}"`
      );
      return outputPath;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      throw new Error('Failed to generate video thumbnail');
    }
  }

  /**
   * Trim video
   */
  static async trimVideo(
    videoPath: string,
    outputPath: string,
    startTime: number,
    duration: number
  ): Promise<string> {
    try {
      await execAsync(
        `${this.ffmpegPath} -i "${videoPath}" -ss ${startTime} -t ${duration} -c copy "${outputPath}"`
      );
      return outputPath;
    } catch (error) {
      console.error('Failed to trim video:', error);
      throw new Error('Failed to trim video');
    }
  }

  /**
   * Concatenate videos
   */
  static async concatenateVideos(
    videoPaths: string[],
    outputPath: string
  ): Promise<string> {
    try {
      // Create concat file
      const concatFile = path.join(path.dirname(outputPath), 'concat.txt');
      const concatContent = videoPaths.map(p => `file '${p}'`).join('\n');
      fs.writeFileSync(concatFile, concatContent);

      await execAsync(
        `${this.ffmpegPath} -f concat -safe 0 -i "${concatFile}" -c copy "${outputPath}"`
      );

      // Clean up concat file
      fs.unlinkSync(concatFile);

      return outputPath;
    } catch (error) {
      console.error('Failed to concatenate videos:', error);
      throw new Error('Failed to concatenate videos');
    }
  }

  /**
   * Apply video filter
   */
  static async applyFilter(
    videoPath: string,
    outputPath: string,
    filter: string
  ): Promise<string> {
    try {
      await execAsync(
        `${this.ffmpegPath} -i "${videoPath}" -vf "${filter}" -c:a copy "${outputPath}"`
      );
      return outputPath;
    } catch (error) {
      console.error('Failed to apply filter:', error);
      throw new Error('Failed to apply video filter');
    }
  }

  /**
   * Overlay image on video
   */
  static async overlayImage(
    videoPath: string,
    imagePath: string,
    outputPath: string,
    x: number = 0,
    y: number = 0
  ): Promise<string> {
    try {
      await execAsync(
        `${this.ffmpegPath} -i "${videoPath}" -i "${imagePath}" -filter_complex "[0:v][1:v]overlay=${x}:${y}" -c:a copy "${outputPath}"`
      );
      return outputPath;
    } catch (error) {
      console.error('Failed to overlay image:', error);
      throw new Error('Failed to overlay image on video');
    }
  }

  /**
   * Add audio to video
   */
  static async addAudio(
    videoPath: string,
    audioPath: string,
    outputPath: string,
    volume: number = 1.0
  ): Promise<string> {
    try {
      await execAsync(
        `${this.ffmpegPath} -i "${videoPath}" -i "${audioPath}" -filter_complex "[1:a]volume=${volume}[a1];[0:a][a1]amix=inputs=2:duration=first" -c:v copy "${outputPath}"`
      );
      return outputPath;
    } catch (error) {
      console.error('Failed to add audio:', error);
      throw new Error('Failed to add audio to video');
    }
  }

  /**
   * Change video speed
   */
  static async changeSpeed(
    videoPath: string,
    outputPath: string,
    speed: number
  ): Promise<string> {
    try {
      const videoSpeed = 1 / speed;
      const audioSpeed = speed;

      await execAsync(
        `${this.ffmpegPath} -i "${videoPath}" -filter_complex "[0:v]setpts=${videoSpeed}*PTS[v];[0:a]atempo=${audioSpeed}[a]" -map "[v]" -map "[a]" "${outputPath}"`
      );
      return outputPath;
    } catch (error) {
      console.error('Failed to change speed:', error);
      throw new Error('Failed to change video speed');
    }
  }

  /**
   * Apply color correction
   */
  static async applyColorCorrection(
    videoPath: string,
    outputPath: string,
    corrections: {
      brightness?: number;
      contrast?: number;
      saturation?: number;
      hue?: number;
      gamma?: number;
    }
  ): Promise<string> {
    try {
      const filters = [];

      if (corrections.brightness !== undefined) {
        filters.push(`eq=brightness=${corrections.brightness}`);
      }
      if (corrections.contrast !== undefined) {
        filters.push(`eq=contrast=${corrections.contrast}`);
      }
      if (corrections.saturation !== undefined) {
        filters.push(`eq=saturation=${corrections.saturation}`);
      }
      if (corrections.hue !== undefined) {
        filters.push(`hue=h=${corrections.hue}`);
      }
      if (corrections.gamma !== undefined) {
        filters.push(`eq=gamma=${corrections.gamma}`);
      }

      const filterString = filters.join(',');

      await execAsync(
        `${this.ffmpegPath} -i "${videoPath}" -vf "${filterString}" -c:a copy "${outputPath}"`
      );
      return outputPath;
    } catch (error) {
      console.error('Failed to apply color correction:', error);
      throw new Error('Failed to apply color correction');
    }
  }

  /**
   * Render project with all effects
   */
  static async renderProject(
    projectId: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<{ outputPath: string; duration: number; size: number }> {
    try {
      // Get project data
      const projectResult = await db.query(`
        SELECT * FROM projects WHERE id = $1
      `, [projectId]);

      if (projectResult.rows.length === 0) {
        throw new Error('Project not found');
      }

      const project = projectResult.rows[0];

      // Get all scrubbers (timeline items)
      const scrubbersResult = await db.query(`
        SELECT * FROM scrubbers WHERE project_id = $1 ORDER BY track_index, start_time
      `, [projectId]);

      const scrubbers = scrubbersResult.rows;

      // Get all masks
      const masksResult = await db.query(`
        SELECT * FROM masks WHERE project_id = $1
      `, [projectId]);

      const masks = masksResult.rows;

      // Get all adjustment layers
      const adjustmentLayersResult = await db.query(`
        SELECT * FROM adjustment_layers WHERE project_id = $1 ORDER BY track_index
      `, [projectId]);

      const adjustmentLayers = adjustmentLayersResult.rows;

      // Build FFmpeg filter complex
      const filterComplex = this.buildFilterComplex(scrubbers, masks, adjustmentLayers);

      // Execute render
      const renderCommand = `${this.ffmpegPath} ${filterComplex} -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k "${outputPath}"`;

      // Execute with progress tracking
      const process = exec(renderCommand);

      let lastProgress = 0;
      process.stderr?.on('data', (data: string) => {
        // Parse FFmpeg progress
        const timeMatch = data.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch && onProgress) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseFloat(timeMatch[3]);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          const progress = Math.min(95, (currentTime / project.duration) * 100);
          
          if (progress > lastProgress + 5) {
            lastProgress = progress;
            onProgress(progress);
          }
        }
      });

      await new Promise((resolve, reject) => {
        process.on('close', (code) => {
          if (code === 0) resolve(null);
          else reject(new Error(`FFmpeg exited with code ${code}`));
        });
      });

      if (onProgress) onProgress(100);

      // Get output file stats
      const stats = fs.statSync(outputPath);
      const metadata = await this.getVideoMetadata(outputPath);

      return {
        outputPath,
        duration: metadata.duration,
        size: stats.size
      };
    } catch (error) {
      console.error('Failed to render project:', error);
      throw new Error('Failed to render project');
    }
  }

  /**
   * Build FFmpeg filter complex from project data
   */
  private static buildFilterComplex(
    scrubbers: any[],
    masks: any[],
    adjustmentLayers: any[]
  ): string {
    const inputs: string[] = [];
    const filters: string[] = [];

    // Add video inputs
    scrubbers.forEach((scrubber, index) => {
      inputs.push(`-i "${scrubber.asset_url}"`);
      
      // Apply transformations
      let filter = `[${index}:v]`;
      
      // Scale
      if (scrubber.scale_x !== 1 || scrubber.scale_y !== 1) {
        filter += `scale=iw*${scrubber.scale_x}:ih*${scrubber.scale_y},`;
      }
      
      // Rotate
      if (scrubber.rotation !== 0) {
        filter += `rotate=${scrubber.rotation * Math.PI / 180}:c=none:ow=rotw(${scrubber.rotation * Math.PI / 180}):oh=roth(${scrubber.rotation * Math.PI / 180}),`;
      }
      
      // Position
      filter += `setpts=PTS-STARTPTS+${scrubber.start_time}/TB[v${index}]`;
      
      filters.push(filter);
    });

    // Apply masks
    masks.forEach((mask, index) => {
      if (mask.enabled) {
        // Generate mask filter based on type
        const maskFilter = this.generateMaskFilter(mask);
        filters.push(maskFilter);
      }
    });

    // Apply adjustment layers
    adjustmentLayers.forEach((layer, index) => {
      const layerFilter = this.generateAdjustmentLayerFilter(layer);
      filters.push(layerFilter);
    });

    // Overlay all videos
    let overlayFilter = '[v0]';
    for (let i = 1; i < scrubbers.length; i++) {
      overlayFilter += `[v${i}]overlay=x=${scrubbers[i].position_x}:y=${scrubbers[i].position_y}`;
      if (i < scrubbers.length - 1) {
        overlayFilter += `[tmp${i}];[tmp${i}]`;
      }
    }

    filters.push(overlayFilter);

    // Combine inputs and filters
    return `${inputs.join(' ')} -filter_complex "${filters.join(';')}"`;
  }

  /**
   * Generate mask filter
   */
  private static generateMaskFilter(mask: any): string {
    switch (mask.mask_type) {
      case 'rectangle':
        return `drawbox=x=${mask.x}:y=${mask.y}:w=${mask.width}:h=${mask.height}:color=white:t=fill`;
      case 'ellipse':
        return `geq=lum='if(hypot(X-${mask.x + mask.width/2},Y-${mask.y + mask.height/2})<${mask.width/2},255,0)'`;
      case 'polygon':
        // Complex polygon mask using multiple drawbox commands
        return `drawbox=...`; // Simplified
      default:
        return '';
    }
  }

  /**
   * Generate adjustment layer filter
   */
  private static generateAdjustmentLayerFilter(layer: any): string {
    const filters = [];

    if (layer.brightness !== 0) {
      filters.push(`eq=brightness=${layer.brightness}`);
    }
    if (layer.contrast !== 1) {
      filters.push(`eq=contrast=${layer.contrast}`);
    }
    if (layer.saturation !== 1) {
      filters.push(`eq=saturation=${layer.saturation}`);
    }

    return filters.join(',');
  }

  /**
   * Convert video format
   */
  static async convertFormat(
    inputPath: string,
    outputPath: string,
    format: string,
    options?: RenderOptions
  ): Promise<string> {
    try {
      const opts = options || {
        width: 1920,
        height: 1080,
        fps: 30,
        codec: 'libx264',
        bitrate: '5000k',
        format: 'mp4',
        quality: 'medium'
      };

      await execAsync(
        `${this.ffmpegPath} -i "${inputPath}" -s ${opts.width}x${opts.height} -r ${opts.fps} -c:v ${opts.codec} -b:v ${opts.bitrate} -f ${format} "${outputPath}"`
      );

      return outputPath;
    } catch (error) {
      console.error('Failed to convert format:', error);
      throw new Error('Failed to convert video format');
    }
  }
}