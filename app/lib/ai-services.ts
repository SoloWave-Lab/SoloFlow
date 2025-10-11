/**
 * AI Services Integration Layer
 * Handles integration with various AI models for video processing
 */

import axios from 'axios';
import { AIRepository } from './ai.repo';

// ============================================
// TYPES
// ============================================

export interface WhisperTranscription {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
  language: string;
}

export interface BackgroundRemovalResult {
  maskUrl: string;
  processedVideoUrl: string;
  confidence: number;
}

export interface SceneDetectionResult {
  scenes: Array<{
    startTime: number;
    endTime: number;
    confidence: number;
    thumbnail?: string;
  }>;
}

export interface ColorCorrectionResult {
  correctionData: {
    brightness: number;
    contrast: number;
    saturation: number;
    temperature: number;
    tint: number;
    exposure: number;
    highlights: number;
    shadows: number;
  };
  beforePreview: string;
  afterPreview: string;
}

export interface SmartCropResult {
  cropData: {
    x: number;
    y: number;
    width: number;
    height: number;
    keyframes: Array<{
      time: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  };
}

// ============================================
// AI SERVICE CONFIGURATION
// ============================================

const AI_SERVICE_CONFIG = {
  whisper: {
    endpoint: process.env.WHISPER_API_ENDPOINT || 'http://localhost:5000/transcribe',
    apiKey: process.env.WHISPER_API_KEY || '',
    model: 'whisper-large-v3'
  },
  googleSpeech: {
    endpoint: 'https://speech.googleapis.com/v1/speech:recognize',
    apiKey: process.env.GOOGLE_SPEECH_API_KEY || '',
  },
  azureSpeech: {
    endpoint: process.env.AZURE_SPEECH_ENDPOINT || '',
    apiKey: process.env.AZURE_SPEECH_API_KEY || '',
    region: process.env.AZURE_SPEECH_REGION || 'eastus'
  },
  awsTranscribe: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  },
  u2net: {
    endpoint: process.env.U2NET_API_ENDPOINT || 'http://localhost:5001/remove-background',
  },
  modnet: {
    endpoint: process.env.MODNET_API_ENDPOINT || 'http://localhost:5002/remove-background',
  },
  backgroundMattingV2: {
    endpoint: process.env.BG_MATTING_API_ENDPOINT || 'http://localhost:5003/remove-background',
  },
  sceneDetection: {
    endpoint: process.env.SCENE_DETECTION_ENDPOINT || 'http://localhost:5004/detect-scenes',
  },
  colorCorrection: {
    endpoint: process.env.COLOR_CORRECTION_ENDPOINT || 'http://localhost:5005/auto-correct',
  },
  smartCrop: {
    endpoint: process.env.SMART_CROP_ENDPOINT || 'http://localhost:5006/smart-crop',
  }
};

// ============================================
// AUTO CAPTIONS SERVICE
// ============================================

export class AutoCaptionsService {
  /**
   * Generate captions using Whisper API
   */
  static async generateWithWhisper(
    audioFilePath: string,
    language: string = 'auto'
  ): Promise<WhisperTranscription> {
    try {
      const formData = new FormData();
      const audioBlob = await fetch(audioFilePath).then(r => r.blob());
      formData.append('audio', audioBlob);
      formData.append('language', language);
      formData.append('model', AI_SERVICE_CONFIG.whisper.model);

      const response = await axios.post(
        AI_SERVICE_CONFIG.whisper.endpoint,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${AI_SERVICE_CONFIG.whisper.apiKey}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000 // 5 minutes
        }
      );

      return response.data;
    } catch (error) {
      console.error('Whisper transcription failed:', error);
      throw new Error('Failed to generate captions with Whisper');
    }
  }

  /**
   * Generate captions using Google Speech-to-Text
   */
  static async generateWithGoogle(
    audioFilePath: string,
    language: string = 'en-US'
  ): Promise<WhisperTranscription> {
    try {
      const audioBlob = await fetch(audioFilePath).then(r => r.blob());
      const audioBase64 = await this.blobToBase64(audioBlob);

      const response = await axios.post(
        `${AI_SERVICE_CONFIG.googleSpeech.endpoint}?key=${AI_SERVICE_CONFIG.googleSpeech.apiKey}`,
        {
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: language,
            enableWordTimeOffsets: true,
            enableAutomaticPunctuation: true
          },
          audio: {
            content: audioBase64
          }
        },
        { timeout: 300000 }
      );

      // Convert Google format to Whisper format
      return this.convertGoogleToWhisperFormat(response.data);
    } catch (error) {
      console.error('Google Speech-to-Text failed:', error);
      throw new Error('Failed to generate captions with Google Speech');
    }
  }

  /**
   * Generate captions using Azure Speech
   */
  static async generateWithAzure(
    audioFilePath: string,
    language: string = 'en-US'
  ): Promise<WhisperTranscription> {
    try {
      const audioBlob = await fetch(audioFilePath).then(r => r.blob());
      
      const response = await axios.post(
        `${AI_SERVICE_CONFIG.azureSpeech.endpoint}/speechtotext/v3.0/transcriptions`,
        audioBlob,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': AI_SERVICE_CONFIG.azureSpeech.apiKey,
            'Content-Type': 'audio/wav'
          },
          params: {
            language: language
          },
          timeout: 300000
        }
      );

      return this.convertAzureToWhisperFormat(response.data);
    } catch (error) {
      console.error('Azure Speech failed:', error);
      throw new Error('Failed to generate captions with Azure Speech');
    }
  }

  /**
   * Generate captions using AWS Transcribe
   */
  static async generateWithAWS(
    audioFilePath: string,
    language: string = 'en-US'
  ): Promise<WhisperTranscription> {
    // Note: AWS Transcribe requires S3 upload first
    // This is a simplified implementation
    throw new Error('AWS Transcribe integration requires S3 setup');
  }

  // Helper methods
  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private static convertGoogleToWhisperFormat(googleData: any): WhisperTranscription {
    const segments = googleData.results?.map((result: any, index: number) => ({
      start: result.alternatives[0].words?.[0]?.startTime?.seconds || index * 5,
      end: result.alternatives[0].words?.[result.alternatives[0].words.length - 1]?.endTime?.seconds || (index + 1) * 5,
      text: result.alternatives[0].transcript,
      confidence: result.alternatives[0].confidence || 0.9
    })) || [];

    return {
      text: segments.map((s: any) => s.text).join(' '),
      segments,
      language: 'en'
    };
  }

  private static convertAzureToWhisperFormat(azureData: any): WhisperTranscription {
    const segments = azureData.recognizedPhrases?.map((phrase: any) => ({
      start: phrase.offsetInTicks / 10000000,
      end: (phrase.offsetInTicks + phrase.durationInTicks) / 10000000,
      text: phrase.nBest[0].display,
      confidence: phrase.nBest[0].confidence
    })) || [];

    return {
      text: segments.map((s: any) => s.text).join(' '),
      segments,
      language: azureData.locale || 'en'
    };
  }
}

// ============================================
// BACKGROUND REMOVAL SERVICE
// ============================================

export class BackgroundRemovalService {
  /**
   * Remove background using U2Net model
   */
  static async removeWithU2Net(
    videoFilePath: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<BackgroundRemovalResult> {
    try {
      const formData = new FormData();
      const videoBlob = await fetch(videoFilePath).then(r => r.blob());
      formData.append('video', videoBlob);
      formData.append('quality', quality);

      const response = await axios.post(
        AI_SERVICE_CONFIG.u2net.endpoint,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 600000 // 10 minutes
        }
      );

      return response.data;
    } catch (error) {
      console.error('U2Net background removal failed:', error);
      throw new Error('Failed to remove background with U2Net');
    }
  }

  /**
   * Remove background using MODNet model
   */
  static async removeWithMODNet(
    videoFilePath: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<BackgroundRemovalResult> {
    try {
      const formData = new FormData();
      const videoBlob = await fetch(videoFilePath).then(r => r.blob());
      formData.append('video', videoBlob);
      formData.append('quality', quality);

      const response = await axios.post(
        AI_SERVICE_CONFIG.modnet.endpoint,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 600000
        }
      );

      return response.data;
    } catch (error) {
      console.error('MODNet background removal failed:', error);
      throw new Error('Failed to remove background with MODNet');
    }
  }

  /**
   * Remove background using BackgroundMattingV2 model
   */
  static async removeWithBackgroundMattingV2(
    videoFilePath: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<BackgroundRemovalResult> {
    try {
      const formData = new FormData();
      const videoBlob = await fetch(videoFilePath).then(r => r.blob());
      formData.append('video', videoBlob);
      formData.append('quality', quality);

      const response = await axios.post(
        AI_SERVICE_CONFIG.backgroundMattingV2.endpoint,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 600000
        }
      );

      return response.data;
    } catch (error) {
      console.error('BackgroundMattingV2 removal failed:', error);
      throw new Error('Failed to remove background with BackgroundMattingV2');
    }
  }

  /**
   * Apply edge refinement to mask
   */
  static async refineEdges(
    maskUrl: string,
    refinementLevel: number = 0.5
  ): Promise<string> {
    // Edge refinement using morphological operations
    // This would typically be done in the AI service
    return maskUrl; // Placeholder
  }
}

// ============================================
// SCENE DETECTION SERVICE
// ============================================

export class SceneDetectionService {
  /**
   * Detect scenes in video
   */
  static async detectScenes(
    videoFilePath: string,
    sensitivity: number = 0.5,
    minSceneDuration: number = 1.0
  ): Promise<SceneDetectionResult> {
    try {
      const formData = new FormData();
      const videoBlob = await fetch(videoFilePath).then(r => r.blob());
      formData.append('video', videoBlob);
      formData.append('sensitivity', sensitivity.toString());
      formData.append('min_duration', minSceneDuration.toString());

      const response = await axios.post(
        AI_SERVICE_CONFIG.sceneDetection.endpoint,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 600000
        }
      );

      return response.data;
    } catch (error) {
      console.error('Scene detection failed:', error);
      throw new Error('Failed to detect scenes');
    }
  }

  /**
   * Generate thumbnails for scenes
   */
  static async generateSceneThumbnails(
    videoFilePath: string,
    scenes: Array<{ startTime: number; endTime: number }>
  ): Promise<string[]> {
    // Generate thumbnails at scene start times
    // This would use FFmpeg or similar
    return []; // Placeholder
  }
}

// ============================================
// AUTO COLOR CORRECTION SERVICE
// ============================================

export class AutoColorCorrectionService {
  /**
   * Apply automatic color correction
   */
  static async autoCorrect(
    videoFilePath: string,
    style: string = 'natural',
    intensity: number = 0.5
  ): Promise<ColorCorrectionResult> {
    try {
      const formData = new FormData();
      const videoBlob = await fetch(videoFilePath).then(r => r.blob());
      formData.append('video', videoBlob);
      formData.append('style', style);
      formData.append('intensity', intensity.toString());

      const response = await axios.post(
        AI_SERVICE_CONFIG.colorCorrection.endpoint,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 600000
        }
      );

      return response.data;
    } catch (error) {
      console.error('Auto color correction failed:', error);
      throw new Error('Failed to apply auto color correction');
    }
  }

  /**
   * Generate before/after preview
   */
  static async generatePreview(
    videoFilePath: string,
    correctionData: any,
    timestamp: number = 0
  ): Promise<{ before: string; after: string }> {
    // Generate side-by-side preview
    return {
      before: '',
      after: ''
    }; // Placeholder
  }
}

// ============================================
// SMART CROP SERVICE
// ============================================

export class SmartCropService {
  /**
   * Apply smart crop/reframe
   */
  static async smartCrop(
    videoFilePath: string,
    aspectRatio: string = '16:9',
    options: {
      contentDetection: boolean;
      faceTracking: boolean;
      objectTracking: boolean;
      sensitivity: number;
    }
  ): Promise<SmartCropResult> {
    try {
      const formData = new FormData();
      const videoBlob = await fetch(videoFilePath).then(r => r.blob());
      formData.append('video', videoBlob);
      formData.append('aspect_ratio', aspectRatio);
      formData.append('options', JSON.stringify(options));

      const response = await axios.post(
        AI_SERVICE_CONFIG.smartCrop.endpoint,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 600000
        }
      );

      return response.data;
    } catch (error) {
      console.error('Smart crop failed:', error);
      throw new Error('Failed to apply smart crop');
    }
  }

  /**
   * Detect content regions in video
   */
  static async detectContentRegions(
    videoFilePath: string
  ): Promise<Array<{ time: number; x: number; y: number; width: number; height: number }>> {
    // Detect important content regions frame by frame
    return []; // Placeholder
  }
}

// ============================================
// AI SERVICE HEALTH CHECK
// ============================================

export class AIServiceHealth {
  /**
   * Check if AI services are available
   */
  static async checkServices(): Promise<Record<string, boolean>> {
    const services = {
      whisper: false,
      googleSpeech: false,
      azureSpeech: false,
      u2net: false,
      modnet: false,
      backgroundMattingV2: false,
      sceneDetection: false,
      colorCorrection: false,
      smartCrop: false
    };

    // Check each service
    for (const [service, config] of Object.entries(AI_SERVICE_CONFIG)) {
      try {
        if ('endpoint' in config) {
          const response = await axios.get(`${config.endpoint}/health`, { timeout: 5000 });
          services[service as keyof typeof services] = response.status === 200;
        }
      } catch (error) {
        services[service as keyof typeof services] = false;
      }
    }

    return services;
  }
}