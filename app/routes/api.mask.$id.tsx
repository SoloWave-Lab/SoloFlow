import { data as json, type ActionFunctionArgs } from '~/lib/router-utils';
import { MasksRepository } from "~/lib/masks.repo";
import { requireAuth } from "~/lib/auth.server";

export async function action({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);

  const maskId = params.id;
  if (!maskId) {
    return json({ error: "Mask ID required" }, { status: 400 });
  }

  try {
    const method = request.method;

    if (method === "PUT") {
      const { updates } = await request.json();
      if (!updates) {
        return json({ error: "Updates data required" }, { status: 400 });
      }

      await MasksRepository.updateMask(maskId, updates);
      return json({ success: true });
    }

    if (method === "DELETE") {
      await MasksRepository.deleteMask(maskId);
      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in mask action:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}