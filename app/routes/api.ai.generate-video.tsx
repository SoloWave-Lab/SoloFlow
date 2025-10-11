import { aiService } from "~/lib/ai-providers.server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import axios from "axios";

interface GenerateVideoRequest {
  prompt: string;
  ai_provider: string;
  ai_model: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  project_id: string;
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: GenerateVideoRequest = await request.json();
    const { prompt, ai_provider, ai_model, duration, width, height, fps, project_id } = body;

    if (!prompt || !ai_provider || !ai_model || !project_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: prompt, ai_provider, ai_model, project_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[AI Video Generation] Provider: ${ai_provider}, Model: ${ai_model}, Prompt: ${prompt}`);

    // Generate video using AI service
    const videoUrl = await aiService.generateVideo(
      { provider: ai_provider, model: ai_model },
      {
        prompt,
        duration: duration || 5,
        width: width || 1280,
        height: height || 720,
        fps: fps || 24,
      }
    );

    if (!videoUrl) {
      throw new Error("Failed to generate video - no URL returned");
    }

    // Download the video
    const videoResponse = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      timeout: 300000, // 5 minutes timeout for large videos
    });

    const videoBuffer = Buffer.from(videoResponse.data);

    // Save to uploads directory
    const uploadsDir = join(process.cwd(), "public", "uploads", project_id);
    await mkdir(uploadsDir, { recursive: true });

    const filename = `ai-generated-${randomUUID()}.mp4`;
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, videoBuffer);

    const publicUrl = `/uploads/${project_id}/${filename}`;

    // Calculate duration in frames
    const videoDuration = duration || 5;
    const videoFps = fps || 24;
    const durationInFrames = videoDuration * videoFps;

    return new Response(
      JSON.stringify({
        success: true,
        media: {
          id: randomUUID(),
          type: "video",
          name: `AI Generated: ${prompt.substring(0, 30)}...`,
          url: publicUrl,
          duration: videoDuration,
          width: width || 1280,
          height: height || 720,
          fps: videoFps,
          durationInFrames,
          thumbnail: publicUrl,
          createdAt: new Date().toISOString(),
          aiGenerated: true,
          aiPrompt: prompt,
          aiProvider: ai_provider,
          aiModel: ai_model,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[AI Video Generation] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate video",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function loader() {
  return new Response(
    JSON.stringify({ error: "GET method not supported for this endpoint" }),
    {
      status: 405,
      headers: { "Content-Type": "application/json" },
    }
  );
}