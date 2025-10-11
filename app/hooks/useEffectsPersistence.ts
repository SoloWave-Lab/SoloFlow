import { useEffect, useCallback } from "react";
import type { ScrubberState } from "~/components/timeline/types";
import type { VisualEffect, ColorCorrection, AudioEffect } from "~/components/timeline/advanced-types";

/**
 * Hook to handle loading and saving effects for scrubbers
 */
export function useEffectsPersistence(projectId: string | null) {
  /**
   * Load effects for a specific scrubber from the database
   */
  const loadEffectsForScrubber = useCallback(async (scrubberId: string) => {
    if (!projectId) return null;

    try {
      const [visualRes, colorRes, audioRes, blendRes] = await Promise.all([
        fetch(`/api/effects/visual/${scrubberId}`),
        fetch(`/api/effects/color/${scrubberId}`),
        fetch(`/api/effects/audio/${scrubberId}`),
        fetch(`/api/effects/blend/${scrubberId}`),
      ]);

      const visualEffects = visualRes.ok ? await visualRes.json() : [];
      const colorCorrection = colorRes.ok ? await colorRes.json() : null;
      const audioEffects = audioRes.ok ? await audioRes.json() : [];
      const blendMode = blendRes.ok ? await blendRes.json() : null;

      return {
        visualEffects: visualEffects as VisualEffect[],
        colorCorrection: colorCorrection as ColorCorrection | null,
        audioEffects: audioEffects as AudioEffect[],
        blendMode: blendMode?.mode as string | undefined,
        opacity: blendMode?.opacity as number | undefined,
      };
    } catch (error) {
      console.error("Failed to load effects for scrubber:", scrubberId, error);
      return null;
    }
  }, [projectId]);

  /**
   * Load effects for all scrubbers in the timeline
   */
  const loadAllEffects = useCallback(async (scrubbers: ScrubberState[]) => {
    if (!projectId || scrubbers.length === 0) return scrubbers;

    try {
      // Load effects for all scrubbers in parallel
      const effectsPromises = scrubbers.map(scrubber => 
        loadEffectsForScrubber(scrubber.id)
      );

      const effectsResults = await Promise.all(effectsPromises);

      // Merge effects into scrubbers
      return scrubbers.map((scrubber, index) => {
        const effects = effectsResults[index];
        if (!effects) return scrubber;

        return {
          ...scrubber,
          visualEffects: effects.visualEffects.length > 0 ? effects.visualEffects : undefined,
          colorCorrection: effects.colorCorrection || undefined,
          audioEffects: effects.audioEffects.length > 0 ? effects.audioEffects : undefined,
          blendMode: effects.blendMode,
          opacity: effects.opacity,
        };
      });
    } catch (error) {
      console.error("Failed to load effects for scrubbers:", error);
      return scrubbers;
    }
  }, [projectId, loadEffectsForScrubber]);

  /**
   * Save visual effects for a scrubber
   */
  const saveVisualEffects = useCallback(async (
    scrubberId: string,
    effects: VisualEffect[]
  ) => {
    if (!projectId) return false;

    try {
      const response = await fetch("/api/effects/visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          scrubberId,
          effects,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to save visual effects:", error);
      return false;
    }
  }, [projectId]);

  /**
   * Save color correction for a scrubber
   */
  const saveColorCorrection = useCallback(async (
    scrubberId: string,
    colorCorrection: ColorCorrection
  ) => {
    if (!projectId) return false;

    try {
      const response = await fetch("/api/effects/color", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          scrubberId,
          ...colorCorrection,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to save color correction:", error);
      return false;
    }
  }, [projectId]);

  /**
   * Save audio effects for a scrubber
   */
  const saveAudioEffects = useCallback(async (
    scrubberId: string,
    effects: AudioEffect[]
  ) => {
    if (!projectId) return false;

    try {
      const response = await fetch("/api/effects/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          scrubberId,
          effects,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to save audio effects:", error);
      return false;
    }
  }, [projectId]);

  /**
   * Save blend mode for a scrubber
   */
  const saveBlendMode = useCallback(async (
    scrubberId: string,
    blendMode: string,
    opacity: number
  ) => {
    if (!projectId) return false;

    try {
      const response = await fetch("/api/effects/blend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          scrubberId,
          mode: blendMode,
          opacity,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to save blend mode:", error);
      return false;
    }
  }, [projectId]);

  /**
   * Save all effects for a scrubber (convenience method)
   */
  const saveAllEffects = useCallback(async (scrubber: ScrubberState) => {
    if (!projectId) return false;

    try {
      const promises: Promise<boolean>[] = [];

      if (scrubber.visualEffects && scrubber.visualEffects.length > 0) {
        promises.push(saveVisualEffects(scrubber.id, scrubber.visualEffects));
      }

      if (scrubber.colorCorrection) {
        promises.push(saveColorCorrection(scrubber.id, scrubber.colorCorrection));
      }

      if (scrubber.audioEffects && scrubber.audioEffects.length > 0) {
        promises.push(saveAudioEffects(scrubber.id, scrubber.audioEffects));
      }

      if (scrubber.blendMode && scrubber.opacity !== undefined) {
        promises.push(saveBlendMode(scrubber.id, scrubber.blendMode, scrubber.opacity));
      }

      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      console.error("Failed to save all effects:", error);
      return false;
    }
  }, [projectId, saveVisualEffects, saveColorCorrection, saveAudioEffects, saveBlendMode]);

  /**
   * Auto-save effects when they change (debounced)
   */
  const autoSaveEffects = useCallback(async (scrubber: ScrubberState) => {
    // Debounce auto-save to avoid too many requests
    const timeoutId = setTimeout(async () => {
      await saveAllEffects(scrubber);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [saveAllEffects]);

  return {
    loadEffectsForScrubber,
    loadAllEffects,
    saveVisualEffects,
    saveColorCorrection,
    saveAudioEffects,
    saveBlendMode,
    saveAllEffects,
    autoSaveEffects,
  };
}