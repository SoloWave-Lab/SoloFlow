import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";

function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}
import * as effectsRepo from "~/lib/effects.repo";

async function requireUserId(request: Request): Promise<string> {
  try {
    const session = await auth.api?.getSession?.({ headers: request.headers });
    const uid: string | undefined =
      session?.user?.id || session?.session?.userId;
    if (uid) return String(uid);
  } catch {
    console.error("Failed to get session");
  }
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost:5173";
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;
  const res = await fetch(`${base}/api/auth/session`, {
    headers: { Cookie: request.headers.get("cookie") || "" },
  });
  if (!res.ok) throw new Response("Unauthorized", { status: 401 });
  const json = await res.json().catch(() => ({}));
  const uid2: string | undefined =
    json?.user?.id ||
    json?.userId ||
    json?.session?.userId ||
    json?.data?.user?.id;
  if (!uid2) throw new Response("Unauthorized", { status: 401 });
  return String(uid2);
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const path = params["*"] || "";
  const projectId = url.searchParams.get("projectId");

  if (!projectId) {
    return json({ error: "projectId is required" }, { status: 400 });
  }

  // GET /api/effects/visual/:scrubberId
  if (path.startsWith("visual/")) {
    const scrubberId = path.replace("visual/", "");
    const effects = await effectsRepo.getVisualEffects(projectId, scrubberId);
    return json({ effects });
  }

  // GET /api/effects/visual/all/:scrubberId
  if (path.startsWith("visual/all/")) {
    const scrubberId = path.replace("visual/all/", "");
    const effects = await effectsRepo.getAllVisualEffects(projectId);
    return json({ effects });
  }

  // GET /api/effects/color/:scrubberId
  if (path.startsWith("color/")) {
    const scrubberId = path.replace("color/", "");
    const colorCorrection = await effectsRepo.getColorCorrection(projectId, scrubberId);
    return json({ colorCorrection });
  }

  // GET /api/effects/audio/:scrubberId
  if (path.startsWith("audio/")) {
    const scrubberId = path.replace("audio/", "");
    const effects = await effectsRepo.getAudioEffects(projectId, scrubberId);
    return json({ effects });
  }

  // GET /api/effects/blend/:scrubberId
  if (path.startsWith("blend/")) {
    const scrubberId = path.replace("blend/", "");
    const blendMode = await effectsRepo.getBlendMode(projectId, scrubberId);
    return json({ blendMode });
  }

  // GET /api/effects/keyframes/:scrubberId
  if (path.startsWith("keyframes/")) {
    const scrubberId = path.replace("keyframes/", "");
    const keyframes = await effectsRepo.getKeyframes(projectId, scrubberId);
    return json({ keyframes });
  }

  // GET /api/effects/masks/:scrubberId
  if (path.startsWith("masks/")) {
    const scrubberId = path.replace("masks/", "");
    const masks = await effectsRepo.getMasks(projectId, scrubberId);
    return json({ masks });
  }

  // GET /api/effects/luts/user
  if (path === "luts/user") {
    const luts = await effectsRepo.getUserLUTs(userId);
    return json({ luts });
  }

  // GET /api/effects/project/:projectId
  if (path.startsWith("project/")) {
    const projectId = path.replace("project/", "");
    const effects = await effectsRepo.loadProjectEffects(projectId);
    return json({ effects });
  }

  // GET /api/effects/presets
  if (path === "presets") {
    const presets = await effectsRepo.getUserPresets(userId);
    return json({ presets });
  }

  // GET /api/effects/presets/:presetId
  if (path.startsWith("presets/") && !path.includes("/")) {
    const presetId = path.replace("presets/", "");
    const preset = await effectsRepo.getPresetById(presetId, userId);
    if (!preset) {
      return json({ error: "Preset not found" }, { status: 404 });
    }
    return json({ preset });
  }

  return json({ error: "Not found" }, { status: 404 });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const path = params["*"] || "";
  const method = request.method;

  // POST /api/effects/visual
  if (method === "POST" && path === "visual") {
    const body = await request.json();
    const { projectId, scrubberId, effects } = body;
    await effectsRepo.saveVisualEffects(projectId, scrubberId, effects);
    return json({ success: true });
  }

  // POST /api/effects/color
  if (method === "POST" && path === "color") {
    const body = await request.json();
    const { projectId, scrubberId, colorCorrection } = body;
    await effectsRepo.saveColorCorrection(projectId, scrubberId, colorCorrection);
    return json({ success: true });
  }

  // POST /api/effects/audio
  if (method === "POST" && path === "audio") {
    const body = await request.json();
    const { projectId, scrubberId, effects } = body;
    await effectsRepo.saveAudioEffects(projectId, scrubberId, effects);
    return json({ success: true });
  }

  // POST /api/effects/blend
  if (method === "POST" && path === "blend") {
    const body = await request.json();
    const { projectId, scrubberId, blendMode, opacity } = body;
    await effectsRepo.saveBlendMode(projectId, scrubberId, blendMode, opacity);
    return json({ success: true });
  }

  // POST /api/effects/keyframes
  if (method === "POST" && path === "keyframes") {
    const body = await request.json();
    const { projectId, scrubberId, keyframes } = body;
    await effectsRepo.saveKeyframes(projectId, scrubberId, keyframes);
    return json({ success: true });
  }

  // POST /api/effects/masks
  if (method === "POST" && path === "masks") {
    const body = await request.json();
    const { projectId, scrubberId, masks } = body;
    await effectsRepo.saveMasks(projectId, scrubberId, masks);
    return json({ success: true });
  }

  // POST /api/effects/luts
  if (method === "POST" && path === "luts") {
    const contentType = request.headers.get("content-type") || "";
    
    // Handle file upload (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const name = formData.get("name") as string;
      
      if (!(file instanceof Blob)) {
        return json({ error: "No file provided" }, { status: 400 });
      }
      
      // Read file content
      const content = await file.text();
      const fileName = (file as any).name || "lut.cube";
      const fileType = fileName.endsWith(".3dl") ? "3dl" : "cube";
      
      // Store file content (in production, upload to storage service)
      // For now, we'll store the content directly in the database
      const fileUrl = `data:text/plain;base64,${Buffer.from(content).toString('base64')}`;
      
      const lutId = await effectsRepo.saveLUT(
        userId,
        name || fileName,
        fileUrl,
        fileType,
        undefined,
        content.length,
        false
      );
      
      return json({ lutId, success: true });
    }
    
    // Handle JSON data (for parsed LUT data)
    const body = await request.json();
    const { name, format, data, url } = body;
    
    // If data is provided, convert to base64 URL
    let fileUrl = url;
    if (data && !url) {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      fileUrl = `data:text/plain;base64,${Buffer.from(dataStr).toString('base64')}`;
    }
    
    const lutId = await effectsRepo.saveLUT(
      userId,
      name,
      fileUrl || '',
      format,
      undefined,
      undefined,
      false
    );
    
    return json({ lutId, success: true });
  }

  // POST /api/effects/luts/apply
  if (method === "POST" && path === "luts/apply") {
    const body = await request.json();
    const { scrubberId, lutId, intensity } = body;
    await effectsRepo.applyLUT(scrubberId, lutId, intensity);
    return json({ success: true });
  }

  // DELETE /api/effects/luts/apply/:projectId/:scrubberId/:lutId
  if (method === "DELETE" && path.startsWith("luts/apply/")) {
    const parts = path.replace("luts/apply/", "").split("/");
    const [projectId, scrubberId, lutId] = parts;
    await effectsRepo.removeLUT(projectId, scrubberId, lutId);
    return json({ success: true });
  }

  // POST /api/effects/project/save
  if (method === "POST" && path === "project/save") {
    const body = await request.json();
    const { projectId, visualEffectsMap, colorCorrectionsMap, audioEffectsMap } = body;
    await effectsRepo.saveProjectEffects(projectId, visualEffectsMap, colorCorrectionsMap, audioEffectsMap);
    return json({ success: true });
  }

  // POST /api/effects/presets
  if (method === "POST" && path === "presets") {
    const body = await request.json();
    const { name, description, visualEffects, colorCorrection, audioEffects, blendMode, opacity, thumbnail } = body;
    const presetId = await effectsRepo.savePreset(
      userId,
      name,
      description,
      visualEffects || [],
      colorCorrection,
      audioEffects || [],
      blendMode,
      opacity,
      thumbnail
    );
    return json({ presetId, success: true });
  }

  // PATCH /api/effects/presets/:presetId/favorite
  if (method === "PATCH" && path.match(/^presets\/[^/]+\/favorite$/)) {
    const presetId = path.split("/")[1];
    const isFavorite = await effectsRepo.togglePresetFavorite(presetId, userId);
    return json({ isFavorite, success: true });
  }

  // PATCH /api/effects/presets/:presetId
  if (method === "PATCH" && path.startsWith("presets/") && !path.includes("/favorite")) {
    const presetId = path.replace("presets/", "");
    const body = await request.json();
    const success = await effectsRepo.updatePreset(presetId, userId, body);
    return json({ success });
  }

  // DELETE /api/effects/presets/:presetId
  if (method === "DELETE" && path.startsWith("presets/")) {
    const presetId = path.replace("presets/", "");
    const success = await effectsRepo.deletePreset(presetId, userId);
    return json({ success });
  }

  // DELETE /api/effects/luts/:lutId
  if (method === "DELETE" && path.startsWith("luts/") && !path.includes("apply")) {
    const lutId = path.replace("luts/", "");
    const success = await effectsRepo.deleteLUT(lutId, userId);
    return json({ success });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}