/**
 * Audio Processing Web Worker
 * Implements noise reduction, ducking, and waveform generation
 */

interface AudioProcessingRequest {
  type: 'noise-reduction' | 'ducking' | 'waveform' | 'normalize';
  audioData: Float32Array;
  sampleRate: number;
  parameters?: any;
}

interface AudioProcessingResponse {
  type: string;
  result: Float32Array | number[];
  processingTime: number;
  metadata?: any;
}

/**
 * Audio Processing Engine
 */
class AudioProcessor {
  /**
   * Spectral Subtraction Noise Reduction
   */
  noiseReduction(
    audioData: Float32Array,
    sampleRate: number,
    noiseProfile?: Float32Array
  ): Float32Array {
    const fftSize = 2048;
    const hopSize = fftSize / 4;
    const output = new Float32Array(audioData.length);

    // Estimate noise profile if not provided
    if (!noiseProfile) {
      noiseProfile = this.estimateNoiseProfile(audioData, sampleRate, fftSize);
    }

    // Process in overlapping windows
    for (let i = 0; i < audioData.length - fftSize; i += hopSize) {
      const window = audioData.slice(i, i + fftSize);
      const spectrum = this.fft(this.applyHannWindow(window));

      // Spectral subtraction
      const cleanSpectrum = this.spectralSubtraction(spectrum, noiseProfile);

      // Inverse FFT
      const cleanWindow = this.ifft(cleanSpectrum);

      // Overlap-add
      for (let j = 0; j < fftSize && i + j < output.length; j++) {
        output[i + j] += cleanWindow[j];
      }
    }

    return this.normalize(output);
  }

  /**
   * Estimate noise profile from silent portions
   */
  private estimateNoiseProfile(
    audioData: Float32Array,
    sampleRate: number,
    fftSize: number
  ): Float32Array {
    const threshold = 0.01; // Silence threshold
    const noiseFrames: Float32Array[] = [];

    // Find silent frames
    for (let i = 0; i < audioData.length - fftSize; i += fftSize) {
      const window = audioData.slice(i, i + fftSize);
      const rms = this.calculateRMS(window);

      if (rms < threshold) {
        noiseFrames.push(this.fft(this.applyHannWindow(window)));
      }
    }

    // Average noise spectra
    if (noiseFrames.length === 0) {
      return new Float32Array(fftSize);
    }

    const avgNoise = new Float32Array(fftSize);
    for (const frame of noiseFrames) {
      for (let i = 0; i < fftSize; i++) {
        avgNoise[i] += frame[i];
      }
    }

    for (let i = 0; i < fftSize; i++) {
      avgNoise[i] /= noiseFrames.length;
    }

    return avgNoise;
  }

  /**
   * Spectral subtraction
   */
  private spectralSubtraction(
    spectrum: Float32Array,
    noiseProfile: Float32Array
  ): Float32Array {
    const result = new Float32Array(spectrum.length);
    const alpha = 2.0; // Over-subtraction factor
    const beta = 0.01; // Spectral floor

    for (let i = 0; i < spectrum.length; i++) {
      const magnitude = Math.abs(spectrum[i]);
      const noiseMag = Math.abs(noiseProfile[i] || 0);
      const cleanMag = Math.max(magnitude - alpha * noiseMag, beta * magnitude);
      result[i] = cleanMag * Math.sign(spectrum[i]);
    }

    return result;
  }

  /**
   * Audio Ducking - reduce volume when another track is active
   */
  audioDucking(
    backgroundAudio: Float32Array,
    foregroundAudio: Float32Array,
    threshold: number = -20, // dB
    ratio: number = 4,
    attackTime: number = 0.01, // seconds
    releaseTime: number = 0.1, // seconds
    sampleRate: number = 44100
  ): Float32Array {
    const output = new Float32Array(backgroundAudio.length);
    const attackSamples = Math.floor(attackTime * sampleRate);
    const releaseSamples = Math.floor(releaseTime * sampleRate);

    let gainReduction = 1.0;
    const thresholdLinear = this.dbToLinear(threshold);

    for (let i = 0; i < backgroundAudio.length; i++) {
      // Detect foreground level
      const foregroundLevel = Math.abs(foregroundAudio[i] || 0);

      // Calculate target gain reduction
      let targetGain = 1.0;
      if (foregroundLevel > thresholdLinear) {
        const excess = foregroundLevel / thresholdLinear;
        targetGain = 1.0 / Math.pow(excess, (ratio - 1) / ratio);
      }

      // Smooth gain changes (attack/release)
      if (targetGain < gainReduction) {
        // Attack
        gainReduction = Math.max(
          targetGain,
          gainReduction - (1.0 - targetGain) / attackSamples
        );
      } else {
        // Release
        gainReduction = Math.min(
          targetGain,
          gainReduction + (targetGain - gainReduction) / releaseSamples
        );
      }

      output[i] = backgroundAudio[i] * gainReduction;
    }

    return output;
  }

  /**
   * Generate waveform visualization data
   */
  generateWaveform(
    audioData: Float32Array,
    width: number = 1000,
    height: number = 100
  ): number[] {
    const samplesPerPixel = Math.floor(audioData.length / width);
    const waveform: number[] = [];

    for (let i = 0; i < width; i++) {
      const start = i * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, audioData.length);

      let min = 0;
      let max = 0;

      for (let j = start; j < end; j++) {
        min = Math.min(min, audioData[j]);
        max = Math.max(max, audioData[j]);
      }

      // Normalize to height
      waveform.push(
        Math.floor((min + 1) * (height / 2)),
        Math.floor((max + 1) * (height / 2))
      );
    }

    return waveform;
  }

  /**
   * Normalize audio to prevent clipping
   */
  normalize(audioData: Float32Array, targetLevel: number = 0.95): Float32Array {
    let maxAbs = 0;
    for (let i = 0; i < audioData.length; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(audioData[i]));
    }

    if (maxAbs === 0) return audioData;

    const gain = targetLevel / maxAbs;
    const output = new Float32Array(audioData.length);

    for (let i = 0; i < audioData.length; i++) {
      output[i] = audioData[i] * gain;
    }

    return output;
  }

  /**
   * Simple FFT implementation (Cooley-Tukey)
   */
  private fft(input: Float32Array): Float32Array {
    const n = input.length;
    if (n <= 1) return input;

    // Ensure power of 2
    if ((n & (n - 1)) !== 0) {
      throw new Error('FFT size must be power of 2');
    }

    // Bit-reversal permutation
    const output = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      output[i] = input[this.reverseBits(i, Math.log2(n))];
    }

    // Cooley-Tukey FFT
    for (let size = 2; size <= n; size *= 2) {
      const halfSize = size / 2;
      const step = (2 * Math.PI) / size;

      for (let i = 0; i < n; i += size) {
        for (let j = 0; j < halfSize; j++) {
          const angle = step * j;
          const wr = Math.cos(angle);
          const wi = -Math.sin(angle);

          const evenIdx = i + j;
          const oddIdx = i + j + halfSize;

          const evenReal = output[evenIdx];
          const oddReal = output[oddIdx];

          output[evenIdx] = evenReal + wr * oddReal;
          output[oddIdx] = evenReal - wr * oddReal;
        }
      }
    }

    return output;
  }

  /**
   * Inverse FFT
   */
  private ifft(input: Float32Array): Float32Array {
    const n = input.length;
    const output = this.fft(input);

    // Divide by n and reverse
    for (let i = 0; i < n; i++) {
      output[i] /= n;
    }

    return output;
  }

  /**
   * Apply Hann window
   */
  private applyHannWindow(input: Float32Array): Float32Array {
    const n = input.length;
    const output = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
      output[i] = input[i] * window;
    }

    return output;
  }

  /**
   * Reverse bits for FFT
   */
  private reverseBits(num: number, bits: number): number {
    let result = 0;
    for (let i = 0; i < bits; i++) {
      result = (result << 1) | (num & 1);
      num >>= 1;
    }
    return result;
  }

  /**
   * Calculate RMS (Root Mean Square)
   */
  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  /**
   * Convert dB to linear
   */
  private dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  /**
   * Convert linear to dB
   */
  private linearToDb(linear: number): number {
    return 20 * Math.log10(linear);
  }
}

// Worker message handler
const processor = new AudioProcessor();

self.onmessage = (e: MessageEvent<AudioProcessingRequest>) => {
  const startTime = performance.now();
  const { type, audioData, sampleRate, parameters } = e.data;

  let result: Float32Array | number[];
  let metadata: any = {};

  switch (type) {
    case 'noise-reduction':
      result = processor.noiseReduction(audioData, sampleRate, parameters?.noiseProfile);
      break;

    case 'ducking':
      result = processor.audioDucking(
        audioData,
        parameters.foregroundAudio,
        parameters.threshold,
        parameters.ratio,
        parameters.attackTime,
        parameters.releaseTime,
        sampleRate
      );
      break;

    case 'waveform':
      result = processor.generateWaveform(
        audioData,
        parameters?.width || 1000,
        parameters?.height || 100
      );
      metadata.width = parameters?.width || 1000;
      metadata.height = parameters?.height || 100;
      break;

    case 'normalize':
      result = processor.normalize(audioData, parameters?.targetLevel || 0.95);
      break;

    default:
      throw new Error(`Unknown processing type: ${type}`);
  }

  const response: AudioProcessingResponse = {
    type: `${type}-result`,
    result,
    processingTime: performance.now() - startTime,
    metadata
  };

  self.postMessage(response);
};

export {};