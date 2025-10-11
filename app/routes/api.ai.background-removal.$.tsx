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
    const removal = await AIRepository.getBackgroundRemoval(scrubberId);
    return json({ removal });
  } catch (error) {
    console.error("Error loading background removal:", error);
    return json({ error: "Failed to load background removal" }, { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);

  try {
    const method = request.method;
    const path = params["*"] || "";

    if (method === "POST" && path === "apply") {
      const { projectId, scrubberId, settings } = await request.json();
      if (!projectId || !scrubberId || !settings) {
        return json({ error: "Missing required fields" }, { status: 400 });
      }

      const removalId = await AIRepository.createBackgroundRemoval(projectId, scrubberId, settings);
      
      // TODO: Trigger background removal processing
      return json({ removalId, status: "pending" });
    }

    if (method === "PUT") {
      const scrubberId = path;
      const { updates } = await request.json();
      
      await AIRepository.updateBackgroundRemoval(scrubberId, updates);
      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in background removal action:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}