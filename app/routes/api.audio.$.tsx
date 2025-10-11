// API routes for Phase 4: Audio Editing features
import { type ActionFunctionArgs, type LoaderFunctionArgs } from '~/lib/router-utils';
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
import * as audioRepo from "~/lib/audio.repo";

// ============================================
// AUDIO WAVEFORM ROUTES
// ============================================

async function handleWaveform(request: Request, assetId: string) {
  const method = request.method;

  if (method === "GET") {
    const waveform = await audioRepo.getWaveform(assetId);
    return json(waveform);
  }

  if (method === "DELETE") {
    await audioRepo.deleteWaveform(assetId);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

async function handleWaveformCreate(request: Request) {
  const method = request.method;

  if (method === "POST") {
    const data = await request.json();
    const waveform = await audioRepo.createWaveform(data);
    return json(waveform);
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

// ============================================
// AUDIO DUCKING ROUTES
// ============================================

async function handleAudioDucking(request: Request, params: string[]) {
  const method = request.method;

  if (method === "GET") {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return json({ error: "projectId is required" }, { status: 400 });
    }

    const duckingRules = await audioRepo.getAudioDucking(projectId);
    return json(duckingRules);
  }

  if (method === "POST") {
    const data = await request.json();
    const rule = await audioRepo.createAudioDucking(data);
    return json(rule);
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

async function handleAudioDuckingById(request: Request, id: string) {
  const method = request.method;

  if (method === "PATCH") {
    const updates = await request.json();
    const rule = await audioRepo.updateAudioDucking(id, updates);
    return json(rule);
  }

  if (method === "DELETE") {
    await audioRepo.deleteAudioDucking(id);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

// ============================================
// NOISE REDUCTION ROUTES
// ============================================

async function handleNoiseProfiles(request: Request, params: string[]) {
  const method = request.method;

  if (method === "GET") {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return json({ error: "userId is required" }, { status: 400 });
    }

    const profiles = await audioRepo.getNoiseProfiles(userId);
    return json(profiles);
  }

  if (method === "POST") {
    const data = await request.json();
    const profile = await audioRepo.createNoiseProfile(data);
    return json(profile);
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

async function handleNoiseProfileById(request: Request, id: string) {
  const method = request.method;

  if (method === "DELETE") {
    await audioRepo.deleteNoiseProfile(id);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

// ============================================
// AUDIO MIXING ROUTES
// ============================================

async function handleAudioMixing(request: Request, params: string[]) {
  const method = request.method;

  if (method === "GET") {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return json({ error: "projectId is required" }, { status: 400 });
    }

    const mixing = await audioRepo.getAllAudioMixing(projectId);
    return json(mixing);
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

async function handleAudioMixingByTrack(request: Request, trackIndex: string) {
  const method = request.method;
  const trackIdx = parseInt(trackIndex, 10);

  if (isNaN(trackIdx)) {
    return json({ error: "Invalid track index" }, { status: 400 });
  }

  if (method === "GET") {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return json({ error: "projectId is required" }, { status: 400 });
    }

    const mixing = await audioRepo.getAudioMixing(projectId, trackIdx);
    return json(mixing);
  }

  if (method === "PUT") {
    const data = await request.json();
    const mixing = await audioRepo.upsertAudioMixing({ ...data, trackIndex: trackIdx });
    return json(mixing);
  }

  if (method === "DELETE") {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return json({ error: "projectId is required" }, { status: 400 });
    }

    await audioRepo.deleteAudioMixing(projectId, trackIdx);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

// ============================================
// MASTER AUDIO ROUTES
// ============================================

async function handleMasterAudio(request: Request, projectId: string) {
  const method = request.method;

  if (method === "GET") {
    const masterAudio = await audioRepo.getMasterAudio(projectId);
    return json(masterAudio);
  }

  if (method === "PUT") {
    const data = await request.json();
    const masterAudio = await audioRepo.upsertMasterAudio({ ...data, projectId });
    return json(masterAudio);
  }

  if (method === "DELETE") {
    await audioRepo.deleteMasterAudio(projectId);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

// ============================================
// MAIN ROUTER
// ============================================

export async function loader({ request, params }: LoaderFunctionArgs) {
  // Verify authentication
  const session = await auth.api?.getSession?.({ headers: request.headers });
  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const splat = params["*"] || "";
  const parts = splat.split("/").filter(Boolean);

  try {
    // Route: /api/audio/waveform (POST only)
    if (parts[0] === "waveform" && parts.length === 1) {
      return handleWaveformCreate(request);
    }

    // Route: /api/audio/waveform/:assetId
    if (parts[0] === "waveform" && parts.length === 2) {
      return handleWaveform(request, parts[1]);
    }

    // Route: /api/audio/ducking
    if (parts[0] === "ducking" && parts.length === 1) {
      return handleAudioDucking(request, parts);
    }

    // Route: /api/audio/ducking/:id
    if (parts[0] === "ducking" && parts.length === 2) {
      return handleAudioDuckingById(request, parts[1]);
    }

    // Route: /api/audio/noise-profiles
    if (parts[0] === "noise-profiles" && parts.length === 1) {
      return handleNoiseProfiles(request, parts);
    }

    // Route: /api/audio/noise-profiles/:id
    if (parts[0] === "noise-profiles" && parts.length === 2) {
      return handleNoiseProfileById(request, parts[1]);
    }

    // Route: /api/audio/mixing
    if (parts[0] === "mixing" && parts.length === 1) {
      return handleAudioMixing(request, parts);
    }

    // Route: /api/audio/mixing/:trackIndex
    if (parts[0] === "mixing" && parts.length === 2) {
      return handleAudioMixingByTrack(request, parts[1]);
    }

    // Route: /api/audio/master/:projectId
    if (parts[0] === "master" && parts.length === 2) {
      return handleMasterAudio(request, parts[1]);
    }

    return json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("Audio API error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function action(args: ActionFunctionArgs) {
  return loader(args);
}