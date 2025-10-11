// Hooks for Phase 4: Audio Editing features
import { useState, useCallback } from "react";

// ============================================
// AUDIO WAVEFORM HOOK
// ============================================

export interface AudioWaveform {
  id: string;
  assetId: string;
  sampleRate: number;
  channels: number;
  duration: number;
  peaks: number[];
}

export function useAudioWaveform(assetId: string) {
  const [waveform, setWaveform] = useState<AudioWaveform | null>(null);
  const [loading, setLoading] = useState(false);

  const loadWaveform = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/audio/waveform/${assetId}`);
      if (response.ok) {
        const data = await response.json();
        setWaveform(data);
      }
    } catch (error) {
      console.error("Failed to load waveform:", error);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  const generateWaveform = useCallback(async (audioFile: File) => {
    setLoading(true);
    try {
      // This would typically involve Web Audio API to analyze the audio
      const audioContext = new AudioContext();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Generate peaks for visualization
      const peaks = extractPeaks(audioBuffer, 1000); // 1000 samples

      const response = await fetch("/api/audio/waveform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
          duration: audioBuffer.duration,
          peaks,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setWaveform(data);
        return data;
      }
    } catch (error) {
      console.error("Failed to generate waveform:", error);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  return {
    waveform,
    loading,
    loadWaveform,
    generateWaveform,
  };
}

// Helper function to extract peaks from audio buffer
function extractPeaks(audioBuffer: AudioBuffer, numSamples: number): number[] {
  const peaks: number[] = [];
  const channelData = audioBuffer.getChannelData(0); // Use first channel
  const blockSize = Math.floor(channelData.length / numSamples);

  for (let i = 0; i < numSamples; i++) {
    const start = i * blockSize;
    const end = start + blockSize;
    let max = 0;

    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }

    peaks.push(max);
  }

  return peaks;
}

// ============================================
// AUDIO DUCKING HOOK
// ============================================

export interface AudioDucking {
  id: string;
  projectId: string;
  targetScrubberId: string;
  triggerScrubberId: string;
  enabled: boolean;
  duckingAmount: number;
  threshold: number;
  attack: number;
  release: number;
  autoDetect: boolean;
}

export function useAudioDucking(projectId: string) {
  const [duckingRules, setDuckingRules] = useState<AudioDucking[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDuckingRules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/audio/ducking?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setDuckingRules(data);
      }
    } catch (error) {
      console.error("Failed to load ducking rules:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createDuckingRule = useCallback(async (data: {
    targetScrubberId: string;
    triggerScrubberId: string;
    duckingAmount?: number;
    threshold?: number;
    attack?: number;
    release?: number;
    autoDetect?: boolean;
  }) => {
    try {
      const response = await fetch("/api/audio/ducking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId }),
      });
      if (response.ok) {
        const rule = await response.json();
        setDuckingRules((prev) => [...prev, rule]);
        return rule;
      }
    } catch (error) {
      console.error("Failed to create ducking rule:", error);
    }
  }, [projectId]);

  const updateDuckingRule = useCallback(async (id: string, updates: Partial<AudioDucking>) => {
    try {
      const response = await fetch(`/api/audio/ducking/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        const updated = await response.json();
        setDuckingRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
        return updated;
      }
    } catch (error) {
      console.error("Failed to update ducking rule:", error);
    }
  }, []);

  const deleteDuckingRule = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/audio/ducking/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setDuckingRules((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete ducking rule:", error);
    }
  }, []);

  return {
    duckingRules,
    loading,
    loadDuckingRules,
    createDuckingRule,
    updateDuckingRule,
    deleteDuckingRule,
  };
}

// ============================================
// NOISE REDUCTION HOOK
// ============================================

export interface NoiseProfile {
  id: string;
  userId: string;
  name: string;
  profileData: number[];
}

export function useNoiseReduction(userId: string) {
  const [profiles, setProfiles] = useState<NoiseProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/audio/noise-profiles?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error("Failed to load noise profiles:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createProfile = useCallback(async (name: string, profileData: number[]) => {
    try {
      const response = await fetch("/api/audio/noise-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name, profileData }),
      });
      if (response.ok) {
        const profile = await response.json();
        setProfiles((prev) => [...prev, profile]);
        return profile;
      }
    } catch (error) {
      console.error("Failed to create noise profile:", error);
    }
  }, [userId]);

  const deleteProfile = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/audio/noise-profiles/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete noise profile:", error);
    }
  }, []);

  const captureNoiseProfile = useCallback(async (audioBuffer: AudioBuffer, startTime: number, endTime: number) => {
    // Extract noise sample from audio buffer
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Perform FFT to get frequency spectrum (simplified)
    const noiseData = channelData.slice(startSample, endSample);
    const profileData = analyzeNoiseSpectrum(noiseData);

    return profileData;
  }, []);

  return {
    profiles,
    loading,
    loadProfiles,
    createProfile,
    deleteProfile,
    captureNoiseProfile,
  };
}

// Simplified noise spectrum analysis
function analyzeNoiseSpectrum(data: Float32Array): number[] {
  // This is a placeholder - real implementation would use FFT
  const spectrum: number[] = [];
  const bands = 32; // Number of frequency bands
  const blockSize = Math.floor(data.length / bands);

  for (let i = 0; i < bands; i++) {
    const start = i * blockSize;
    const end = start + blockSize;
    let sum = 0;

    for (let j = start; j < end; j++) {
      sum += Math.abs(data[j]);
    }

    spectrum.push(sum / blockSize);
  }

  return spectrum;
}

// ============================================
// AUDIO MIXING HOOK
// ============================================

export interface AudioMixing {
  trackIndex: number;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
}

export interface MasterAudio {
  masterVolume: number;
  masterPan: number;
  limiterEnabled: boolean;
  limiterThreshold: number;
  normalizeOnExport: boolean;
}

export function useAudioMixing(projectId: string) {
  const [trackMixing, setTrackMixing] = useState<Map<number, AudioMixing>>(new Map());
  const [masterAudio, setMasterAudio] = useState<MasterAudio | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMixing = useCallback(async () => {
    setLoading(true);
    try {
      const [trackResponse, masterResponse] = await Promise.all([
        fetch(`/api/audio/mixing?projectId=${projectId}`),
        fetch(`/api/audio/master/${projectId}`),
      ]);

      if (trackResponse.ok) {
        const tracks = await trackResponse.json();
        const mixingMap = new Map<number, AudioMixing>();
        tracks.forEach((track: AudioMixing) => {
          mixingMap.set(track.trackIndex, track);
        });
        setTrackMixing(mixingMap);
      }

      if (masterResponse.ok) {
        const master = await masterResponse.json();
        setMasterAudio(master);
      }
    } catch (error) {
      console.error("Failed to load audio mixing:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const updateTrackMixing = useCallback(async (trackIndex: number, updates: Partial<AudioMixing>) => {
    try {
      const response = await fetch(`/api/audio/mixing/${trackIndex}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, projectId, trackIndex }),
      });
      if (response.ok) {
        const updated = await response.json();
        setTrackMixing((prev) => new Map(prev).set(trackIndex, updated));
        return updated;
      }
    } catch (error) {
      console.error("Failed to update track mixing:", error);
    }
  }, [projectId]);

  const updateMasterAudio = useCallback(async (updates: Partial<MasterAudio>) => {
    try {
      const response = await fetch(`/api/audio/master/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, projectId }),
      });
      if (response.ok) {
        const updated = await response.json();
        setMasterAudio(updated);
        return updated;
      }
    } catch (error) {
      console.error("Failed to update master audio:", error);
    }
  }, [projectId]);

  return {
    trackMixing,
    masterAudio,
    loading,
    loadMixing,
    updateTrackMixing,
    updateMasterAudio,
  };
}