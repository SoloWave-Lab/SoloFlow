import { data as json, type ActionFunctionArgs } from '~/lib/router-utils';
import { MasksRepository } from "~/lib/masks.repo";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);

  const projectId = params["*"];
  if (!projectId) {
    return json({ error: "Project ID required" }, { status: 400 });
  }

  try {
    const settings = await MasksRepository.getCompositingSettings(projectId);
    return json({ settings });
  } catch (error) {
    console.error("Error loading compositing settings:", error);
    return json({ error: "Failed to load compositing settings" }, { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);

  const projectId = params["*"];
  if (!projectId) {
    return json({ error: "Project ID required" }, { status: 400 });
  }

  try {
    const method = request.method;

    if (method === "PUT") {
      const { updates } = await request.json();
      if (!updates) {
        return json({ error: "Updates data required" }, { status: 400 });
      }

      await MasksRepository.updateCompositingSettings(projectId, updates);
      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in compositing settings action:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}