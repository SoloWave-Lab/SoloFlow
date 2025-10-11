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
    const detection = await AIRepository.getSceneDetection(assetId);
    return json({ detection });
  } catch (error) {
    console.error("Error loading scene detection:", error);
    return json({ error: "Failed to load scene detection" }, { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);

  try {
    const method = request.method;
    const path = params["*"] || "";

    if (method === "POST" && path === "run") {
      const { projectId, assetId, settings } = await request.json();
      if (!projectId || !assetId || !settings) {
        return json({ error: "Missing required fields" }, { status: 400 });
      }

      const detectionId = await AIRepository.createSceneDetection(projectId, assetId, settings);
      
      // TODO: Trigger scene detection processing
      return json({ detectionId, status: "pending" });
    }

    if (method === "POST" && path.includes("/apply")) {
      const detectionId = path.split("/")[0];
      
      // TODO: Apply scene splits to timeline
      return json({ error: "Apply not yet implemented" }, { status: 501 });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in scene detection action:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}