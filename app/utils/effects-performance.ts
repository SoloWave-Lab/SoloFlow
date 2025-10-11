/**
 * Performance optimization utilities for the effects system
 * Includes caching, memoization, and performance monitoring
 */

import type { VisualEffect, ColorCorrection, AudioEffect } from "~/components/timeline/advanced-types";

// ============================================
// EFFECT CACHING
// ============================================

interface EffectCacheEntry {
  data: any;
  timestamp: number;
  hash: string;
}

class EffectCache {
  private cache: Map<string, EffectCacheEntry> = new Map();
  private maxAge: number = 5000; // 5 seconds
  private maxSize: number = 100; // Maximum cache entries

  /**
   * Generate hash for effect data
   */
  private hash(data: any): string {
    return JSON.stringify(data);
  }

  /**
   * Get cached effect result
   */
  get(key: string, data: any): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    const currentHash = this.hash(data);
    if (entry.hash !== currentHash) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached effect result
   */
  set(key: string, data: any, result: any): void {
    // Enforce max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
      hash: this.hash(data),
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      maxAge: this.maxAge,
    };
  }
}

export const effectCache = new EffectCache();

// ============================================
// DEBOUNCING
// ============================================

type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
};

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
      lastArgs = null;
    }, wait);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  debounced.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      func(...lastArgs);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return debounced;
}

// ============================================
// THROTTLING
// ============================================

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

// ============================================
// BATCH PROCESSING
// ============================================

interface BatchOperation<T> {
  id: string;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

class BatchProcessor<T> {
  private queue: BatchOperation<T>[] = [];
  private processing: boolean = false;
  private batchSize: number = 10;
  private batchDelay: number = 100; // ms

  /**
   * Add operation to batch queue
   */
  add(id: string, operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ id, operation, resolve, reject });
      this.scheduleProcess();
    });
  }

  /**
   * Schedule batch processing
   */
  private scheduleProcess(): void {
    if (this.processing) return;

    setTimeout(() => {
      this.process();
    }, this.batchDelay);
  }

  /**
   * Process batch of operations
   */
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);

    try {
      const results = await Promise.allSettled(
        batch.map((op) => op.operation())
      );

      results.forEach((result, index) => {
        const op = batch[index];
        if (result.status === "fulfilled") {
          op.resolve(result.value);
        } else {
          op.reject(result.reason);
        }
      });
    } catch (error) {
      batch.forEach((op) => op.reject(error));
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        this.scheduleProcess();
      }
    }
  }
}

export const saveBatchProcessor = new BatchProcessor<void>();

// ============================================
// PERFORMANCE MONITORING
// ============================================

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;

  /**
   * Start timing an operation
   */
  start(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.record(name, duration);
    };
  }

  /**
   * Record a performance metric
   */
  private record(name: string, duration: number): void {
    if (this.metrics.length >= this.maxMetrics) {
      this.metrics.shift();
    }

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });
  }

  /**
   * Get metrics for a specific operation
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  /**
   * Get average duration for an operation
   */
  getAverage(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const summary: Record<string, { count: number; avg: number; min: number; max: number }> = {};

    const names = [...new Set(this.metrics.map((m) => m.name))];

    names.forEach((name) => {
      const metrics = this.getMetrics(name);
      const durations = metrics.map((m) => m.duration);

      summary[name] = {
        count: metrics.length,
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
      };
    });

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    const summary = this.getSummary();
    console.table(summary);
  }
}

export const perfMonitor = new PerformanceMonitor();

// ============================================
// MEMORY MANAGEMENT
// ============================================

/**
 * Check if memory usage is high
 */
export function isMemoryHigh(): boolean {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    return usedPercent > 80;
  }
  return false;
}

/**
 * Request garbage collection (if available)
 */
export function requestGC(): void {
  if ('gc' in global) {
    (global as any).gc();
  }
}

/**
 * Clear all caches and request GC
 */
export function clearMemory(): void {
  effectCache.clear();
  requestGC();
}

// ============================================
// EFFECT OPTIMIZATION
// ============================================

/**
 * Check if two effects are equal
 */
export function areEffectsEqual(a: VisualEffect, b: VisualEffect): boolean {
  return (
    a.type === b.type &&
    a.enabled === b.enabled &&
    JSON.stringify(a.parameters) === JSON.stringify(b.parameters)
  );
}

/**
 * Check if two color corrections are equal
 */
export function areColorCorrectionsEqual(
  a: ColorCorrection,
  b: ColorCorrection
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Optimize effect parameters (remove defaults)
 */
export function optimizeEffectParameters(effect: VisualEffect): VisualEffect {
  const optimized = { ...effect };
  const params = { ...effect.parameters };

  // Remove default values to reduce data size
  Object.keys(params).forEach((key) => {
    if (params[key] === 0 || params[key] === false || params[key] === "") {
      delete params[key];
    }
  });

  optimized.parameters = params;
  return optimized;
}

/**
 * Batch multiple effect updates
 */
export function batchEffectUpdates<T>(
  updates: Array<() => Promise<T>>
): Promise<T[]> {
  return Promise.all(updates.map((update) => update()));
}

// ============================================
// LUT OPTIMIZATION
// ============================================

/**
 * Compress LUT data for storage
 */
export function compressLUTData(data: Float32Array): string {
  // Convert to base64 for efficient storage
  const buffer = data.buffer;
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decompress LUT data
 */
export function decompressLUTData(compressed: string): Float32Array {
  const binary = atob(compressed);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Float32Array(bytes.buffer);
}

/**
 * Downsample LUT for preview (faster processing)
 */
export function downsampleLUT(
  data: Float32Array,
  originalSize: number,
  targetSize: number
): Float32Array {
  if (originalSize === targetSize) return data;

  const ratio = originalSize / targetSize;
  const newData = new Float32Array(targetSize * targetSize * targetSize * 3);

  for (let r = 0; r < targetSize; r++) {
    for (let g = 0; g < targetSize; g++) {
      for (let b = 0; b < targetSize; b++) {
        const origR = Math.floor(r * ratio);
        const origG = Math.floor(g * ratio);
        const origB = Math.floor(b * ratio);

        const origIndex = (origR * originalSize * originalSize + origG * originalSize + origB) * 3;
        const newIndex = (r * targetSize * targetSize + g * targetSize + b) * 3;

        newData[newIndex] = data[origIndex];
        newData[newIndex + 1] = data[origIndex + 1];
        newData[newIndex + 2] = data[origIndex + 2];
      }
    }
  }

  return newData;
}

// ============================================
// PRESET OPTIMIZATION
// ============================================

/**
 * Calculate preset size in bytes
 */
export function calculatePresetSize(preset: {
  visualEffects: VisualEffect[];
  colorCorrection?: ColorCorrection;
  audioEffects: AudioEffect[];
}): number {
  const json = JSON.stringify(preset);
  return new Blob([json]).size;
}

/**
 * Optimize preset for storage
 */
export function optimizePreset(preset: {
  visualEffects: VisualEffect[];
  colorCorrection?: ColorCorrection;
  audioEffects: AudioEffect[];
}) {
  return {
    visualEffects: preset.visualEffects.map(optimizeEffectParameters),
    colorCorrection: preset.colorCorrection,
    audioEffects: preset.audioEffects,
  };
}

// ============================================
// EXPORT
// ============================================

export const EffectsPerformance = {
  cache: effectCache,
  debounce,
  throttle,
  batchProcessor: saveBatchProcessor,
  monitor: perfMonitor,
  isMemoryHigh,
  clearMemory,
  areEffectsEqual,
  areColorCorrectionsEqual,
  optimizeEffectParameters,
  batchEffectUpdates,
  compressLUTData,
  decompressLUTData,
  downsampleLUT,
  calculatePresetSize,
  optimizePreset,
};