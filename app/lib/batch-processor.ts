/**
 * Batch Processor
 * 
 * Processes multiple clips with effects in batch mode.
 * Provides progress tracking, parallel processing, and error handling.
 */

import { getGPUAccelerator } from './gpu-accelerator';
import type { ShaderType } from './shaders/effect-shaders';

export interface BatchJob {
  id: string;
  clipId: string;
  clipName: string;
  effects: Array<{
    type: ShaderType;
    uniforms: Record<string, number | number[]>;
  }>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface BatchProcessOptions {
  parallel: boolean;
  maxParallel: number;
  onProgress?: (job: BatchJob) => void;
  onComplete?: (job: BatchJob) => void;
  onError?: (job: BatchJob, error: Error) => void;
}

export class BatchProcessor {
  private jobs: Map<string, BatchJob> = new Map();
  private processing = false;
  private currentJobs: Set<string> = new Set();

  /**
   * Add job to batch queue
   */
  addJob(
    clipId: string,
    clipName: string,
    effects: Array<{ type: ShaderType; uniforms: Record<string, number | number[]> }>
  ): string {
    const job: BatchJob = {
      id: this.generateId(),
      clipId,
      clipName,
      effects,
      status: 'pending',
      progress: 0,
    };

    this.jobs.set(job.id, job);
    return job.id;
  }

  /**
   * Add multiple jobs
   */
  addJobs(
    clips: Array<{
      clipId: string;
      clipName: string;
      effects: Array<{ type: ShaderType; uniforms: Record<string, number | number[]> }>;
    }>
  ): string[] {
    return clips.map(clip => this.addJob(clip.clipId, clip.clipName, clip.effects));
  }

  /**
   * Process all jobs
   */
  async processAll(options: BatchProcessOptions = { parallel: true, maxParallel: 3 }): Promise<void> {
    if (this.processing) {
      throw new Error('Batch processing already in progress');
    }

    this.processing = true;
    const pendingJobs = Array.from(this.jobs.values()).filter(j => j.status === 'pending');

    try {
      if (options.parallel) {
        await this.processParallel(pendingJobs, options);
      } else {
        await this.processSequential(pendingJobs, options);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process jobs in parallel
   */
  private async processParallel(jobs: BatchJob[], options: BatchProcessOptions): Promise<void> {
    const maxParallel = options.maxParallel || 3;
    const queue = [...jobs];
    const processing: Promise<void>[] = [];

    while (queue.length > 0 || processing.length > 0) {
      // Start new jobs up to maxParallel
      while (processing.length < maxParallel && queue.length > 0) {
        const job = queue.shift()!;
        const promise = this.processJob(job, options).finally(() => {
          const index = processing.indexOf(promise);
          if (index > -1) {
            processing.splice(index, 1);
          }
        });
        processing.push(promise);
      }

      // Wait for at least one job to complete
      if (processing.length > 0) {
        await Promise.race(processing);
      }
    }
  }

  /**
   * Process jobs sequentially
   */
  private async processSequential(jobs: BatchJob[], options: BatchProcessOptions): Promise<void> {
    for (const job of jobs) {
      await this.processJob(job, options);
    }
  }

  /**
   * Process single job
   */
  private async processJob(job: BatchJob, options: BatchProcessOptions): Promise<void> {
    try {
      // Update status
      job.status = 'processing';
      job.startTime = Date.now();
      job.progress = 0;
      this.currentJobs.add(job.id);

      // Get GPU accelerator
      const gpu = getGPUAccelerator();
      if (!gpu.isAvailable()) {
        await gpu.initialize();
      }

      // Simulate processing (in real implementation, this would process actual video frames)
      // For now, we'll just simulate progress
      const totalSteps = 100;
      for (let i = 0; i <= totalSteps; i++) {
        job.progress = (i / totalSteps) * 100;
        
        if (options.onProgress) {
          options.onProgress(job);
        }

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Mark as completed
      job.status = 'completed';
      job.progress = 100;
      job.endTime = Date.now();
      this.currentJobs.delete(job.id);

      if (options.onComplete) {
        options.onComplete(job);
      }
    } catch (error) {
      // Mark as failed
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = Date.now();
      this.currentJobs.delete(job.id);

      if (options.onError) {
        options.onError(job, error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') {
      return false;
    }

    job.status = 'failed';
    job.error = 'Cancelled by user';
    return true;
  }

  /**
   * Cancel all pending jobs
   */
  cancelAll(): number {
    let cancelled = 0;
    this.jobs.forEach(job => {
      if (job.status === 'pending') {
        job.status = 'failed';
        job.error = 'Cancelled by user';
        cancelled++;
      }
    });
    return cancelled;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): BatchJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: BatchJob['status']): BatchJob[] {
    return Array.from(this.jobs.values()).filter(j => j.status === status);
  }

  /**
   * Get batch statistics
   */
  getStatistics(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    progress: number;
    estimatedTimeRemaining: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const total = jobs.length;
    const pending = jobs.filter(j => j.status === 'pending').length;
    const processing = jobs.filter(j => j.status === 'processing').length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const failed = jobs.filter(j => j.status === 'failed').length;

    // Calculate overall progress
    const totalProgress = jobs.reduce((sum, job) => sum + job.progress, 0);
    const progress = total > 0 ? totalProgress / total : 0;

    // Estimate time remaining
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.startTime && j.endTime);
    const avgTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => sum + (j.endTime! - j.startTime!), 0) / completedJobs.length
      : 0;
    const estimatedTimeRemaining = (pending + processing) * avgTime;

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      progress,
      estimatedTimeRemaining,
    };
  }

  /**
   * Clear completed jobs
   */
  clearCompleted(): number {
    let cleared = 0;
    this.jobs.forEach((job, id) => {
      if (job.status === 'completed') {
        this.jobs.delete(id);
        cleared++;
      }
    });
    return cleared;
  }

  /**
   * Clear all jobs
   */
  clearAll(): void {
    this.jobs.clear();
    this.currentJobs.clear();
  }

  /**
   * Retry failed jobs
   */
  retryFailed(): string[] {
    const failedJobs = this.getJobsByStatus('failed');
    failedJobs.forEach(job => {
      job.status = 'pending';
      job.progress = 0;
      job.error = undefined;
      job.startTime = undefined;
      job.endTime = undefined;
    });
    return failedJobs.map(j => j.id);
  }

  /**
   * Is processing
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export batch results
   */
  exportResults(): string {
    const jobs = Array.from(this.jobs.values());
    const stats = this.getStatistics();

    return JSON.stringify({
      statistics: stats,
      jobs: jobs.map(job => ({
        id: job.id,
        clipId: job.clipId,
        clipName: job.clipName,
        status: job.status,
        progress: job.progress,
        error: job.error,
        duration: job.startTime && job.endTime ? job.endTime - job.startTime : null,
      })),
      timestamp: Date.now(),
    }, null, 2);
  }
}

/**
 * Singleton instance
 */
let batchProcessorInstance: BatchProcessor | null = null;

/**
 * Get batch processor instance
 */
export function getBatchProcessor(): BatchProcessor {
  if (!batchProcessorInstance) {
    batchProcessorInstance = new BatchProcessor();
  }
  return batchProcessorInstance;
}