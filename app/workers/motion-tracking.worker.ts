/**
 * Motion Tracking Web Worker
 * Implements Lucas-Kanade optical flow for tracking points across frames
 */

interface TrackPoint {
  x: number;
  y: number;
  confidence: number;
}

interface TrackingRequest {
  type: 'track';
  prevFrame: ImageData;
  currentFrame: ImageData;
  points: Array<{ x: number; y: number }>;
  windowSize?: number;
  maxIterations?: number;
}

interface TrackingResponse {
  type: 'tracking-result';
  points: TrackPoint[];
  processingTime: number;
}

// Lucas-Kanade optical flow implementation
class OpticalFlowTracker {
  private windowSize: number;
  private maxIterations: number;
  private epsilon: number;

  constructor(windowSize = 15, maxIterations = 30, epsilon = 0.01) {
    this.windowSize = windowSize;
    this.maxIterations = maxIterations;
    this.epsilon = epsilon;
  }

  /**
   * Track points from previous frame to current frame
   */
  trackPoints(
    prevFrame: ImageData,
    currentFrame: ImageData,
    points: Array<{ x: number; y: number }>
  ): TrackPoint[] {
    const prevGray = this.toGrayscale(prevFrame);
    const currGray = this.toGrayscale(currentFrame);

    return points.map(point => this.trackPoint(prevGray, currGray, point));
  }

  /**
   * Track a single point using Lucas-Kanade
   */
  private trackPoint(
    prevGray: Float32Array,
    currGray: Float32Array,
    point: { x: number; y: number }
  ): TrackPoint {
    const width = Math.sqrt(prevGray.length);
    const halfWindow = Math.floor(this.windowSize / 2);

    let u = 0; // x displacement
    let v = 0; // y displacement

    for (let iter = 0; iter < this.maxIterations; iter++) {
      const newX = point.x + u;
      const newY = point.y + v;

      // Check bounds
      if (
        newX < halfWindow ||
        newY < halfWindow ||
        newX >= width - halfWindow ||
        newY >= width - halfWindow
      ) {
        return { x: point.x, y: point.y, confidence: 0 };
      }

      // Compute image gradients and temporal difference
      let sumIx2 = 0;
      let sumIy2 = 0;
      let sumIxIy = 0;
      let sumIxIt = 0;
      let sumIyIt = 0;

      for (let dy = -halfWindow; dy <= halfWindow; dy++) {
        for (let dx = -halfWindow; dx <= halfWindow; dx++) {
          const x1 = Math.floor(point.x + dx);
          const y1 = Math.floor(point.y + dy);
          const x2 = Math.floor(newX + dx);
          const y2 = Math.floor(newY + dy);

          // Spatial gradients (Sobel)
          const Ix = this.getGradientX(prevGray, x1, y1, width);
          const Iy = this.getGradientY(prevGray, x1, y1, width);

          // Temporal gradient
          const It =
            this.getPixel(currGray, x2, y2, width) -
            this.getPixel(prevGray, x1, y1, width);

          sumIx2 += Ix * Ix;
          sumIy2 += Iy * Iy;
          sumIxIy += Ix * Iy;
          sumIxIt += Ix * It;
          sumIyIt += Iy * It;
        }
      }

      // Solve 2x2 system using Cramer's rule
      const det = sumIx2 * sumIy2 - sumIxIy * sumIxIy;

      if (Math.abs(det) < 1e-7) {
        // Singular matrix - no good texture
        return { x: point.x, y: point.y, confidence: 0 };
      }

      const du = (sumIy2 * -sumIxIt - sumIxIy * -sumIyIt) / det;
      const dv = (sumIx2 * -sumIyIt - sumIxIy * -sumIxIt) / det;

      u += du;
      v += dv;

      // Check convergence
      if (Math.abs(du) < this.epsilon && Math.abs(dv) < this.epsilon) {
        break;
      }
    }

    // Calculate confidence based on texture quality
    const confidence = this.calculateConfidence(prevGray, point.x, point.y, width);

    return {
      x: point.x + u,
      y: point.y + v,
      confidence: Math.min(1, Math.max(0, confidence))
    };
  }

  /**
   * Convert RGBA ImageData to grayscale
   */
  private toGrayscale(imageData: ImageData): Float32Array {
    const { data, width, height } = imageData;
    const gray = new Float32Array(width * height);

    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      // Luminance formula
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    return gray;
  }

  /**
   * Get pixel value with bounds checking
   */
  private getPixel(data: Float32Array, x: number, y: number, width: number): number {
    const height = data.length / width;
    if (x < 0 || y < 0 || x >= width || y >= height) return 0;
    return data[Math.floor(y) * width + Math.floor(x)];
  }

  /**
   * Compute X gradient using Sobel operator
   */
  private getGradientX(data: Float32Array, x: number, y: number, width: number): number {
    const p1 = this.getPixel(data, x - 1, y - 1, width);
    const p2 = this.getPixel(data, x - 1, y, width);
    const p3 = this.getPixel(data, x - 1, y + 1, width);
    const p4 = this.getPixel(data, x + 1, y - 1, width);
    const p5 = this.getPixel(data, x + 1, y, width);
    const p6 = this.getPixel(data, x + 1, y + 1, width);

    return (-p1 - 2 * p2 - p3 + p4 + 2 * p5 + p6) / 8;
  }

  /**
   * Compute Y gradient using Sobel operator
   */
  private getGradientY(data: Float32Array, x: number, y: number, width: number): number {
    const p1 = this.getPixel(data, x - 1, y - 1, width);
    const p2 = this.getPixel(data, x, y - 1, width);
    const p3 = this.getPixel(data, x + 1, y - 1, width);
    const p4 = this.getPixel(data, x - 1, y + 1, width);
    const p5 = this.getPixel(data, x, y + 1, width);
    const p6 = this.getPixel(data, x + 1, y + 1, width);

    return (-p1 - 2 * p2 - p3 + p4 + 2 * p5 + p6) / 8;
  }

  /**
   * Calculate tracking confidence based on texture quality
   */
  private calculateConfidence(
    data: Float32Array,
    x: number,
    y: number,
    width: number
  ): number {
    const halfWindow = Math.floor(this.windowSize / 2);
    let variance = 0;
    let mean = 0;
    let count = 0;

    // Calculate mean
    for (let dy = -halfWindow; dy <= halfWindow; dy++) {
      for (let dx = -halfWindow; dx <= halfWindow; dx++) {
        mean += this.getPixel(data, x + dx, y + dy, width);
        count++;
      }
    }
    mean /= count;

    // Calculate variance
    for (let dy = -halfWindow; dy <= halfWindow; dy++) {
      for (let dx = -halfWindow; dx <= halfWindow; dx++) {
        const val = this.getPixel(data, x + dx, y + dy, width);
        variance += (val - mean) * (val - mean);
      }
    }
    variance /= count;

    // Normalize variance to [0, 1] range
    // Higher variance = better texture = higher confidence
    return Math.min(1, variance / 1000);
  }
}

// Worker message handler
const tracker = new OpticalFlowTracker();

self.onmessage = (e: MessageEvent<TrackingRequest>) => {
  const startTime = performance.now();
  const { prevFrame, currentFrame, points, windowSize, maxIterations } = e.data;

  if (windowSize) tracker['windowSize'] = windowSize;
  if (maxIterations) tracker['maxIterations'] = maxIterations;

  const trackedPoints = tracker.trackPoints(prevFrame, currentFrame, points);

  const response: TrackingResponse = {
    type: 'tracking-result',
    points: trackedPoints,
    processingTime: performance.now() - startTime
  };

  self.postMessage(response);
};

export {};