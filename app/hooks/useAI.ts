import { useState, useEffect, useCallback } from 'react';
import type {
  AutoCaptionSettings,
  AutoColorSettings,
  SceneDetectionSettings,
  BackgroundRemovalSettings
} from '../components/timeline/advanced-types';

export function useAutoCaptions(assetId: string) {
  const [captions, setCaptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load captions for the asset
  const loadCaptions = useCallback(async () => {
    if (!assetId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/captions/${assetId}`);
      if (!response.ok) throw new Error('Failed to load captions');

      const data = await response.json();
      setCaptions(data.captions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  // Generate captions
  const generateCaptions = useCallback(async (settings: AutoCaptionSettings) => {
    try {
      const response = await fetch('/api/ai/captions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, settings })
      });

      if (!response.ok) throw new Error('Failed to generate captions');

      const data = await response.json();
      await loadCaptions(); // Reload to get updated status
      return data.captionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [assetId, loadCaptions]);

  // Edit caption
  const editCaption = useCallback(async (captionId: string, startTime: number, endTime: number, text: string) => {
    try {
      const response = await fetch(`/api/ai/captions/${captionId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime, endTime, text })
      });

      if (!response.ok) throw new Error('Failed to edit caption');

      await loadCaptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [loadCaptions]);

  // Export captions
  const exportCaptions = useCallback(async (captionId: string, format: string) => {
    try {
      const response = await fetch(`/api/ai/captions/${captionId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });

      if (!response.ok) throw new Error('Failed to export captions');

      return await response.blob();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  useEffect(() => {
    loadCaptions();
  }, [loadCaptions]);

  return {
    captions,
    loading,
    error,
    generateCaptions,
    editCaption,
    exportCaptions,
    reloadCaptions: loadCaptions
  };
}

export function useAutoColorCorrection(scrubberId: string) {
  const [correction, setCorrection] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load color correction settings
  const loadCorrection = useCallback(async () => {
    if (!scrubberId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/color-correction/${scrubberId}`);
      if (!response.ok) throw new Error('Failed to load color correction');

      const data = await response.json();
      setCorrection(data.correction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [scrubberId]);

  // Apply auto color correction
  const applyCorrection = useCallback(async (settings: AutoColorSettings) => {
    try {
      const response = await fetch('/api/ai/color-correction/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scrubberId, settings })
      });

      if (!response.ok) throw new Error('Failed to apply color correction');

      const data = await response.json();
      await loadCorrection();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [scrubberId, loadCorrection]);

  // Update correction settings
  const updateCorrection = useCallback(async (updates: Partial<any>) => {
    try {
      const response = await fetch(`/api/ai/color-correction/${scrubberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) throw new Error('Failed to update color correction');

      setCorrection((prev: any) => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [scrubberId]);

  useEffect(() => {
    loadCorrection();
  }, [loadCorrection]);

  return {
    correction,
    loading,
    error,
    applyCorrection,
    updateCorrection,
    reloadCorrection: loadCorrection
  };
}

export function useSceneDetection(assetId: string) {
  const [detection, setDetection] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load scene detection
  const loadDetection = useCallback(async () => {
    if (!assetId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/scene-detection/${assetId}`);
      if (!response.ok) throw new Error('Failed to load scene detection');

      const data = await response.json();
      setDetection(data.detection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  // Run scene detection
  const runDetection = useCallback(async (settings: SceneDetectionSettings) => {
    try {
      const response = await fetch('/api/ai/scene-detection/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, settings })
      });

      if (!response.ok) throw new Error('Failed to run scene detection');

      const data = await response.json();
      await loadDetection();
      return data.detectionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [assetId, loadDetection]);

  // Apply scene splits
  const applySceneSplits = useCallback(async (detectionId: string) => {
    try {
      const response = await fetch(`/api/ai/scene-detection/${detectionId}/apply`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to apply scene splits');

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  useEffect(() => {
    loadDetection();
  }, [loadDetection]);

  return {
    detection,
    loading,
    error,
    runDetection,
    applySceneSplits,
    reloadDetection: loadDetection
  };
}

export function useBackgroundRemoval(scrubberId: string) {
  const [removal, setRemoval] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load background removal settings
  const loadRemoval = useCallback(async () => {
    if (!scrubberId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/background-removal/${scrubberId}`);
      if (!response.ok) throw new Error('Failed to load background removal');

      const data = await response.json();
      setRemoval(data.removal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [scrubberId]);

  // Apply background removal
  const applyRemoval = useCallback(async (settings: BackgroundRemovalSettings) => {
    try {
      const response = await fetch('/api/ai/background-removal/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scrubberId, settings })
      });

      if (!response.ok) throw new Error('Failed to apply background removal');

      const data = await response.json();
      await loadRemoval();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [scrubberId, loadRemoval]);

  // Update removal settings
  const updateRemoval = useCallback(async (updates: Partial<any>) => {
    try {
      const response = await fetch(`/api/ai/background-removal/${scrubberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) throw new Error('Failed to update background removal');

      setRemoval((prev: any) => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [scrubberId]);

  useEffect(() => {
    loadRemoval();
  }, [loadRemoval]);

  return {
    removal,
    loading,
    error,
    applyRemoval,
    updateRemoval,
    reloadRemoval: loadRemoval
  };
}

export function useSmartCrop(scrubberId: string) {
  const [crop, setCrop] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load smart crop settings
  const loadCrop = useCallback(async () => {
    if (!scrubberId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/smart-crop/${scrubberId}`);
      if (!response.ok) throw new Error('Failed to load smart crop');

      const data = await response.json();
      setCrop(data.crop);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [scrubberId]);

  // Apply smart crop
  const applyCrop = useCallback(async (aspectRatio: string = '16:9') => {
    try {
      const response = await fetch('/api/ai/smart-crop/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scrubberId, aspectRatio })
      });

      if (!response.ok) throw new Error('Failed to apply smart crop');

      const data = await response.json();
      await loadCrop();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [scrubberId, loadCrop]);

  // Update crop settings
  const updateCrop = useCallback(async (updates: Partial<any>) => {
    try {
      const response = await fetch(`/api/ai/smart-crop/${scrubberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) throw new Error('Failed to update smart crop');

      setCrop((prev: any) => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [scrubberId]);

  useEffect(() => {
    loadCrop();
  }, [loadCrop]);

  return {
    crop,
    loading,
    error,
    applyCrop,
    updateCrop,
    reloadCrop: loadCrop
  };
}