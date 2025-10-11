import { aiService } from "~/lib/ai-providers.server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import axios from "axios";

interface GenerateImageRequest {
  prompt: string;
  ai_provider: string;
  ai_model: string;
  width?: number;
  height?: number;
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
    const body: GenerateImageRequest = await request.json();
    const { prompt, ai_provider, ai_model, width, height, project_id } = body;

    if (!prompt || !ai_provider || !ai_model || !project_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: prompt, ai_provider, ai_model, project_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[AI Image Generation] Provider: ${ai_provider}, Model: ${ai_model}, Prompt: ${prompt}`);

    // Generate image using AI service
    const imageUrl = await aiService.generateImage(
      { provider: ai_provider, model: ai_model },
      {
        prompt,
        width: width || 1024,
        height: height || 1024,
        num_outputs: 1,
      }
    );

    if (!imageUrl) {
      throw new Error("Failed to generate image - no URL returned");
    }

    // Download the image
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });

    const imageBuffer = Buffer.from(imageResponse.data);

    // Save to uploads directory
    const uploadsDir = join(process.cwd(), "public", "uploads", project_id);
    await mkdir(uploadsDir, { recursive: true });

    const filename = `ai-generated-${randomUUID()}.png`;
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, imageBuffer);

    const publicUrl = `/uploads/${project_id}/${filename}`;

    // Get image dimensions
    const imageWidth = width || 1024;
    const imageHeight = height || 1024;

    return new Response(
      JSON.stringify({
        success: true,
        media: {
          id: randomUUID(),
          type: "image",
          name: `AI Generated: ${prompt.substring(0, 30)}...`,
          url: publicUrl,
          duration: 0,
          width: imageWidth,
          height: imageHeight,
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
    console.error("[AI Image Generation] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate image",
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