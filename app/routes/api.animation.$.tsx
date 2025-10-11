// API routes for Phase 3: Animation & Motion features
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
import * as animationRepo from "~/lib/animation.repo";

// ============================================
// MOTION TRACKING ROUTES
// ============================================

async function handleMotionTrackers(request: Request, params: string[]) {
  const method = request.method;

  if (method === "GET") {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const scrubberId = url.searchParams.get("scrubberId");

    if (!projectId) {
      return json({ error: "projectId is required" }, { status: 400 });
    }

    const trackers = await animationRepo.getMotionTrackers(
      projectId,
      scrubberId || undefined
    );
    return json(trackers);
  }

  if (method === "POST") {
    const data = await request.json();
    const tracker = await animationRepo.createMotionTracker(data);
    return json(tracker);
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

async function handleMotionTrackerById(request: Request, id: string) {
  const method = request.method;

  if (method === "PATCH") {
    const updates = await request.json();
    const tracker = await animationRepo.updateMotionTracker(id, updates);
    return json(tracker);
  }

  if (method === "DELETE") {
    await animationRepo.deleteMotionTracker(id);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

async function handleTrackPoints(request: Request, trackerId: string) {
  const method = request.method;

  if (method === "GET") {
    const points = await animationRepo.getTrackPoints(trackerId);
    return json(points);
  }

  if (method === "POST") {
    const data = await request.json();
    const point = await animationRepo.addTrackPoint({ ...data, trackerId });
    return json(point);
  }

  if (method === "DELETE") {
    await animationRepo.deleteTrackPoints(trackerId);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

// ============================================
// VIDEO STABILIZATION ROUTES
// ============================================

async function handleStabilization(request: Request, scrubberId: string) {
  const method = request.method;

  if (method === "GET") {
    const stabilization = await animationRepo.getStabilization(scrubberId);
    return json(stabilization);
  }

  if (method === "PUT") {
    const data = await request.json();
    const stabilization = await animationRepo.upsertStabilization(data);
    return json(stabilization);
  }

  if (method === "DELETE") {
    await animationRepo.deleteStabilization(scrubberId);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

// ============================================
// 3D TRANSFORMS ROUTES
// ============================================

async function handle3DTransform(request: Request, scrubberId: string) {
  const method = request.method;

  if (method === "GET") {
    const transform = await animationRepo.get3DTransform(scrubberId);
    return json(transform);
  }

  if (method === "PUT") {
    const data = await request.json();
    const transform = await animationRepo.upsert3DTransform(data);
    return json(transform);
  }

  if (method === "DELETE") {
    await animationRepo.delete3DTransform(scrubberId);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

// ============================================
// SPEED REMAPPING ROUTES
// ============================================

async function handleSpeedRemap(request: Request, scrubberId: string) {
  const method = request.method;

  if (method === "GET") {
    const speedRemap = await animationRepo.getSpeedRemap(scrubberId);
    return json(speedRemap);
  }

  if (method === "PUT") {
    const data = await request.json();
    const speedRemap = await animationRepo.upsertSpeedRemap(data);
    return json(speedRemap);
  }

  if (method === "DELETE") {
    await animationRepo.deleteSpeedRemap(scrubberId);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

// ============================================
// TRANSITIONS ROUTES
// ============================================

async function handleTransitions(request: Request, params: string[]) {
  const method = request.method;

  if (method === "GET") {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return json({ error: "projectId is required" }, { status: 400 });
    }

    const transitions = await animationRepo.getTransitions(projectId);
    return json(transitions);
  }

  if (method === "POST") {
    const data = await request.json();
    const transition = await animationRepo.createTransition(data);
    return json(transition);
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

async function handleTransitionById(request: Request, id: string) {
  const method = request.method;

  if (method === "PATCH") {
    const updates = await request.json();
    const transition = await animationRepo.updateTransition(id, updates);
    return json(transition);
  }

  if (method === "DELETE") {
    await animationRepo.deleteTransition(id);
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
    // Route: /api/animation/trackers
    if (parts[0] === "trackers" && parts.length === 1) {
      return handleMotionTrackers(request, parts);
    }

    // Route: /api/animation/trackers/:id
    if (parts[0] === "trackers" && parts.length === 2) {
      return handleMotionTrackerById(request, parts[1]);
    }

    // Route: /api/animation/trackers/:id/points
    if (parts[0] === "trackers" && parts[2] === "points") {
      return handleTrackPoints(request, parts[1]);
    }

    // Route: /api/animation/stabilization/:scrubberId
    if (parts[0] === "stabilization" && parts.length === 2) {
      return handleStabilization(request, parts[1]);
    }

    // Route: /api/animation/3d-transform/:scrubberId
    if (parts[0] === "3d-transform" && parts.length === 2) {
      return handle3DTransform(request, parts[1]);
    }

    // Route: /api/animation/speed-remap/:scrubberId
    if (parts[0] === "speed-remap" && parts.length === 2) {
      return handleSpeedRemap(request, parts[1]);
    }

    // Route: /api/animation/transitions
    if (parts[0] === "transitions" && parts.length === 1) {
      return handleTransitions(request, parts);
    }

    // Route: /api/animation/transitions/:id
    if (parts[0] === "transitions" && parts.length === 2) {
      return handleTransitionById(request, parts[1]);
    }

    return json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("Animation API error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function action(args: ActionFunctionArgs) {
  return loader(args);
}