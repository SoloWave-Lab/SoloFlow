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
    const layers = await MasksRepository.getAdjustmentLayers(projectId);
    return json({ layers });
  } catch (error) {
    console.error("Error loading adjustment layers:", error);
    return json({ error: "Failed to load adjustment layers" }, { status: 500 });
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

    if (method === "POST") {
      const { layer } = await request.json();
      if (!layer) {
        return json({ error: "Layer data required" }, { status: 400 });
      }

      const newLayer = await MasksRepository.createAdjustmentLayer(projectId, layer);
      return json({ layer: newLayer });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in adjustment layers action:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}