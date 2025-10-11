/**
 * useEffectsWithPersistence Hook
 * 
 * Combines useAdvancedEffects (in-memory state management) with useEffectsPersistence
 * (database persistence) to provide a complete effects management solution with
 * automatic saving and loading.
 * 
 * Features:
 * - All effects operations from useAdvancedEffects
 * - Automatic database persistence with debouncing
 * - Project-wide effect loading
 * - Manual save/load controls
 * - Error handling and recovery
 */

import { useEffect, useCallback, useRef } from "react";
import { useAdvancedEffects } from "./useAdvancedEffects";
import { useEffectsPersistence } from "./useEffectsPersistence";
import { toast } from "sonner";

interface UseEffectsWithPersistenceOptions {
  projectId: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
  onLoadSuccess?: () => void;
  onLoadError?: (error: Error) => void;
}

export const useEffectsWithPersistence = (options: UseEffectsWithPersistenceOptions) => {
  const {
    projectId,
    autoSave = true,
    autoSaveDelay = 1000,
    onSaveSuccess,
    onSaveError,
    onLoadSuccess,
    onLoadError,
  } = options;

  const effects = useAdvancedEffects();
  const persistence = useEffectsPersistence(projectId);

  // Track if initial load has completed
  const hasLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  /**
   * Load all effects for a specific scrubber from the database
   */
  const loadEffectsForScrubber = useCallback(
    async (scrubberId: string) => {
      try {
        const loadedEffects = await persistence.loadEffectsForScrubber(scrubberId);

        // Apply loaded effects to the in-memory state
        if (loadedEffects && loadedEffects.visualEffects && loadedEffects.visualEffects.length > 0) {
          loadedEffects.visualEffects.forEach((effect) => {
            effects.addVisualEffect(scrubberId, effect);
          });
        }

        if (loadedEffects && loadedEffects.colorCorrection) {
          effects.setColorCorrection(scrubberId, loadedEffects.colorCorrection);
        }

        if (loadedEffects && loadedEffects.audioEffects && loadedEffects.audioEffects.length > 0) {
          loadedEffects.audioEffects.forEach((effect) => {
            effects.addAudioEffect(scrubberId, effect);
          });
        }

        if (loadedEffects && loadedEffects.blendMode) {
          // Note: useAdvancedEffects doesn't have blend mode yet, 
          // this would need to be added to the hook
          console.log("Blend mode loaded:", loadedEffects.blendMode);
        }

        return loadedEffects;
      } catch (error) {
        console.error("Failed to load effects for scrubber:", error);
        onLoadError?.(error as Error);
        throw error;
      }
    },
    [persistence, effects, onLoadError]
  );

  /**
   * Load all effects for all scrubbers in the project
   */
  const loadAllEffects = useCallback(
    async (scrubberIds: string[]) => {
      try {
        // Convert string IDs to minimal ScrubberState objects for the persistence layer
        const scrubberStates = scrubberIds.map(id => ({ id } as any));
        const loadedScrubbers = await persistence.loadAllEffects(scrubberStates);

        // Apply all loaded effects
        for (const scrubber of loadedScrubbers) {
          if (scrubber.visualEffects && scrubber.visualEffects.length > 0) {
            scrubber.visualEffects.forEach((effect: any) => {
              effects.addVisualEffect(scrubber.id, effect);
            });
          }

          if (scrubber.colorCorrection) {
            effects.setColorCorrection(scrubber.id, scrubber.colorCorrection);
          }

          if (scrubber.audioEffects && scrubber.audioEffects.length > 0) {
            scrubber.audioEffects.forEach((effect: any) => {
              effects.addAudioEffect(scrubber.id, effect);
            });
          }
        }

        hasLoadedRef.current = true;
        onLoadSuccess?.();
        toast.success(`Loaded effects for ${scrubberIds.length} clips`);
        return loadedScrubbers;
      } catch (error) {
        console.error("Failed to load all effects:", error);
        onLoadError?.(error as Error);
        toast.error("Failed to load effects");
        throw error;
      }
    },
    [persistence, effects, onLoadSuccess, onLoadError]
  );

  /**
   * Save effects for a specific scrubber with debouncing
   */
  const saveEffectsForScrubber = useCallback(
    async (scrubberId: string) => {
      try {
        const visualEffects = effects.getVisualEffects(scrubberId);
        const colorCorrection = effects.getColorCorrection(scrubberId);
        const audioEffects = effects.getAudioEffects(scrubberId);

        // Save each type of effect
        if (visualEffects.length > 0) {
          await persistence.saveVisualEffects(scrubberId, visualEffects);
        }

        if (colorCorrection) {
          await persistence.saveColorCorrection(scrubberId, colorCorrection);
        }

        if (audioEffects.length > 0) {
          await persistence.saveAudioEffects(scrubberId, audioEffects);
        }

        onSaveSuccess?.();
      } catch (error) {
        console.error("Failed to save effects:", error);
        onSaveError?.(error as Error);
        toast.error("Failed to save effects");
        throw error;
      }
    },
    [effects, persistence, onSaveSuccess, onSaveError]
  );

  /**
   * Auto-save with debouncing
   */
  const autoSaveEffects = useCallback(
    (scrubberId: string) => {
      if (!autoSave || !hasLoadedRef.current) return;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout
      saveTimeoutRef.current = setTimeout(() => {
        saveEffectsForScrubber(scrubberId).catch((error) => {
          console.error("Auto-save failed:", error);
        });
      }, autoSaveDelay);
    },
    [autoSave, autoSaveDelay, saveEffectsForScrubber]
  );

  /**
   * Wrapped effect operations that trigger auto-save
   */
  const addVisualEffect = useCallback(
    (scrubberId: string, effect: Parameters<typeof effects.addVisualEffect>[1]) => {
      const result = effects.addVisualEffect(scrubberId, effect);
      autoSaveEffects(scrubberId);
      return result;
    },
    [effects, autoSaveEffects]
  );

  const removeVisualEffect = useCallback(
    (scrubberId: string, effectId: string) => {
      effects.removeVisualEffect(scrubberId, effectId);
      autoSaveEffects(scrubberId);
    },
    [effects, autoSaveEffects]
  );

  const updateVisualEffect = useCallback(
    (scrubberId: string, effectId: string, updates: Parameters<typeof effects.updateVisualEffect>[2]) => {
      effects.updateVisualEffect(scrubberId, effectId, updates);
      autoSaveEffects(scrubberId);
    },
    [effects, autoSaveEffects]
  );

  const toggleVisualEffect = useCallback(
    (scrubberId: string, effectId: string, enabled: boolean) => {
      effects.toggleVisualEffect(scrubberId, effectId);
      autoSaveEffects(scrubberId);
    },
    [effects, autoSaveEffects]
  );

  const setColorCorrection = useCallback(
    (scrubberId: string, correction: Parameters<typeof effects.setColorCorrection>[1]) => {
      effects.setColorCorrection(scrubberId, correction);
      autoSaveEffects(scrubberId);
    },
    [effects, autoSaveEffects]
  );

  const addAudioEffect = useCallback(
    (scrubberId: string, effect: Parameters<typeof effects.addAudioEffect>[1]) => {
      const result = effects.addAudioEffect(scrubberId, effect);
      autoSaveEffects(scrubberId);
      return result;
    },
    [effects, autoSaveEffects]
  );

  const removeAudioEffect = useCallback(
    (scrubberId: string, effectId: string) => {
      effects.removeAudioEffect(scrubberId, effectId);
      autoSaveEffects(scrubberId);
    },
    [effects, autoSaveEffects]
  );

  const updateAudioEffect = useCallback(
    (scrubberId: string, effectId: string, updates: Parameters<typeof effects.updateAudioEffect>[2]) => {
      effects.updateAudioEffect(scrubberId, effectId, updates);
      autoSaveEffects(scrubberId);
    },
    [effects, autoSaveEffects]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Enhanced operations with auto-save
    addVisualEffect,
    removeVisualEffect,
    updateVisualEffect,
    toggleVisualEffect,
    setColorCorrection,
    addAudioEffect,
    removeAudioEffect,
    updateAudioEffect,

    // Pass-through operations (read-only, no save needed)
    getVisualEffects: effects.getVisualEffects,
    getAudioEffects: effects.getAudioEffects,
    getColorCorrection: effects.getColorCorrection,
    resetColorCorrection: effects.resetColorCorrection,
    applyLUT: effects.applyLUT,
    removeLUT: effects.removeLUT,
    getLUT: effects.getLUT,
    addKeyframe: effects.addKeyframe,
    removeKeyframe: effects.removeKeyframe,
    updateKeyframe: effects.updateKeyframe,
    getKeyframeTracks: effects.getKeyframeTracks,
    addMask: effects.addMask,
    removeMask: effects.removeMask,
    updateMask: effects.updateMask,
    getMasks: effects.getMasks,
    addMotionTracker: effects.addMotionTracker,
    removeMotionTracker: effects.removeMotionTracker,
    getMotionTrackers: effects.getMotionTrackers,
    setStabilization: effects.setStabilization,
    getStabilization: effects.getStabilization,
    set3DTransform: effects.set3DTransform,
    reset3DTransform: effects.reset3DTransform,
    get3DTransform: effects.get3DTransform,
    setSpeedRemap: effects.setSpeedRemap,
    getSpeedRemap: effects.getSpeedRemap,

    // Persistence operations
    loadEffectsForScrubber,
    loadAllEffects,
    saveEffectsForScrubber,
    autoSaveEffects,

    // State
    hasLoaded: hasLoadedRef.current,
  };
};