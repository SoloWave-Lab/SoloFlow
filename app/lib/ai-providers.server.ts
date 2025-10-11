/**
 * AI Providers Service Layer
 * Handles all AI provider integrations for chat, image generation, and video generation
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Replicate from "replicate";
import axios from "axios";

// ============================================================================
// Types
// ============================================================================

export interface AIProviderConfig {
  provider: string;
  model: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ImageGenerationParams {
  prompt: string;
  width?: number;
  height?: number;
  num_outputs?: number;
}

export interface VideoGenerationParams {
  prompt: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
}

// ============================================================================
// Environment Variables
// ============================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY || "";
const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || "";
const RUNWAYML_API_KEY = process.env.RUNWAYML_API_KEY || "";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";

// ============================================================================
// Gemini Provider
// ============================================================================

class GeminiProvider {
  private client: GoogleGenerativeAI;

  constructor() {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    this.client = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  async chat(messages: ChatMessage[], model: string = "gemini-2.0-flash-exp"): Promise<string> {
    const genModel = this.client.getGenerativeModel({ model });
    
    // Convert messages to Gemini format
    const lastMessage = messages[messages.length - 1];
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = genModel.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  }

  async generateImage(params: ImageGenerationParams): Promise<string> {
    // Gemini doesn't support image generation directly
    // We'll use Imagen through Vertex AI or return an error
    throw new Error("Gemini does not support direct image generation. Please use another provider.");
  }
}

// ============================================================================
// OpenRouter Provider
// ============================================================================

class OpenRouterProvider {
  private client: OpenAI;

  constructor() {
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }
    this.client = new OpenAI({
      apiKey: OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  async chat(messages: ChatMessage[], model: string = "tngtech/deepseek-r1t2-chimera:free"): Promise<string> {
    const response = await this.client.chat.completions.create({
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    return response.choices[0]?.message?.content || "";
  }

  async generateImage(params: ImageGenerationParams, model: string = "openai/dall-e-3"): Promise<string> {
    // OpenRouter supports some image generation models
    const response = await this.client.images.generate({
      model,
      prompt: params.prompt,
      n: params.num_outputs || 1,
      size: `${params.width || 1024}x${params.height || 1024}` as any,
    });

    return response.data[0]?.url || "";
  }
}

// ============================================================================
// Freepik Provider
// ============================================================================

class FreepikProvider {
  private apiKey: string;
  private baseURL = "https://api.freepik.com/v1";

  constructor() {
    if (!FREEPIK_API_KEY) {
      throw new Error("FREEPIK_API_KEY is not configured");
    }
    this.apiKey = FREEPIK_API_KEY;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    // Freepik doesn't have a chat API, return error
    throw new Error("Freepik does not support chat. Please use it for image generation only.");
  }

  async generateImage(params: ImageGenerationParams, model: string = "seedream-v4"): Promise<string> {
    // Map model names to Freepik endpoints
    const modelEndpoints: Record<string, string> = {
      "flux-dev": "flux-dev",
      "flux-pro-v1-1": "flux-pro-v1-1",
      "hyperflux": "hyperflux",
      "mystic": "mystic",
      "seedream": "seedream",
      "seedream-v4": "seedream-v4",
      "gemini-2-5-flash-image-preview": "gemini-2-5-flash",
      "imagen3": "imagen3",
    };

    const endpoint = modelEndpoints[model] || "seedream-v4";

    try {
      const response = await axios.post(
        `${this.baseURL}/ai/text-to-image/${endpoint}`,
        {
          prompt: params.prompt,
          num_images: params.num_outputs || 1,
          image: {
            size: {
              width: params.width || 1024,
              height: params.height || 1024,
            },
          },
        },
        {
          headers: {
            "x-freepik-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      // Handle async task-based responses (like seedream-v4)
      if (response.data?.data?.task_id) {
        const taskId = response.data.data.task_id;
        // Poll for completion
        return await this.pollTaskCompletion(endpoint, taskId);
      }

      // Handle direct image URL responses
      return response.data?.data?.[0]?.image?.url || response.data?.data?.image?.url || "";
    } catch (error) {
      console.error("[Freepik] Image generation error:", error);
      throw new Error(`Freepik image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async pollTaskCompletion(endpoint: string, taskId: string, maxAttempts: number = 30): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      try {
        const response = await axios.get(
          `${this.baseURL}/ai/text-to-image/${endpoint}/${taskId}`,
          {
            headers: {
              "x-freepik-api-key": this.apiKey,
            },
          }
        );

        const status = response.data?.data?.status;
        if (status === "completed" || status === "success") {
          return response.data?.data?.image?.url || response.data?.data?.images?.[0]?.url || "";
        } else if (status === "failed" || status === "error") {
          throw new Error("Image generation failed");
        }
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
      }
    }
    throw new Error("Image generation timed out");
  }
}

// ============================================================================
// Replicate Provider
// ============================================================================

class ReplicateProvider {
  private client: Replicate;

  constructor() {
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY is not configured");
    }
    this.client = new Replicate({
      auth: REPLICATE_API_KEY,
    });
  }

  async chat(messages: ChatMessage[], model: string = "meta/llama-2-70b-chat"): Promise<string> {
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n");
    
    const output = await this.client.run(model as any, {
      input: { prompt },
    });

    return Array.isArray(output) ? output.join("") : String(output);
  }

  async generateImage(params: ImageGenerationParams, model: string = "stability-ai/sdxl"): Promise<string> {
    const output = await this.client.run(model as any, {
      input: {
        prompt: params.prompt,
        width: params.width || 1024,
        height: params.height || 1024,
        num_outputs: params.num_outputs || 1,
      },
    });

    return Array.isArray(output) ? output[0] : String(output);
  }

  async generateVideo(params: VideoGenerationParams, model: string = "stability-ai/stable-video-diffusion"): Promise<string> {
    const output = await this.client.run(model as any, {
      input: {
        prompt: params.prompt,
        fps: params.fps || 24,
        num_frames: (params.duration || 3) * (params.fps || 24),
      },
    });

    return Array.isArray(output) ? output[0] : String(output);
  }
}

// ============================================================================
// RunwayML Provider
// ============================================================================

class RunwayMLProvider {
  private apiKey: string;
  private baseURL = "https://api.dev.runwayml.com/v1";
  private apiVersion = "2024-11-06";

  constructor() {
    if (!RUNWAYML_API_KEY) {
      throw new Error("RUNWAYML_API_KEY is not configured");
    }
    this.apiKey = RUNWAYML_API_KEY;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    throw new Error("RunwayML does not support chat. Please use it for image/video generation only.");
  }

  async generateImage(params: ImageGenerationParams, model: string = "gen4_image_turbo"): Promise<string> {
    console.log(`[RunwayML] Generating image with model: ${model}`);

    // Determine appropriate ratio based on dimensions
    const width = params.width || 1024;
    const height = params.height || 1024;
    let ratio = "1024:1024";
    
    if (model === "gen4_image_turbo" || model === "gen4_image") {
      // Gen4 image models support various ratios
      if (width === 1920 && height === 1080) ratio = "1920:1080";
      else if (width === 1080 && height === 1920) ratio = "1080:1920";
      else if (width === 1280 && height === 720) ratio = "1280:720";
      else if (width === 720 && height === 1280) ratio = "720:1280";
      else ratio = "1024:1024";
    } else if (model === "gemini_2.5_flash") {
      // Gemini flash supports different ratios
      if (width === 1344 && height === 768) ratio = "1344:768";
      else if (width === 768 && height === 1344) ratio = "768:1344";
      else if (width === 1184 && height === 864) ratio = "1184:864";
      else if (width === 864 && height === 1184) ratio = "864:1184";
      else ratio = "1024:1024";
    }

    // Create image generation task
    const createResponse = await axios.post(
      `${this.baseURL}/text_to_image`,
      {
        promptText: params.prompt,
        model,
        ratio,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-Runway-Version": this.apiVersion,
          "Content-Type": "application/json",
        },
      }
    );

    const taskId = createResponse.data.id;
    console.log(`[RunwayML] Image task created: ${taskId}`);

    // Poll for completion
    return await this.pollTaskCompletion(taskId);
  }

  async generateVideo(params: VideoGenerationParams, model: string = "gen4_turbo"): Promise<string> {
    console.log(`[RunwayML] Generating video with model: ${model}`);

    // Determine appropriate ratio based on dimensions
    const width = params.width || 1280;
    const height = params.height || 720;
    let ratio = "1280:720";
    
    if (model === "gen4_turbo") {
      // Gen4 turbo supports various ratios
      if (width === 1280 && height === 720) ratio = "1280:720";
      else if (width === 720 && height === 1280) ratio = "720:1280";
      else if (width === 1104 && height === 832) ratio = "1104:832";
      else if (width === 832 && height === 1104) ratio = "832:1104";
      else if (width === 960 && height === 960) ratio = "960:960";
      else if (width === 1584 && height === 672) ratio = "1584:672";
      else ratio = "1280:720";
    } else if (model === "gen3a_turbo") {
      // Gen3a turbo supports limited ratios
      if (width === 1280 && height === 768) ratio = "1280:768";
      else if (width === 768 && height === 1280) ratio = "768:1280";
      else ratio = "1280:768";
    } else if (model === "veo3") {
      // Veo3 supports limited ratios
      if (width === 720 && height === 1280) ratio = "720:1280";
      else ratio = "1280:720";
    }

    // Determine duration based on model
    let duration = params.duration || 5;
    if (model === "veo3") {
      duration = 8; // Veo3 requires 8 seconds
    } else if (model === "gen3a_turbo") {
      duration = duration >= 10 ? 10 : 5; // Gen3a supports 5 or 10
    } else if (model === "gen4_turbo") {
      duration = Math.min(Math.max(duration, 2), 10); // Gen4 supports 2-10
    }

    // Create video generation task (text-to-video)
    const endpoint = model === "veo3" ? "text_to_video" : "image_to_video";
    const requestBody: any = {
      promptText: params.prompt,
      model,
      ratio,
      duration,
    };

    // For image_to_video, we need a prompt image (we'll use a placeholder or skip this for text-only)
    if (endpoint === "image_to_video") {
      // For now, we'll use text_to_video approach for gen4_turbo if no image provided
      // In production, you might want to generate an initial frame first
      console.log(`[RunwayML] Note: ${model} typically requires an image. Using text-only generation.`);
    }

    const createResponse = await axios.post(
      `${this.baseURL}/${endpoint}`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-Runway-Version": this.apiVersion,
          "Content-Type": "application/json",
        },
      }
    );

    const taskId = createResponse.data.id;
    console.log(`[RunwayML] Video task created: ${taskId}`);

    // Poll for completion
    return await this.pollTaskCompletion(taskId);
  }

  private async pollTaskCompletion(taskId: string): Promise<string> {
    const maxAttempts = 60; // 5 minutes max (5 seconds * 60)
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      const statusResponse = await axios.get(`${this.baseURL}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-Runway-Version": this.apiVersion,
        },
      });

      const status = statusResponse.data.status;
      console.log(`[RunwayML] Task ${taskId} status: ${status} (attempt ${attempts}/${maxAttempts})`);

      if (status === "SUCCEEDED") {
        const output = statusResponse.data.output;
        // Handle different output formats
        if (Array.isArray(output)) {
          return output[0]; // Return first output URL
        } else if (typeof output === "string") {
          return output;
        } else if (output && output.url) {
          return output.url;
        } else {
          throw new Error("Unexpected output format from RunwayML");
        }
      } else if (status === "FAILED") {
        const failure = statusResponse.data.failure;
        throw new Error(`RunwayML task failed: ${failure?.reason || "Unknown error"}`);
      } else if (status === "CANCELED") {
        throw new Error("RunwayML task was canceled");
      }
      // Continue polling for PENDING, RUNNING, THROTTLED statuses
    }

    throw new Error("RunwayML task timed out after 5 minutes");
  }
}

// ============================================================================
// RapidAPI Provider
// ============================================================================

class RapidAPIProvider {
  private apiKey: string;

  constructor() {
    if (!RAPIDAPI_KEY) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }
    this.apiKey = RAPIDAPI_KEY;
  }

  async chat(messages: ChatMessage[], model: string = "chatgpt-api"): Promise<string> {
    const response = await axios.post(
      `https://chatgpt-api8.p.rapidapi.com/`,
      {
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      },
      {
        headers: {
          "x-rapidapi-key": this.apiKey,
          "x-rapidapi-host": "chatgpt-api8.p.rapidapi.com",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data?.choices?.[0]?.message?.content || "";
  }

  async generateImage(params: ImageGenerationParams): Promise<string> {
    const response = await axios.post(
      `https://ai-image-generator3.p.rapidapi.com/generate`,
      {
        prompt: params.prompt,
        width: params.width || 1024,
        height: params.height || 1024,
      },
      {
        headers: {
          "x-rapidapi-key": this.apiKey,
          "x-rapidapi-host": "ai-image-generator3.p.rapidapi.com",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data?.url || "";
  }
}

// ============================================================================
// Main AI Service
// ============================================================================

export class AIService {
  private providers: Map<string, any>;

  constructor() {
    this.providers = new Map();
  }

  private getProvider(providerName: string) {
    if (this.providers.has(providerName)) {
      return this.providers.get(providerName);
    }

    let provider;
    switch (providerName.toLowerCase()) {
      case "gemini":
        provider = new GeminiProvider();
        break;
      case "openrouter":
        provider = new OpenRouterProvider();
        break;
      case "freepik":
        provider = new FreepikProvider();
        break;
      case "replicate":
        provider = new ReplicateProvider();
        break;
      case "runwayml":
        provider = new RunwayMLProvider();
        break;
      case "rapidapi":
        provider = new RapidAPIProvider();
        break;
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }

    this.providers.set(providerName, provider);
    return provider;
  }

  async chat(config: AIProviderConfig, messages: ChatMessage[]): Promise<string> {
    const provider = this.getProvider(config.provider);
    return await provider.chat(messages, config.model);
  }

  async generateImage(config: AIProviderConfig, params: ImageGenerationParams): Promise<string> {
    const provider = this.getProvider(config.provider);
    return await provider.generateImage(params, config.model);
  }

  async generateVideo(config: AIProviderConfig, params: VideoGenerationParams): Promise<string> {
    const provider = this.getProvider(config.provider);
    
    if (!provider.generateVideo) {
      throw new Error(`Provider ${config.provider} does not support video generation`);
    }

    return await provider.generateVideo(params, config.model);
  }
}

// Export singleton instance
export const aiService = new AIService();