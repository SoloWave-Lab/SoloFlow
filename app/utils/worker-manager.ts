/**
 * Worker Manager
 * Manages Web Workers for video and audio processing
 */

type WorkerType = 'motion-tracking' | 'video-stabilization' | 'audio-processing';

interface WorkerPool {
  worker: Worker;
  busy: boolean;
  type: WorkerType;
}

class WorkerManager {
  private workers: Map<WorkerType, WorkerPool[]> = new Map();
  private maxWorkersPerType = 2;

  constructor() {
    this.initializeWorkers();
  }

  /**
   * Initialize worker pools
   */
  private initializeWorkers() {
    const workerTypes: WorkerType[] = [
      'motion-tracking',
      'video-stabilization',
      'audio-processing'
    ];

    for (const type of workerTypes) {
      this.workers.set(type, []);
    }
  }

  /**
   * Get or create a worker of specified type
   */
  private getWorker(type: WorkerType): Worker {
    const pool = this.workers.get(type) || [];

    // Find available worker
    const available = pool.find(w => !w.busy);
    if (available) {
      available.busy = true;
      return available.worker;
    }

    // Create new worker if under limit
    if (pool.length < this.maxWorkersPerType) {
      const worker = this.createWorker(type);
      const workerPool: WorkerPool = { worker, busy: true, type };
      pool.push(workerPool);
      this.workers.set(type, pool);
      return worker;
    }

    // Wait for available worker (return first one)
    pool[0].busy = true;
    return pool[0].worker;
  }

  /**
   * Create worker based on type
   */
  private createWorker(type: WorkerType): Worker {
    switch (type) {
      case 'motion-tracking':
        return new Worker(
          new URL('../workers/motion-tracking.worker.ts', import.meta.url),
          { type: 'module' }
        );
      case 'video-stabilization':
        return new Worker(
          new URL('../workers/video-stabilization.worker.ts', import.meta.url),
          { type: 'module' }
        );
      case 'audio-processing':
        return new Worker(
          new URL('../workers/audio-processing.worker.ts', import.meta.url),
          { type: 'module' }
        );
      default:
        throw new Error(`Unknown worker type: ${type}`);
    }
  }

  /**
   * Release worker back to pool
   */
  private releaseWorker(type: WorkerType, worker: Worker) {
    const pool = this.workers.get(type);
    if (pool) {
      const workerPool = pool.find(w => w.worker === worker);
      if (workerPool) {
        workerPool.busy = false;
      }
    }
  }

  /**
   * Execute task on worker
   */
  async executeTask<T, R>(type: WorkerType, data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      const worker = this.getWorker(type);

      const handleMessage = (e: MessageEvent<R>) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        this.releaseWorker(type, worker);
        resolve(e.data);
      };

      const handleError = (error: ErrorEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        this.releaseWorker(type, worker);
        reject(error);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      worker.postMessage(data);
    });
  }

  /**
   * Track motion points across frames
   */
  async trackMotion(
    prevFrame: ImageData,
    currentFrame: ImageData,
    points: Array<{ x: number; y: number }>
  ): Promise<Array<{ x: number; y: number; confidence: number }>> {
    const result = await this.executeTask<any, any>('motion-tracking', {
      type: 'track',
      prevFrame,
      currentFrame,
      points
    });
    return result.points;
  }

  /**
   * Stabilize video transforms
   */
  async stabilizeVideo(transforms: Array<{
    dx: number;
    dy: number;
    da: number;
    ds: number;
  }>): Promise<{
    smoothedTransforms: Array<{ dx: number; dy: number; da: number; ds: number }>;
    trajectory: Array<{ dx: number; dy: number; da: number; ds: number }>;
    smoothedTrajectory: Array<{ dx: number; dy: number; da: number; ds: number }>;
  }> {
    const result = await this.executeTask<any, any>('video-stabilization', {
      type: 'stabilize',
      transforms
    });
    return {
      smoothedTransforms: result.smoothedTransforms,
      trajectory: result.trajectory,
      smoothedTrajectory: result.smoothedTrajectory
    };
  }

  /**
   * Process audio (noise reduction, ducking, etc.)
   */
  async processAudio(
    type: 'noise-reduction' | 'ducking' | 'waveform' | 'normalize',
    audioData: Float32Array,
    sampleRate: number,
    parameters?: any
  ): Promise<Float32Array | number[]> {
    const result = await this.executeTask<any, any>('audio-processing', {
      type,
      audioData,
      sampleRate,
      parameters
    });
    return result.result;
  }

  /**
   * Terminate all workers
   */
  terminateAll() {
    for (const [, pool] of this.workers) {
      for (const { worker } of pool) {
        worker.terminate();
      }
    }
    this.workers.clear();
  }

  /**
   * Get worker statistics
   */
  getStats() {
    const stats: Record<string, { total: number; busy: number; available: number }> = {};

    for (const [type, pool] of this.workers) {
      const busy = pool.filter(w => w.busy).length;
      stats[type] = {
        total: pool.length,
        busy,
        available: pool.length - busy
      };
    }

    return stats;
  }
}

// Singleton instance
export const workerManager = new WorkerManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    workerManager.terminateAll();
  });
}