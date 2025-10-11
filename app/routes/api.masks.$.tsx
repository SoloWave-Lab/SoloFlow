import { data as json, type ActionFunctionArgs } from '~/lib/router-utils';
import { MasksRepository } from "~/lib/masks.repo";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);

  const url = new URL(request.url);
  const projectId = params["*"]?.split('/')[0];
  const scrubberId = params["*"]?.split('/')[1];

  if (!projectId || !scrubberId) {
    return json({ error: "Missing projectId or scrubberId" }, { status: 400 });
  }

  try {
    const masks = await MasksRepository.getMasksForScrubber(projectId, scrubberId);
    return json({ masks });
  } catch (error) {
    console.error("Error loading masks:", error);
    return json({ error: "Failed to load masks" }, { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);

  const url = new URL(request.url);
  const projectId = params["*"]?.split('/')[0];
  const scrubberId = params["*"]?.split('/')[1];

  if (!projectId || !scrubberId) {
    return json({ error: "Missing projectId or scrubberId" }, { status: 400 });
  }

  try {
    const method = request.method;

    if (method === "POST") {
      const { mask } = await request.json();
      if (!mask) {
        return json({ error: "Mask data required" }, { status: 400 });
      }

      const newMask = await MasksRepository.createMask(projectId, scrubberId, mask);
      return json({ mask: newMask });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in masks action:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}