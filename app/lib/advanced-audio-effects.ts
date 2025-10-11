/**
 * Advanced Audio Effects
 * 
 * Implements advanced audio effects including reverb, EQ, compression, and more.
 * Uses Web Audio API for real-time processing.
 */

export interface ReverbSettings {
  roomSize: number; // 0-1
  damping: number; // 0-1
  wetLevel: number; // 0-1
  dryLevel: number; // 0-1
  width: number; // 0-1
}

export interface EQBand {
  frequency: number;
  gain: number; // dB
  q: number; // Quality factor
  type: 'lowshelf' | 'highshelf' | 'peaking' | 'lowpass' | 'highpass' | 'notch';
}

export interface CompressorSettings {
  threshold: number; // dB
  knee: number; // dB
  ratio: number; // 1-20
  attack: number; // seconds
  release: number; // seconds
  makeupGain: number; // dB
}

export interface LimiterSettings {
  threshold: number; // dB
  release: number; // seconds
}

export interface ChorusSettings {
  rate: number; // Hz
  depth: number; // 0-1
  feedback: number; // 0-1
  delay: number; // seconds
}

export interface FlangerSettings {
  rate: number; // Hz
  depth: number; // 0-1
  feedback: number; // 0-1
  delay: number; // seconds
}

export interface PhaserSettings {
  rate: number; // Hz
  depth: number; // 0-1
  feedback: number; // 0-1
  stages: number; // 2-12
}

/**
 * Advanced Audio Processor
 */
export class AdvancedAudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private nodes: Map<string, AudioNode> = new Map();

  /**
   * Initialize audio context
   */
  async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Create reverb effect
   */
  createReverb(settings: ReverbSettings): ConvolverNode {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    const convolver = this.audioContext.createConvolver();
    const impulseResponse = this.generateReverbImpulse(settings);
    convolver.buffer = impulseResponse;

    return convolver;
  }

  /**
   * Generate reverb impulse response
   */
  private generateReverbImpulse(settings: ReverbSettings): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * settings.roomSize * 3; // Up to 3 seconds
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        // Generate exponentially decaying noise
        const decay = Math.exp(-i / (length * settings.damping));
        const noise = (Math.random() * 2 - 1) * decay;
        channelData[i] = noise;
      }
    }

    return impulse;
  }

  /**
   * Create parametric EQ
   */
  createEQ(bands: EQBand[]): BiquadFilterNode[] {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    const filters: BiquadFilterNode[] = [];

    for (const band of bands) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.q;
      filters.push(filter);
    }

    return filters;
  }

  /**
   * Create standard 10-band EQ
   */
  create10BandEQ(gains: number[]): BiquadFilterNode[] {
    const frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    const bands: EQBand[] = frequencies.map((freq, i) => ({
      frequency: freq,
      gain: gains[i] || 0,
      q: 1.0,
      type: i === 0 ? 'lowshelf' : i === frequencies.length - 1 ? 'highshelf' : 'peaking',
    }));

    return this.createEQ(bands);
  }

  /**
   * Create compressor
   */
  createCompressor(settings: CompressorSettings): DynamicsCompressorNode {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = settings.threshold;
    compressor.knee.value = settings.knee;
    compressor.ratio.value = settings.ratio;
    compressor.attack.value = settings.attack;
    compressor.release.value = settings.release;

    return compressor;
  }

  /**
   * Create limiter (hard compressor)
   */
  createLimiter(settings: LimiterSettings): DynamicsCompressorNode {
    return this.createCompressor({
      threshold: settings.threshold,
      knee: 0,
      ratio: 20,
      attack: 0.001,
      release: settings.release,
      makeupGain: 0,
    });
  }

  /**
   * Create chorus effect
   */
  createChorus(settings: ChorusSettings): AudioNode {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // Create delay node
    const delay = this.audioContext.createDelay();
    delay.delayTime.value = settings.delay;

    // Create LFO for modulation
    const lfo = this.audioContext.createOscillator();
    lfo.frequency.value = settings.rate;

    // Create gain for LFO depth
    const lfoGain = this.audioContext.createGain();
    lfoGain.gain.value = settings.depth * 0.005; // Small modulation

    // Create feedback
    const feedback = this.audioContext.createGain();
    feedback.gain.value = settings.feedback;

    // Create wet/dry mix
    const wet = this.audioContext.createGain();
    wet.gain.value = 0.5;

    const dry = this.audioContext.createGain();
    dry.gain.value = 0.5;

    // Connect nodes
    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);

    lfo.start();

    // Return a custom node wrapper
    const input = this.audioContext.createGain();
    const output = this.audioContext.createGain();

    input.connect(dry);
    input.connect(delay);
    dry.connect(output);
    wet.connect(output);

    return output;
  }

  /**
   * Create flanger effect
   */
  createFlanger(settings: FlangerSettings): AudioNode {
    // Similar to chorus but with shorter delay and more feedback
    return this.createChorus({
      rate: settings.rate,
      depth: settings.depth,
      feedback: settings.feedback,
      delay: Math.min(settings.delay, 0.01), // Max 10ms for flanger
    });
  }

  /**
   * Create phaser effect
   */
  createPhaser(settings: PhaserSettings): AudioNode {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    const input = this.audioContext.createGain();
    const output = this.audioContext.createGain();

    // Create all-pass filters
    const filters: BiquadFilterNode[] = [];
    for (let i = 0; i < settings.stages; i++) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 1000;
      filters.push(filter);
    }

    // Create LFO
    const lfo = this.audioContext.createOscillator();
    lfo.frequency.value = settings.rate;

    const lfoGain = this.audioContext.createGain();
    lfoGain.gain.value = settings.depth * 1000;

    // Connect LFO to all filters
    lfo.connect(lfoGain);
    filters.forEach(filter => {
      lfoGain.connect(filter.frequency);
    });

    // Chain filters
    let current: AudioNode = input;
    filters.forEach(filter => {
      current.connect(filter);
      current = filter;
    });

    // Create feedback
    const feedback = this.audioContext.createGain();
    feedback.gain.value = settings.feedback;
    current.connect(feedback);
    feedback.connect(input);

    // Mix with dry signal
    current.connect(output);
    input.connect(output);

    lfo.start();

    return output;
  }

  /**
   * Create pitch shifter
   */
  createPitchShifter(semitones: number): AudioNode {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // Simple pitch shifting using playback rate
    // Note: This also affects duration
    const input = this.audioContext.createGain();
    const output = this.audioContext.createGain();

    // Calculate playback rate from semitones
    const playbackRate = Math.pow(2, semitones / 12);

    // This is a simplified implementation
    // Real pitch shifting requires more complex algorithms (phase vocoder, etc.)
    input.connect(output);

    return output;
  }

  /**
   * Create noise gate
   */
  createNoiseGate(threshold: number, attack: number, release: number): AudioNode {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // Simplified noise gate using compressor
    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = threshold;
    compressor.knee.value = 0;
    compressor.ratio.value = 20;
    compressor.attack.value = attack;
    compressor.release.value = release;

    return compressor;
  }

  /**
   * Create de-esser
   */
  createDeEsser(frequency: number, threshold: number): AudioNode {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // High-pass filter to isolate sibilance
    const hpf = this.audioContext.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = frequency;

    // Compressor to reduce sibilance
    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = threshold;
    compressor.ratio.value = 10;
    compressor.attack.value = 0.001;
    compressor.release.value = 0.1;

    hpf.connect(compressor);

    return compressor;
  }

  /**
   * Analyze audio spectrum
   */
  createAnalyzer(fftSize: number = 2048): AnalyserNode {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    const analyzer = this.audioContext.createAnalyser();
    analyzer.fftSize = fftSize;
    analyzer.smoothingTimeConstant = 0.8;

    return analyzer;
  }

  /**
   * Get audio context
   */
  getContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Dispose audio context
   */
  async dispose(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.nodes.clear();
  }
}

/**
 * Preset configurations
 */
export const AudioEffectPresets = {
  reverb: {
    smallRoom: { roomSize: 0.3, damping: 0.5, wetLevel: 0.3, dryLevel: 0.7, width: 0.5 },
    mediumRoom: { roomSize: 0.5, damping: 0.5, wetLevel: 0.4, dryLevel: 0.6, width: 0.7 },
    largeHall: { roomSize: 0.8, damping: 0.3, wetLevel: 0.5, dryLevel: 0.5, width: 1.0 },
    cathedral: { roomSize: 1.0, damping: 0.2, wetLevel: 0.6, dryLevel: 0.4, width: 1.0 },
  },
  compressor: {
    gentle: { threshold: -20, knee: 6, ratio: 2, attack: 0.01, release: 0.1, makeupGain: 2 },
    medium: { threshold: -15, knee: 3, ratio: 4, attack: 0.005, release: 0.05, makeupGain: 4 },
    heavy: { threshold: -10, knee: 0, ratio: 8, attack: 0.001, release: 0.01, makeupGain: 6 },
    vocal: { threshold: -18, knee: 4, ratio: 3, attack: 0.003, release: 0.08, makeupGain: 3 },
  },
  eq: {
    bassBoost: [6, 4, 2, 0, 0, 0, 0, 0, 0, 0],
    trebleBoost: [0, 0, 0, 0, 0, 0, 2, 4, 6, 6],
    vocal: [0, -2, -3, -2, 2, 3, 2, 0, -1, -2],
    podcast: [-3, -2, 0, 2, 3, 2, 0, -1, -2, -3],
  },
};

/**
 * Singleton instance
 */
let audioProcessorInstance: AdvancedAudioProcessor | null = null;

/**
 * Get audio processor instance
 */
export function getAdvancedAudioProcessor(): AdvancedAudioProcessor {
  if (!audioProcessorInstance) {
    audioProcessorInstance = new AdvancedAudioProcessor();
  }
  return audioProcessorInstance;
}