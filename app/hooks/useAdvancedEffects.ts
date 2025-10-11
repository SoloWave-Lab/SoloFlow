import { useState, useCallback } from "react";
import type {
  VisualEffect,
  AudioEffect,
  ColorCorrection,
  KeyframeTrack,
  Keyframe,
  Mask,
  MotionTracker,
  StabilizationSettings,
  Transform3D,
  SpeedRemap,
  LUT,
} from "~/components/timeline/advanced-types";
import { generateUUID } from "~/utils/uuid";
import { toast } from "sonner";

export const useAdvancedEffects = () => {
  // ============================================
  // VISUAL EFFECTS
  // ============================================
  const [visualEffects, setVisualEffects] = useState<Map<string, VisualEffect[]>>(new Map());

  const addVisualEffect = useCallback((scrubberId: string, effect: Omit<VisualEffect, "id">) => {
    const newEffect: VisualEffect = {
      ...effect,
      id: generateUUID(),
    };

    setVisualEffects((prev) => {
      const newMap = new Map(prev);
      const effects = newMap.get(scrubberId) || [];
      newMap.set(scrubberId, [...effects, newEffect]);
      return newMap;
    });

    toast.success(`Added ${effect.type} effect`);
    return newEffect.id;
  }, []);

  const removeVisualEffect = useCallback((scrubberId: string, effectId: string) => {
    setVisualEffects((prev) => {
      const newMap = new Map(prev);
      const effects = newMap.get(scrubberId) || [];
      newMap.set(
        scrubberId,
        effects.filter((e) => e.id !== effectId)
      );
      return newMap;
    });

    toast.success("Effect removed");
  }, []);

  const updateVisualEffect = useCallback((scrubberId: string, effectId: string, updates: Partial<VisualEffect>) => {
    setVisualEffects((prev) => {
      const newMap = new Map(prev);
      const effects = newMap.get(scrubberId) || [];
      newMap.set(
        scrubberId,
        effects.map((e) => (e.id === effectId ? { ...e, ...updates } : e))
      );
      return newMap;
    });
  }, []);

  const toggleVisualEffect = useCallback((scrubberId: string, effectId: string) => {
    setVisualEffects((prev) => {
      const newMap = new Map(prev);
      const effects = newMap.get(scrubberId) || [];
      newMap.set(
        scrubberId,
        effects.map((e) => (e.id === effectId ? { ...e, enabled: !e.enabled } : e))
      );
      return newMap;
    });
  }, []);

  // ============================================
  // AUDIO EFFECTS
  // ============================================
  const [audioEffects, setAudioEffects] = useState<Map<string, AudioEffect[]>>(new Map());

  const addAudioEffect = useCallback((scrubberId: string, effect: Omit<AudioEffect, "id">) => {
    const newEffect: AudioEffect = {
      ...effect,
      id: generateUUID(),
    };

    setAudioEffects((prev) => {
      const newMap = new Map(prev);
      const effects = newMap.get(scrubberId) || [];
      newMap.set(scrubberId, [...effects, newEffect]);
      return newMap;
    });

    toast.success(`Added ${effect.type} audio effect`);
    return newEffect.id;
  }, []);

  const removeAudioEffect = useCallback((scrubberId: string, effectId: string) => {
    setAudioEffects((prev) => {
      const newMap = new Map(prev);
      const effects = newMap.get(scrubberId) || [];
      newMap.set(
        scrubberId,
        effects.filter((e) => e.id !== effectId)
      );
      return newMap;
    });

    toast.success("Audio effect removed");
  }, []);

  const updateAudioEffect = useCallback((scrubberId: string, effectId: string, updates: Partial<AudioEffect>) => {
    setAudioEffects((prev) => {
      const newMap = new Map(prev);
      const effects = newMap.get(scrubberId) || [];
      newMap.set(
        scrubberId,
        effects.map((e) => (e.id === effectId ? { ...e, ...updates } : e))
      );
      return newMap;
    });
  }, []);

  // ============================================
  // COLOR CORRECTION
  // ============================================
  const [colorCorrections, setColorCorrections] = useState<Map<string, ColorCorrection>>(new Map());

  const setColorCorrection = useCallback((scrubberId: string, correction: ColorCorrection) => {
    setColorCorrections((prev) => {
      const newMap = new Map(prev);
      newMap.set(scrubberId, correction);
      return newMap;
    });
  }, []);

  const resetColorCorrection = useCallback((scrubberId: string) => {
    const defaultCorrection: ColorCorrection = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      temperature: 0,
      tint: 0,
      exposure: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      vibrance: 0,
      gamma: 1,
    };

    setColorCorrections((prev) => {
      const newMap = new Map(prev);
      newMap.set(scrubberId, defaultCorrection);
      return newMap;
    });

    toast.success("Color correction reset");
  }, []);

  // ============================================
  // LUT (LOOKUP TABLES)
  // ============================================
  const [luts, setLuts] = useState<Map<string, LUT>>(new Map());

  const applyLUT = useCallback((scrubberId: string, lut: LUT) => {
    setLuts((prev) => {
      const newMap = new Map(prev);
      newMap.set(scrubberId, lut);
      return newMap;
    });

    toast.success(`Applied LUT: ${lut.name}`);
  }, []);

  const removeLUT = useCallback((scrubberId: string) => {
    setLuts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(scrubberId);
      return newMap;
    });

    toast.success("LUT removed");
  }, []);

  // ============================================
  // KEYFRAME ANIMATION
  // ============================================
  const [keyframeTracks, setKeyframeTracks] = useState<Map<string, KeyframeTrack[]>>(new Map());

  const addKeyframe = useCallback(
    (scrubberId: string, property: Keyframe["property"], time: number, value: Keyframe["value"]) => {
      const newKeyframe: Keyframe = {
        id: generateUUID(),
        time,
        property,
        value,
        easing: "linear",
      };

      setKeyframeTracks((prev) => {
        const newMap = new Map(prev);
        const tracks = newMap.get(scrubberId) || [];

        // Find or create track for this property
        const trackIndex = tracks.findIndex((t) => t.keyframes.some((k) => k.property === property));

        if (trackIndex >= 0) {
          // Add to existing track
          const updatedTracks = [...tracks];
          updatedTracks[trackIndex] = {
            ...updatedTracks[trackIndex],
            keyframes: [...updatedTracks[trackIndex].keyframes, newKeyframe].sort((a, b) => a.time - b.time),
          };
          newMap.set(scrubberId, updatedTracks);
        } else {
          // Create new track
          const newTrack: KeyframeTrack = {
            scrubberId,
            keyframes: [newKeyframe],
          };
          newMap.set(scrubberId, [...tracks, newTrack]);
        }

        return newMap;
      });

      toast.success(`Keyframe added at ${time.toFixed(2)}s`);
      return newKeyframe.id;
    },
    []
  );

  const removeKeyframe = useCallback((scrubberId: string, keyframeId: string) => {
    setKeyframeTracks((prev) => {
      const newMap = new Map(prev);
      const tracks = newMap.get(scrubberId) || [];

      const updatedTracks = tracks
        .map((track) => ({
          ...track,
          keyframes: track.keyframes.filter((k) => k.id !== keyframeId),
        }))
        .filter((track) => track.keyframes.length > 0);

      newMap.set(scrubberId, updatedTracks);
      return newMap;
    });

    toast.success("Keyframe removed");
  }, []);

  const updateKeyframe = useCallback((scrubberId: string, keyframeId: string, updates: Partial<Keyframe>) => {
    setKeyframeTracks((prev) => {
      const newMap = new Map(prev);
      const tracks = newMap.get(scrubberId) || [];

      const updatedTracks = tracks.map((track) => ({
        ...track,
        keyframes: track.keyframes.map((k) => (k.id === keyframeId ? { ...k, ...updates } : k)),
      }));

      newMap.set(scrubberId, updatedTracks);
      return newMap;
    });
  }, []);

  // ============================================
  // MASKING
  // ============================================
  const [masks, setMasks] = useState<Map<string, Mask[]>>(new Map());

  const addMask = useCallback((scrubberId: string, mask: Omit<Mask, "id">) => {
    const newMask: Mask = {
      ...mask,
      id: generateUUID(),
    };

    setMasks((prev) => {
      const newMap = new Map(prev);
      const scrubberMasks = newMap.get(scrubberId) || [];
      newMap.set(scrubberId, [...scrubberMasks, newMask]);
      return newMap;
    });

    toast.success(`Added ${mask.type} mask`);
    return newMask.id;
  }, []);

  const removeMask = useCallback((scrubberId: string, maskId: string) => {
    setMasks((prev) => {
      const newMap = new Map(prev);
      const scrubberMasks = newMap.get(scrubberId) || [];
      newMap.set(
        scrubberId,
        scrubberMasks.filter((m) => m.id !== maskId)
      );
      return newMap;
    });

    toast.success("Mask removed");
  }, []);

  const updateMask = useCallback((scrubberId: string, maskId: string, updates: Partial<Mask>) => {
    setMasks((prev) => {
      const newMap = new Map(prev);
      const scrubberMasks = newMap.get(scrubberId) || [];
      newMap.set(
        scrubberId,
        scrubberMasks.map((m) => (m.id === maskId ? { ...m, ...updates } : m))
      );
      return newMap;
    });
  }, []);

  // ============================================
  // MOTION TRACKING
  // ============================================
  const [motionTrackers, setMotionTrackers] = useState<Map<string, MotionTracker[]>>(new Map());

  const addMotionTracker = useCallback((scrubberId: string, tracker: Omit<MotionTracker, "id">) => {
    const newTracker: MotionTracker = {
      ...tracker,
      id: generateUUID(),
    };

    setMotionTrackers((prev) => {
      const newMap = new Map(prev);
      const trackers = newMap.get(scrubberId) || [];
      newMap.set(scrubberId, [...trackers, newTracker]);
      return newMap;
    });

    toast.success(`Motion tracker "${tracker.name}" added`);
    return newTracker.id;
  }, []);

  const removeMotionTracker = useCallback((scrubberId: string, trackerId: string) => {
    setMotionTrackers((prev) => {
      const newMap = new Map(prev);
      const trackers = newMap.get(scrubberId) || [];
      newMap.set(
        scrubberId,
        trackers.filter((t) => t.id !== trackerId)
      );
      return newMap;
    });

    toast.success("Motion tracker removed");
  }, []);

  // ============================================
  // STABILIZATION
  // ============================================
  const [stabilizationSettings, setStabilizationSettings] = useState<Map<string, StabilizationSettings>>(new Map());

  const setStabilization = useCallback((scrubberId: string, settings: StabilizationSettings) => {
    setStabilizationSettings((prev) => {
      const newMap = new Map(prev);
      newMap.set(scrubberId, settings);
      return newMap;
    });

    if (settings.enabled) {
      toast.success("Stabilization enabled");
    }
  }, []);

  // ============================================
  // 3D TRANSFORMS
  // ============================================
  const [transform3D, setTransform3D] = useState<Map<string, Transform3D>>(new Map());

  const set3DTransform = useCallback((scrubberId: string, transform: Transform3D) => {
    setTransform3D((prev) => {
      const newMap = new Map(prev);
      newMap.set(scrubberId, transform);
      return newMap;
    });
  }, []);

  const reset3DTransform = useCallback((scrubberId: string) => {
    const defaultTransform: Transform3D = {
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      perspectiveDistance: 1000,
      anchorX: 0.5,
      anchorY: 0.5,
      anchorZ: 0,
    };

    setTransform3D((prev) => {
      const newMap = new Map(prev);
      newMap.set(scrubberId, defaultTransform);
      return newMap;
    });

    toast.success("3D transform reset");
  }, []);

  // ============================================
  // SPEED REMAPPING
  // ============================================
  const [speedRemaps, setSpeedRemaps] = useState<Map<string, SpeedRemap>>(new Map());

  const setSpeedRemap = useCallback((scrubberId: string, remap: SpeedRemap) => {
    setSpeedRemaps((prev) => {
      const newMap = new Map(prev);
      newMap.set(scrubberId, remap);
      return newMap;
    });

    if (remap.enabled) {
      toast.success(`Speed set to ${remap.speed}x`);
    }
  }, []);

  // ============================================
  // BLEND MODE & OPACITY
  // ============================================
  const [blendModes, setBlendModes] = useState<Map<string, { mode: string; opacity: number }>>(new Map());

  const setBlendMode = useCallback((scrubberId: string, mode: string, opacity: number = 100) => {
    setBlendModes((prev) => {
      const newMap = new Map(prev);
      newMap.set(scrubberId, { mode, opacity });
      return newMap;
    });
  }, []);

  const setOpacity = useCallback((scrubberId: string, opacity: number) => {
    setBlendModes((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(scrubberId) || { mode: "normal", opacity: 100 };
      newMap.set(scrubberId, { ...current, opacity });
      return newMap;
    });
  }, []);

  // ============================================
  // GETTERS
  // ============================================
  const getVisualEffects = useCallback((scrubberId: string) => {
    return visualEffects.get(scrubberId) || [];
  }, [visualEffects]);

  const getAudioEffects = useCallback((scrubberId: string) => {
    return audioEffects.get(scrubberId) || [];
  }, [audioEffects]);

  const getColorCorrection = useCallback((scrubberId: string) => {
    return colorCorrections.get(scrubberId);
  }, [colorCorrections]);

  const getLUT = useCallback((scrubberId: string) => {
    return luts.get(scrubberId);
  }, [luts]);

  const getKeyframeTracks = useCallback((scrubberId: string) => {
    return keyframeTracks.get(scrubberId) || [];
  }, [keyframeTracks]);

  const getMasks = useCallback((scrubberId: string) => {
    return masks.get(scrubberId) || [];
  }, [masks]);

  const getMotionTrackers = useCallback((scrubberId: string) => {
    return motionTrackers.get(scrubberId) || [];
  }, [motionTrackers]);

  const getStabilization = useCallback((scrubberId: string) => {
    return stabilizationSettings.get(scrubberId);
  }, [stabilizationSettings]);

  const get3DTransform = useCallback((scrubberId: string) => {
    return transform3D.get(scrubberId);
  }, [transform3D]);

  const getSpeedRemap = useCallback((scrubberId: string) => {
    return speedRemaps.get(scrubberId);
  }, [speedRemaps]);

  const getBlendMode = useCallback((scrubberId: string) => {
    return blendModes.get(scrubberId);
  }, [blendModes]);

  return {
    // Visual Effects
    addVisualEffect,
    removeVisualEffect,
    updateVisualEffect,
    toggleVisualEffect,
    getVisualEffects,

    // Audio Effects
    addAudioEffect,
    removeAudioEffect,
    updateAudioEffect,
    getAudioEffects,

    // Color Correction
    setColorCorrection,
    resetColorCorrection,
    getColorCorrection,

    // LUT
    applyLUT,
    removeLUT,
    getLUT,

    // Keyframes
    addKeyframe,
    removeKeyframe,
    updateKeyframe,
    getKeyframeTracks,

    // Masking
    addMask,
    removeMask,
    updateMask,
    getMasks,

    // Motion Tracking
    addMotionTracker,
    removeMotionTracker,
    getMotionTrackers,

    // Stabilization
    setStabilization,
    getStabilization,

    // 3D Transform
    set3DTransform,
    reset3DTransform,
    get3DTransform,

    // Speed Remap
    setSpeedRemap,
    getSpeedRemap,

    // Blend Mode & Opacity
    setBlendMode,
    setOpacity,
    getBlendMode,
  };
};