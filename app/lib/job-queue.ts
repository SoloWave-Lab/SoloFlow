/**
 * Background Job Processing System
 * Handles long-running AI and video processing tasks
 */

import { EventEmitter } from 'events';
import { db } from './db.server';

// ============================================
// TYPES
// ============================================

export type JobType =
  | 'auto-caption'
  | 'background-removal'
  | 'scene-detection'
  | 'color-correction'
  | 'smart-crop'
  | 'video-render'
  | 'mask-render'
  | 'preview-generation';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  projectId: string;
  userId: string;
  data: any;
  result?: any;
  error?: string;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface JobProgress {
  jobId: string;
  progress: number;
  message: string;
  data?: any;
}

// ============================================
// JOB QUEUE
// ============================================

export class JobQueue extends EventEmitter {
  private static instance: JobQueue;
  private jobs: Map<string, Job> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrent: number = 3;

  private constructor() {
    super();
    this.startProcessing();
  }

  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  /**
   * Add a new job to the queue
   */
  async addJob(
    type: JobType,
    projectId: string,
    userId: string,
    data: any
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: Job = {
      id: jobId,
      type,
      status: 'pending',
      projectId,
      userId,
      data,
      progress: 0,
      createdAt: new Date()
    };

    // Save to database
    await db.query(`
      INSERT INTO background_jobs (id, type, status, project_id, user_id, data, progress)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [jobId, type, 'pending', projectId, userId, JSON.stringify(data), 0]);

    this.jobs.set(jobId, job);
    this.emit('job:added', job);

    // Start processing if not at max capacity
    this.processNext();

    return jobId;
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<Job | null> {
    // Try memory first
    if (this.jobs.has(jobId)) {
      return this.jobs.get(jobId)!;
    }

    // Fallback to database
    const result = await db.query(`
      SELECT id, type, status, project_id, user_id, data, result, error, progress,
             created_at, started_at, completed_at
      FROM background_jobs
      WHERE id = $1
    `, [jobId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      projectId: row.project_id,
      userId: row.user_id,
      data: row.data,
      result: row.result,
      error: row.error,
      progress: row.progress,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at
    };
  }

  /**
   * Get all jobs for a project
   */
  async getProjectJobs(projectId: string): Promise<Job[]> {
    const result = await db.query(`
      SELECT id, type, status, project_id, user_id, data, result, error, progress,
             created_at, started_at, completed_at
      FROM background_jobs
      WHERE project_id = $1
      ORDER BY created_at DESC
    `, [projectId]);

    return result.rows.map(row => ({
      id: row.id,
      type: row.type,
      status: row.status,
      projectId: row.project_id,
      userId: row.user_id,
      data: row.data,
      result: row.result,
      error: row.error,
      progress: row.progress,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at
    }));
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number, message?: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = progress;
    }

    await db.query(`
      UPDATE background_jobs
      SET progress = $1, updated_at = NOW()
      WHERE id = $2
    `, [progress, jobId]);

    this.emit('job:progress', { jobId, progress, message });
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string, result: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.result = result;
      job.progress = 100;
      job.completedAt = new Date();
    }

    await db.query(`
      UPDATE background_jobs
      SET status = 'completed', result = $1, progress = 100, completed_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(result), jobId]);

    this.processing.delete(jobId);
    this.emit('job:completed', { jobId, result });

    // Process next job
    this.processNext();
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error;
      job.completedAt = new Date();
    }

    await db.query(`
      UPDATE background_jobs
      SET status = 'failed', error = $1, completed_at = NOW()
      WHERE id = $2
    `, [error, jobId]);

    this.processing.delete(jobId);
    this.emit('job:failed', { jobId, error });

    // Process next job
    this.processNext();
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'cancelled';
      job.completedAt = new Date();

      await db.query(`
        UPDATE background_jobs
        SET status = 'cancelled', completed_at = NOW()
        WHERE id = $1
      `, [jobId]);

      this.jobs.delete(jobId);
      this.emit('job:cancelled', { jobId });
    }
  }

  /**
   * Start processing jobs
   */
  private startProcessing(): void {
    setInterval(() => {
      this.processNext();
    }, 1000);
  }

  /**
   * Process next job in queue
   */
  private async processNext(): Promise<void> {
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    // Find next pending job
    const pendingJob = Array.from(this.jobs.values()).find(
      job => job.status === 'pending' && !this.processing.has(job.id)
    );

    if (!pendingJob) {
      return;
    }

    this.processing.add(pendingJob.id);
    pendingJob.status = 'processing';
    pendingJob.startedAt = new Date();

    await db.query(`
      UPDATE background_jobs
      SET status = 'processing', started_at = NOW()
      WHERE id = $1
    `, [pendingJob.id]);

    this.emit('job:started', pendingJob);

    // Process the job
    this.processJob(pendingJob).catch(error => {
      console.error(`Job ${pendingJob.id} failed:`, error);
      this.failJob(pendingJob.id, error.message);
    });
  }

  /**
   * Process a specific job
   */
  private async processJob(job: Job): Promise<void> {
    try {
      switch (job.type) {
        case 'auto-caption':
          await this.processAutoCaptionJob(job);
          break;
        case 'background-removal':
          await this.processBackgroundRemovalJob(job);
          break;
        case 'scene-detection':
          await this.processSceneDetectionJob(job);
          break;
        case 'color-correction':
          await this.processColorCorrectionJob(job);
          break;
        case 'smart-crop':
          await this.processSmartCropJob(job);
          break;
        case 'video-render':
          await this.processVideoRenderJob(job);
          break;
        case 'mask-render':
          await this.processMaskRenderJob(job);
          break;
        case 'preview-generation':
          await this.processPreviewGenerationJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error: any) {
      throw error;
    }
  }

  // ============================================
  // JOB PROCESSORS
  // ============================================

  private async processAutoCaptionJob(job: Job): Promise<void> {
    const { AutoCaptionsService } = await import('./ai-services');
    const { captionId, audioFilePath, model, language } = job.data;

    await this.updateProgress(job.id, 10, 'Starting transcription...');

    let result;
    switch (model) {
      case 'whisper':
        result = await AutoCaptionsService.generateWithWhisper(audioFilePath, language);
        break;
      case 'google':
        result = await AutoCaptionsService.generateWithGoogle(audioFilePath, language);
        break;
      case 'azure':
        result = await AutoCaptionsService.generateWithAzure(audioFilePath, language);
        break;
      case 'aws':
        result = await AutoCaptionsService.generateWithAWS(audioFilePath, language);
        break;
      default:
        throw new Error(`Unknown caption model: ${model}`);
    }

    await this.updateProgress(job.id, 90, 'Saving captions...');

    // Update caption in database
    const { AIRepository } = await import('./ai.repo');
    // Map segments to CaptionData format
    const captionData = result.segments.map((seg: any) => ({
      startTime: seg.start,
      endTime: seg.end,
      text: seg.text,
      confidence: seg.confidence
    }));
    await AIRepository.updateCaptionStatus(captionId, 'completed', captionData);

    await this.completeJob(job.id, result);
  }

  private async processBackgroundRemovalJob(job: Job): Promise<void> {
    const { BackgroundRemovalService } = await import('./ai-services');
    const { removalId, videoFilePath, model, quality } = job.data;

    await this.updateProgress(job.id, 10, 'Starting background removal...');

    let result;
    switch (model) {
      case 'u2net':
        result = await BackgroundRemovalService.removeWithU2Net(videoFilePath, quality);
        break;
      case 'modnet':
        result = await BackgroundRemovalService.removeWithMODNet(videoFilePath, quality);
        break;
      case 'backgroundmattingv2':
        result = await BackgroundRemovalService.removeWithBackgroundMattingV2(videoFilePath, quality);
        break;
      default:
        throw new Error(`Unknown background removal model: ${model}`);
    }

    await this.updateProgress(job.id, 90, 'Saving result...');

    // Update in database
    const { AIRepository } = await import('./ai.repo');
    await AIRepository.updateBackgroundRemoval(job.data.scrubberId, {
      status: 'completed',
      maskData: result.maskUrl
    });

    await this.completeJob(job.id, result);
  }

  private async processSceneDetectionJob(job: Job): Promise<void> {
    const { SceneDetectionService } = await import('./ai-services');
    const { detectionId, videoFilePath, sensitivity, minSceneDuration } = job.data;

    await this.updateProgress(job.id, 10, 'Analyzing video...');

    const result = await SceneDetectionService.detectScenes(
      videoFilePath,
      sensitivity,
      minSceneDuration
    );

    await this.updateProgress(job.id, 90, 'Saving scenes...');

    // Update in database
    const { AIRepository } = await import('./ai.repo');
    await AIRepository.updateSceneDetectionStatus(detectionId, 'completed', result.scenes);

    await this.completeJob(job.id, result);
  }

  private async processColorCorrectionJob(job: Job): Promise<void> {
    const { AutoColorCorrectionService } = await import('./ai-services');
    const { scrubberId, videoFilePath, style, intensity } = job.data;

    await this.updateProgress(job.id, 10, 'Analyzing colors...');

    const result = await AutoColorCorrectionService.autoCorrect(
      videoFilePath,
      style,
      intensity
    );

    await this.updateProgress(job.id, 90, 'Saving correction...');

    // Update in database
    const { AIRepository } = await import('./ai.repo');
    await AIRepository.updateAutoColorCorrection(scrubberId, {
      correctionData: result.correctionData,
      previews: {
        before: result.beforePreview,
        after: result.afterPreview
      }
    });

    await this.completeJob(job.id, result);
  }

  private async processSmartCropJob(job: Job): Promise<void> {
    const { SmartCropService } = await import('./ai-services');
    const { scrubberId, videoFilePath, aspectRatio, options } = job.data;

    await this.updateProgress(job.id, 10, 'Detecting content...');

    const result = await SmartCropService.smartCrop(
      videoFilePath,
      aspectRatio,
      options
    );

    await this.updateProgress(job.id, 90, 'Saving crop data...');

    // Update in database
    const { AIRepository } = await import('./ai.repo');
    await AIRepository.updateSmartCrop(scrubberId, {
      cropData: result.cropData
    });

    await this.completeJob(job.id, result);
  }

  private async processVideoRenderJob(job: Job): Promise<void> {
    const { VideoProcessingService } = await import('./video-processing');
    const { projectId, outputPath } = job.data;

    await this.updateProgress(job.id, 10, 'Preparing render...');

    const result = await VideoProcessingService.renderProject(
      projectId,
      outputPath,
      (progress) => this.updateProgress(job.id, progress, 'Rendering...')
    );

    await this.completeJob(job.id, result);
  }

  private async processMaskRenderJob(job: Job): Promise<void> {
    const { MaskRenderingService } = await import('./mask-rendering');
    const { maskId, videoFilePath, outputPath } = job.data;

    await this.updateProgress(job.id, 10, 'Rendering mask...');

    const result = await MaskRenderingService.renderMask(
      maskId,
      videoFilePath,
      outputPath,
      (progress) => this.updateProgress(job.id, progress, 'Processing...')
    );

    await this.completeJob(job.id, result);
  }

  private async processPreviewGenerationJob(job: Job): Promise<void> {
    const { PreviewService } = await import('./preview-service');
    const { projectId, timestamp } = job.data;

    await this.updateProgress(job.id, 50, 'Generating preview...');

    const result = await PreviewService.generatePreview(projectId, timestamp);

    await this.completeJob(job.id, result);
  }
}

// Export singleton instance
export const jobQueue = JobQueue.getInstance();