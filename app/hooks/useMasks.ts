import { useState, useEffect, useCallback } from 'react';
import type { Mask, AdjustmentLayer, CompositingSettings } from '../components/timeline/advanced-types';

export function useMasks(projectId: string, scrubberId: string) {
  const [masks, setMasks] = useState<Mask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load masks for the current scrubber
  const loadMasks = useCallback(async () => {
    if (!projectId || !scrubberId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/masks/${projectId}/${scrubberId}`);
      if (!response.ok) throw new Error('Failed to load masks');

      const data = await response.json();
      setMasks(data.masks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId, scrubberId]);

  // Create a new mask
  const createMask = useCallback(async (maskData: Omit<Mask, 'id'>) => {
    try {
      const response = await fetch(`/api/masks/${projectId}/${scrubberId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mask: maskData })
      });

      if (!response.ok) throw new Error('Failed to create mask');

      const data = await response.json();
      setMasks(prev => [...prev, data.mask]);
      return data.mask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [projectId, scrubberId]);

  // Update an existing mask
  const updateMask = useCallback(async (maskId: string, updates: Partial<Mask>) => {
    try {
      const response = await fetch(`/api/masks/${maskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) throw new Error('Failed to update mask');

      setMasks(prev => prev.map(mask =>
        mask.id === maskId ? { ...mask, ...updates } : mask
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  // Delete a mask
  const deleteMask = useCallback(async (maskId: string) => {
    try {
      const response = await fetch(`/api/masks/${maskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete mask');

      setMasks(prev => prev.filter(mask => mask.id !== maskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  // Load masks when project/scrubber changes
  useEffect(() => {
    loadMasks();
  }, [loadMasks]);

  return {
    masks,
    loading,
    error,
    createMask,
    updateMask,
    deleteMask,
    reloadMasks: loadMasks
  };
}

export function useAdjustmentLayers(projectId: string) {
  const [layers, setLayers] = useState<AdjustmentLayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load adjustment layers
  const loadLayers = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/adjustment-layers/${projectId}`);
      if (!response.ok) throw new Error('Failed to load adjustment layers');

      const data = await response.json();
      setLayers(data.layers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Create a new adjustment layer
  const createLayer = useCallback(async (layerData: Omit<AdjustmentLayer, 'id'>) => {
    try {
      const response = await fetch(`/api/adjustment-layers/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layer: layerData })
      });

      if (!response.ok) throw new Error('Failed to create adjustment layer');

      const data = await response.json();
      setLayers(prev => [...prev, data.layer]);
      return data.layer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [projectId]);

  // Update an adjustment layer
  const updateLayer = useCallback(async (layerId: string, updates: Partial<AdjustmentLayer>) => {
    try {
      const response = await fetch(`/api/adjustment-layers/${layerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) throw new Error('Failed to update adjustment layer');

      setLayers(prev => prev.map(layer =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  // Delete an adjustment layer
  const deleteLayer = useCallback(async (layerId: string) => {
    try {
      const response = await fetch(`/api/adjustment-layers/${layerId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete adjustment layer');

      setLayers(prev => prev.filter(layer => layer.id !== layerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  // Load layers when project changes
  useEffect(() => {
    loadLayers();
  }, [loadLayers]);

  return {
    layers,
    loading,
    error,
    createLayer,
    updateLayer,
    deleteLayer,
    reloadLayers: loadLayers
  };
}

export function useCompositing(projectId: string) {
  const [settings, setSettings] = useState<CompositingSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load compositing settings
  const loadSettings = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/compositing/${projectId}`);
      if (!response.ok) throw new Error('Failed to load compositing settings');

      const data = await response.json();
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Update compositing settings
  const updateSettings = useCallback(async (updates: Partial<CompositingSettings>) => {
    try {
      const response = await fetch(`/api/compositing/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) throw new Error('Failed to update compositing settings');

      setSettings((prev: CompositingSettings | null) => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [projectId]);

  // Load settings when project changes
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    reloadSettings: loadSettings
  };
}