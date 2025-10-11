import { data as json, type ActionFunctionArgs } from '~/lib/router-utils';
import { AIRepository } from "~/lib/ai.repo";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);

  const scrubberId = params["*"];
  if (!scrubberId) {
    return json({ error: "Scrubber ID required" }, { status: 400 });
  }

  try {
    const crop = await AIRepository.getSmartCrop(scrubberId);
    return json({ crop });
  } catch (error) {
    console.error("Error loading smart crop:", error);
    return json({ error: "Failed to load smart crop" }, { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);

  try {
    const method = request.method;
    const path = params["*"] || "";

    if (method === "POST" && path === "apply") {
      const { projectId, scrubberId, aspectRatio } = await request.json();
      if (!projectId || !scrubberId) {
        return json({ error: "Missing required fields" }, { status: 400 });
      }

      const cropId = await AIRepository.createSmartCrop(projectId, scrubberId, aspectRatio);
      
      // TODO: Trigger smart crop processing
      return json({ cropId, status: "pending" });
    }

    if (method === "PUT") {
      const scrubberId = path;
      const { updates } = await request.json();
      
      await AIRepository.updateSmartCrop(scrubberId, updates);
      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in smart crop action:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}