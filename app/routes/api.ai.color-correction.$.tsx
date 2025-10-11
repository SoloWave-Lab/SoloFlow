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
    const correction = await AIRepository.getAutoColorCorrection(scrubberId);
    return json({ correction });
  } catch (error) {
    console.error("Error loading color correction:", error);
    return json({ error: "Failed to load color correction" }, { status: 500 });
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

      const correctionId = await AIRepository.createAutoColorCorrection(projectId, scrubberId, settings);
      
      // TODO: Trigger AI color correction processing
      return json({ correctionId, status: "pending" });
    }

    if (method === "PUT") {
      const scrubberId = path;
      const { updates } = await request.json();
      
      await AIRepository.updateAutoColorCorrection(scrubberId, updates);
      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in color correction action:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}