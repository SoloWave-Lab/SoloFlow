import { data as json, type ActionFunctionArgs } from '~/lib/router-utils';
import { MasksRepository } from "~/lib/masks.repo";
import { requireAuth } from "~/lib/auth.server";

export async function action({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);

  const layerId = params.id;
  if (!layerId) {
    return json({ error: "Layer ID required" }, { status: 400 });
  }

  try {
    const method = request.method;

    if (method === "PUT") {
      const { updates } = await request.json();
      if (!updates) {
        return json({ error: "Updates data required" }, { status: 400 });
      }

      await MasksRepository.updateAdjustmentLayer(layerId, updates);
      return json({ success: true });
    }

    if (method === "DELETE") {
      await MasksRepository.deleteAdjustmentLayer(layerId);
      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in adjustment layer action:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}