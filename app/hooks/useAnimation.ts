// Hooks for Phase 3: Animation & Motion features
import { useState, useCallback } from "react";

// ============================================
// MOTION TRACKING HOOK
// ============================================

export interface MotionTracker {
  id: string;
  projectId: string;
  scrubberId: string;
  name: string;
  startFrame: number;
  endFrame: number;
  confidence: number;
  enabled: boolean;
  trackPoints: TrackPoint[];
}

export interface TrackPoint {
  id: string;
  trackerId: string;
  frame: number;
  x: number;
  y: number;
  confidence: number;
}

export function useMotionTracking(projectId: string) {
  const [trackers, setTrackers] = useState<MotionTracker[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTrackers = useCallback(async (scrubberId?: string) => {
    setLoading(true);
    try {
      const url = scrubberId
        ? `/api/animation/trackers?projectId=${projectId}&scrubberId=${scrubberId}`
        : `/api/animation/trackers?projectId=${projectId}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTrackers(data);
      }
    } catch (error) {
      console.error("Failed to load motion trackers:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createTracker = useCallback(async (data: {
    scrubberId: string;
    name: string;
    startFrame: number;
    endFrame: number;
  }) => {
    try {
      const response = await fetch("/api/animation/trackers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId }),
      });
      if (response.ok) {
        const tracker = await response.json();
        setTrackers((prev) => [...prev, tracker]);
        return tracker;
      }
    } catch (error) {
      console.error("Failed to create motion tracker:", error);
    }
  }, [projectId]);

  const updateTracker = useCallback(async (id: string, updates: Partial<MotionTracker>) => {
    try {
      const response = await fetch(`/api/animation/trackers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        const updated = await response.json();
        setTrackers((prev) => prev.map((t) => (t.id === id ? updated : t)));
        return updated;
      }
    } catch (error) {
      console.error("Failed to update motion tracker:", error);
    }
  }, []);

  const deleteTracker = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/animation/trackers/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setTrackers((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete motion tracker:", error);
    }
  }, []);

  const addTrackPoint = useCallback(async (trackerId: string, point: {
    frame: number;
    x: number;
    y: number;
    confidence?: number;
  }) => {
    try {
      const response = await fetch(`/api/animation/trackers/${trackerId}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(point),
      });
      if (response.ok) {
        const trackPoint = await response.json();
        setTrackers((prev) =>
          prev.map((t) =>
            t.id === trackerId
              ? { ...t, trackPoints: [...(t.trackPoints || []), trackPoint] }
              : t
          )
        );
        return trackPoint;
      }
    } catch (error) {
      console.error("Failed to add track point:", error);
    }
  }, []);

  return {
    trackers,
    loading,
    loadTrackers,
    createTracker,
    updateTracker,
    deleteTracker,
    addTrackPoint,
  };
}

// ============================================
// VIDEO STABILIZATION HOOK
// ============================================

export interface VideoStabilization {
  enabled: boolean;
  smoothness: number;
  method: "point" | "subspace" | "optical_flow";
  cropToFit: boolean;
  rollingShutterCorrection: boolean;
  maxAngle: number;
  maxShift: number;
}

export function useStabilization(projectId: string, scrubberId: string) {
  const [stabilization, setStabilization] = useState<VideoStabilization | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStabilization = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/animation/stabilization/${scrubberId}`);
      if (response.ok) {
        const data = await response.json();
        setStabilization(data);
      }
    } catch (error) {
      console.error("Failed to load stabilization:", error);
    } finally {
      setLoading(false);
    }
  }, [scrubberId]);

  const updateStabilization = useCallback(async (updates: Partial<VideoStabilization>) => {
    try {
      const response = await fetch(`/api/animation/stabilization/${scrubberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, projectId, scrubberId }),
      });
      if (response.ok) {
        const updated = await response.json();
        setStabilization(updated);
        return updated;
      }
    } catch (error) {
      console.error("Failed to update stabilization:", error);
    }
  }, [projectId, scrubberId]);

  return {
    stabilization,
    loading,
    loadStabilization,
    updateStabilization,
  };
}

// ============================================
// 3D TRANSFORMS HOOK
// ============================================

export interface Transform3D {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  perspectiveDistance: number;
  anchorX: number;
  anchorY: number;
  anchorZ: number;
  enabled: boolean;
}

export function use3DTransform(projectId: string, scrubberId: string) {
  const [transform, setTransform] = useState<Transform3D | null>(null);
  const [loading, setLoading] = useState(false);

  const loadTransform = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/animation/3d-transform/${scrubberId}`);
      if (response.ok) {
        const data = await response.json();
        setTransform(data);
      }
    } catch (error) {
      console.error("Failed to load 3D transform:", error);
    } finally {
      setLoading(false);
    }
  }, [scrubberId]);

  const updateTransform = useCallback(async (updates: Partial<Transform3D>) => {
    try {
      const response = await fetch(`/api/animation/3d-transform/${scrubberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, projectId, scrubberId }),
      });
      if (response.ok) {
        const updated = await response.json();
        setTransform(updated);
        return updated;
      }
    } catch (error) {
      console.error("Failed to update 3D transform:", error);
    }
  }, [projectId, scrubberId]);

  return {
    transform,
    loading,
    loadTransform,
    updateTransform,
  };
}

// ============================================
// SPEED REMAPPING HOOK
// ============================================

export interface SpeedRemap {
  enabled: boolean;
  speed: number;
  method: "frame_blend" | "optical_flow" | "nearest";
  maintainPitch: boolean;
  timeRemapCurve: Array<{ inputTime: number; outputTime: number; easing: string }>;
}

export function useSpeedRemap(projectId: string, scrubberId: string) {
  const [speedRemap, setSpeedRemap] = useState<SpeedRemap | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSpeedRemap = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/animation/speed-remap/${scrubberId}`);
      if (response.ok) {
        const data = await response.json();
        setSpeedRemap(data);
      }
    } catch (error) {
      console.error("Failed to load speed remap:", error);
    } finally {
      setLoading(false);
    }
  }, [scrubberId]);

  const updateSpeedRemap = useCallback(async (updates: Partial<SpeedRemap>) => {
    try {
      const response = await fetch(`/api/animation/speed-remap/${scrubberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, projectId, scrubberId }),
      });
      if (response.ok) {
        const updated = await response.json();
        setSpeedRemap(updated);
        return updated;
      }
    } catch (error) {
      console.error("Failed to update speed remap:", error);
    }
  }, [projectId, scrubberId]);

  return {
    speedRemap,
    loading,
    loadSpeedRemap,
    updateSpeedRemap,
  };
}

// ============================================
// TRANSITIONS HOOK
// ============================================

export interface Transition {
  id: string;
  projectId: string;
  fromScrubberId: string;
  toScrubberId: string;
  transitionType: string;
  duration: number;
  timing: string;
  direction?: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

export function useTransitions(projectId: string) {
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTransitions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/animation/transitions?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setTransitions(data);
      }
    } catch (error) {
      console.error("Failed to load transitions:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createTransition = useCallback(async (data: {
    fromScrubberId: string;
    toScrubberId: string;
    transitionType: string;
    duration?: number;
    timing?: string;
    direction?: string;
    parameters?: Record<string, any>;
  }) => {
    try {
      const response = await fetch("/api/animation/transitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId }),
      });
      if (response.ok) {
        const transition = await response.json();
        setTransitions((prev) => [...prev, transition]);
        return transition;
      }
    } catch (error) {
      console.error("Failed to create transition:", error);
    }
  }, [projectId]);

  const updateTransition = useCallback(async (id: string, updates: Partial<Transition>) => {
    try {
      const response = await fetch(`/api/animation/transitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        const updated = await response.json();
        setTransitions((prev) => prev.map((t) => (t.id === id ? updated : t)));
        return updated;
      }
    } catch (error) {
      console.error("Failed to update transition:", error);
    }
  }, []);

  const deleteTransition = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/animation/transitions/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setTransitions((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete transition:", error);
    }
  }, []);

  return {
    transitions,
    loading,
    loadTransitions,
    createTransition,
    updateTransition,
    deleteTransition,
  };
}