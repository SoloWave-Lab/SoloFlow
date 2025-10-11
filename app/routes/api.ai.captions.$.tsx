import { data as json, type ActionFunctionArgs } from '~/lib/router-utils';
import { AIRepository } from "~/lib/ai.repo";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);

  const assetId = params["*"];
  if (!assetId) {
    return json({ error: "Asset ID required" }, { status: 400 });
  }

  try {
    const captions = await AIRepository.getAutoCaptionsForAsset(assetId);
    return json({ captions });
  } catch (error) {
    console.error("Error loading captions:", error);
    return json({ error: "Failed to load captions" }, { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);

  try {
    const method = request.method;
    const url = new URL(request.url);
    const path = params["*"] || "";

    if (method === "POST" && path === "generate") {
      const { assetId, projectId, settings } = await request.json();
      if (!assetId || !projectId || !settings) {
        return json({ error: "Missing required fields" }, { status: 400 });
      }

      const captionId = await AIRepository.createAutoCaption(projectId, assetId, settings);
      
      // TODO: Trigger background job to process captions
      // For now, just return the ID
      return json({ captionId, status: "pending" });
    }

    if (method === "POST" && path.includes("/edit")) {
      const captionId = path.split("/")[0];
      const { startTime, endTime, text, confidence } = await request.json();
      
      await AIRepository.addCaptionEdit(captionId, startTime, endTime, text, confidence);
      return json({ success: true });
    }

    if (method === "POST" && path.includes("/export")) {
      const captionId = path.split("/")[0];
      const { format } = await request.json();
      
      // TODO: Implement caption export (SRT, VTT, etc.)
      return json({ error: "Export not yet implemented" }, { status: 501 });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in captions action:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}