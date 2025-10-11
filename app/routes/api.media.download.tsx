import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { url, filename, projectId, type } = body;

    if (!url || !filename || !projectId || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: url, filename, projectId, type" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Download the file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    
    // Save to the 'out' directory where the render server serves media from
    const uploadDir = join(process.cwd(), "out");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save the file
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, Buffer.from(buffer));

    // Return the URLs (render server serves from /media/)
    const mediaUrl = `/media/${filename}`;
    const fullUrl = `http://localhost:8000${mediaUrl}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: mediaUrl,
        fullUrl,
        filename,
        type,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Download error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to download media",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function loader() {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}