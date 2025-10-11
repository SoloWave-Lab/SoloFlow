// AI Models configuration
export const AI_MODELS: Record<string, string[]> = {
  gemini: [
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-exp-1206",
    "gemini-2.0-flash-thinking-exp-1219",
  ],
  openrouter: [
    "openai/gpt-4-turbo",
    "google/gemini-2.5-flash-image-preview",
    "deepseek/deepseek-r1-0528:free",
    "tngtech/deepseek-r1t2-chimera:free",
    "x-ai/grok-code-fast-1",
    "google/gemini-2.5-flash-image",
    "nvidia/nemotron-nano-9b-v2:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "google/gemma-3-4b-it:free",
    "z-ai/glm-4.5-air:free",
  ],
  freepik: [
    "flux-dev",
    "flux-pro-v1-1",
    "hyperflux",
    "mystic",
    "seedream",
    "gemini-2-5-flash-image-preview",
    "imagen3",
    "seedream-v4",
    //video genrater models which is image-to-video
/*  "kling-v2-5-pro",
    "minimax-hailuo-02-768p",
    "pixverse-v5",
    "wan-v2-2-720p",*/
  ],
  replicate: [
    "black-forest-labs/flux-1.1-pro",
    "google/veo-3-fast",
    "stability-ai/stable-diffusion-3.5-large",
    "google/nano-banana",
  ],
  runwayml: [
    // Image generation models
    "gen4_image_turbo",
    "gen4_image",
    "gemini_2.5_flash",
    // Video generation models
    "gen4_turbo",
    "gen3a_turbo",
    "veo3",
    "gen4_aleph", // video-to-video
    // Utility models
    "upscale_v1",
    "act_two", // character performance
  ],
  rapidapi: [
    "chatgpt-api",
    "gpt-4-api",
    "text-to-speech",
    "image-generation",
  ],
};