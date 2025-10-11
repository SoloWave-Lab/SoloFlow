/**
 * Video Stabilization Web Worker
 * Implements transform smoothing for video stabilization
 */

interface Transform {
  dx: number; // X translation
  dy: number; // Y translation
  da: number; // Rotation angle
  ds: number; // Scale
}

interface StabilizationRequest {
  type: 'stabilize';
  transforms: Transform[];
  smoothingRadius?: number;
  cropRatio?: number;
}

interface StabilizationResponse {
  type: 'stabilization-result';
  smoothedTransforms: Transform[];
  trajectory: Transform[];
  smoothedTrajectory: Transform[];
  processingTime: number;
}

/**
 * Video Stabilization using transform smoothing
 */
class VideoStabilizer {
  private smoothingRadius: number;
  private cropRatio: number;

  constructor(smoothingRadius = 30, cropRatio = 0.9) {
    this.smoothingRadius = smoothingRadius;
    this.cropRatio = cropRatio;
  }

  /**
   * Stabilize video by smoothing camera trajectory
   */
  stabilize(transforms: Transform[]): {
    smoothedTransforms: Transform[];
    trajectory: Transform[];
    smoothedTrajectory: Transform[];
  } {
    // Step 1: Calculate trajectory (cumulative transforms)
    const trajectory = this.calculateTrajectory(transforms);

    // Step 2: Smooth the trajectory
    const smoothedTrajectory = this.smoothTrajectory(trajectory);

    // Step 3: Calculate smoothed transforms
    const smoothedTransforms = this.calculateSmoothedTransforms(
      transforms,
      trajectory,
      smoothedTrajectory
    );

    return {
      smoothedTransforms,
      trajectory,
      smoothedTrajectory
    };
  }

  /**
   * Calculate cumulative trajectory from frame-to-frame transforms
   */
  private calculateTrajectory(transforms: Transform[]): Transform[] {
    const trajectory: Transform[] = [];
    let cumDx = 0;
    let cumDy = 0;
    let cumDa = 0;
    let cumDs = 1;

    for (const transform of transforms) {
      cumDx += transform.dx;
      cumDy += transform.dy;
      cumDa += transform.da;
      cumDs *= transform.ds;

      trajectory.push({
        dx: cumDx,
        dy: cumDy,
        da: cumDa,
        ds: cumDs
      });
    }

    return trajectory;
  }

  /**
   * Smooth trajectory using moving average filter
   */
  private smoothTrajectory(trajectory: Transform[]): Transform[] {
    const smoothed: Transform[] = [];

    for (let i = 0; i < trajectory.length; i++) {
      let sumDx = 0;
      let sumDy = 0;
      let sumDa = 0;
      let sumDs = 0;
      let count = 0;

      // Moving average window
      const start = Math.max(0, i - this.smoothingRadius);
      const end = Math.min(trajectory.length - 1, i + this.smoothingRadius);

      for (let j = start; j <= end; j++) {
        sumDx += trajectory[j].dx;
        sumDy += trajectory[j].dy;
        sumDa += trajectory[j].da;
        sumDs += trajectory[j].ds;
        count++;
      }

      smoothed.push({
        dx: sumDx / count,
        dy: sumDy / count,
        da: sumDa / count,
        ds: sumDs / count
      });
    }

    return smoothed;
  }

  /**
   * Calculate smoothed transforms from original and smoothed trajectories
   */
  private calculateSmoothedTransforms(
    transforms: Transform[],
    trajectory: Transform[],
    smoothedTrajectory: Transform[]
  ): Transform[] {
    const smoothedTransforms: Transform[] = [];

    for (let i = 0; i < transforms.length; i++) {
      const diff: Transform = {
        dx: smoothedTrajectory[i].dx - trajectory[i].dx,
        dy: smoothedTrajectory[i].dy - trajectory[i].dy,
        da: smoothedTrajectory[i].da - trajectory[i].da,
        ds: smoothedTrajectory[i].ds / trajectory[i].ds
      };

      smoothedTransforms.push({
        dx: transforms[i].dx + diff.dx,
        dy: transforms[i].dy + diff.dy,
        da: transforms[i].da + diff.da,
        ds: transforms[i].ds * diff.ds
      });
    }

    return smoothedTransforms;
  }

  /**
   * Apply Gaussian smoothing (alternative to moving average)
   */
  private gaussianSmooth(trajectory: Transform[]): Transform[] {
    const smoothed: Transform[] = [];
    const sigma = this.smoothingRadius / 3;

    for (let i = 0; i < trajectory.length; i++) {
      let sumDx = 0;
      let sumDy = 0;
      let sumDa = 0;
      let sumDs = 0;
      let sumWeights = 0;

      const start = Math.max(0, i - this.smoothingRadius * 2);
      const end = Math.min(trajectory.length - 1, i + this.smoothingRadius * 2);

      for (let j = start; j <= end; j++) {
        const distance = j - i;
        const weight = Math.exp(-(distance * distance) / (2 * sigma * sigma));

        sumDx += trajectory[j].dx * weight;
        sumDy += trajectory[j].dy * weight;
        sumDa += trajectory[j].da * weight;
        sumDs += trajectory[j].ds * weight;
        sumWeights += weight;
      }

      smoothed.push({
        dx: sumDx / sumWeights,
        dy: sumDy / sumWeights,
        da: sumDa / sumWeights,
        ds: sumDs / sumWeights
      });
    }

    return smoothed;
  }

  /**
   * Calculate required crop to remove black borders
   */
  calculateCropParameters(transforms: Transform[]): {
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
  } {
    let maxDx = 0;
    let maxDy = 0;
    let maxDa = 0;

    for (const transform of transforms) {
      maxDx = Math.max(maxDx, Math.abs(transform.dx));
      maxDy = Math.max(maxDy, Math.abs(transform.dy));
      maxDa = Math.max(maxDa, Math.abs(transform.da));
    }

    // Calculate crop based on maximum displacement
    const cropMargin = Math.max(maxDx, maxDy) * 1.2;
    const cropX = cropMargin;
    const cropY = cropMargin;
    const cropWidth = 1920 - 2 * cropMargin; // Assuming 1920x1080
    const cropHeight = 1080 - 2 * cropMargin;

    return {
      cropX,
      cropY,
      cropWidth: cropWidth * this.cropRatio,
      cropHeight: cropHeight * this.cropRatio
    };
  }
}

// Worker message handler
const stabilizer = new VideoStabilizer();

self.onmessage = (e: MessageEvent<StabilizationRequest>) => {
  const startTime = performance.now();
  const { transforms, smoothingRadius, cropRatio } = e.data;

  if (smoothingRadius) stabilizer['smoothingRadius'] = smoothingRadius;
  if (cropRatio) stabilizer['cropRatio'] = cropRatio;

  const result = stabilizer.stabilize(transforms);

  const response: StabilizationResponse = {
    type: 'stabilization-result',
    smoothedTransforms: result.smoothedTransforms,
    trajectory: result.trajectory,
    smoothedTrajectory: result.smoothedTrajectory,
    processingTime: performance.now() - startTime
  };

  self.postMessage(response);
};

export {};