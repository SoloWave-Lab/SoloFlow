import { db } from "./db.server";
import type { Mask, AdjustmentLayer, CompositingSettings } from "../components/timeline/advanced-types";

export class MasksRepository {
  // ============================================
  // MASKS
  // ============================================

  static async getMasksForScrubber(projectId: string, scrubberId: string): Promise<Mask[]> {
    const result = await db.query(`
      SELECT id, mask_type, enabled, inverted, feather, opacity, expansion,
             x, y, width, height, rotation, points, text_content,
             font_family, font_size, mask_image_url
      FROM masks
      WHERE project_id = $1 AND scrubber_id = $2
      ORDER BY created_at ASC
    `, [projectId, scrubberId]);

    return result.rows.map(row => ({
      id: row.id,
      type: row.mask_type as Mask['type'],
      enabled: row.enabled,
      inverted: row.inverted,
      feather: row.feather,
      opacity: row.opacity,
      expansion: row.expansion,
      shape: row.x !== null ? {
        x: row.x,
        y: row.y,
        width: row.width,
        height: row.height,
        rotation: row.rotation
      } : undefined,
      points: row.points || []
    }));
  }

  static async createMask(projectId: string, scrubberId: string, mask: Omit<Mask, 'id'>): Promise<Mask> {
    const result = await db.query(`
      INSERT INTO masks (project_id, scrubber_id, mask_type, enabled, inverted,
                        feather, opacity, expansion, x, y, width, height, rotation,
                        points, text_content, font_family, font_size, mask_image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id
    `, [
      projectId,
      scrubberId,
      mask.type,
      mask.enabled,
      mask.inverted,
      mask.feather,
      mask.opacity,
      mask.expansion,
      mask.shape?.x || null,
      mask.shape?.y || null,
      mask.shape?.width || null,
      mask.shape?.height || null,
      mask.shape?.rotation || 0,
      JSON.stringify(mask.points || []),
      null, // text_content
      null, // font_family
      null, // font_size
      null  // mask_image_url
    ]);

    return {
      ...mask,
      id: result.rows[0].id
    };
  }

  static async updateMask(maskId: string, updates: Partial<Mask>): Promise<void> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.enabled !== undefined) {
      fields.push(`enabled = $${paramIndex++}`);
      values.push(updates.enabled);
    }
    if (updates.inverted !== undefined) {
      fields.push(`inverted = $${paramIndex++}`);
      values.push(updates.inverted);
    }
    if (updates.feather !== undefined) {
      fields.push(`feather = $${paramIndex++}`);
      values.push(updates.feather);
    }
    if (updates.opacity !== undefined) {
      fields.push(`opacity = $${paramIndex++}`);
      values.push(updates.opacity);
    }
    if (updates.expansion !== undefined) {
      fields.push(`expansion = $${paramIndex++}`);
      values.push(updates.expansion);
    }
    if (updates.shape) {
      fields.push(`x = $${paramIndex++}, y = $${paramIndex++}, width = $${paramIndex++}, height = $${paramIndex++}, rotation = $${paramIndex++}`);
      values.push(updates.shape.x, updates.shape.y, updates.shape.width, updates.shape.height, updates.shape.rotation);
    }
    if (updates.points) {
      fields.push(`points = $${paramIndex++}`);
      values.push(JSON.stringify(updates.points));
    }

    if (fields.length === 0) return;

    values.push(maskId);
    await db.query(`
      UPDATE masks
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
    `, values);
  }

  static async deleteMask(maskId: string): Promise<void> {
    await db.query('DELETE FROM masks WHERE id = $1', [maskId]);
  }

  // ============================================
  // ADJUSTMENT LAYERS
  // ============================================

  static async getAdjustmentLayers(projectId: string): Promise<AdjustmentLayer[]> {
    const result = await db.query(`
      SELECT id, name, start_time, end_time, track_index, opacity, blend_mode,
             brightness, contrast, saturation, hue, temperature, tint,
             exposure, highlights, shadows, whites, blacks, vibrance, gamma
      FROM adjustment_layers
      WHERE project_id = $1
      ORDER BY track_index ASC, start_time ASC
    `, [projectId]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      startTime: row.start_time,
      endTime: row.end_time,
      trackIndex: row.track_index,
      opacity: row.opacity,
      blendMode: row.blend_mode,
      effects: [], // Will be populated separately
      colorCorrection: {
        brightness: row.brightness,
        contrast: row.contrast,
        saturation: row.saturation,
        hue: row.hue,
        temperature: row.temperature,
        tint: row.tint,
        exposure: row.exposure,
        highlights: row.highlights,
        shadows: row.shadows,
        whites: row.whites,
        blacks: row.blacks,
        vibrance: row.vibrance,
        gamma: row.gamma
      }
    }));
  }

  static async createAdjustmentLayer(projectId: string, layer: Omit<AdjustmentLayer, 'id'>): Promise<AdjustmentLayer> {
    const result = await db.query(`
      INSERT INTO adjustment_layers (project_id, name, start_time, end_time, track_index,
                                   opacity, blend_mode, brightness, contrast, saturation,
                                   hue, temperature, tint, exposure, highlights, shadows,
                                   whites, blacks, vibrance, gamma)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id
    `, [
      projectId,
      layer.name,
      layer.startTime,
      layer.endTime,
      layer.trackIndex,
      layer.opacity,
      layer.blendMode,
      layer.colorCorrection.brightness,
      layer.colorCorrection.contrast,
      layer.colorCorrection.saturation,
      layer.colorCorrection.hue,
      layer.colorCorrection.temperature,
      layer.colorCorrection.tint,
      layer.colorCorrection.exposure,
      layer.colorCorrection.highlights,
      layer.colorCorrection.shadows,
      layer.colorCorrection.whites,
      layer.colorCorrection.blacks,
      layer.colorCorrection.vibrance,
      layer.colorCorrection.gamma
    ]);

    return {
      ...layer,
      id: result.rows[0].id
    };
  }

  static async updateAdjustmentLayer(layerId: string, updates: Partial<AdjustmentLayer>): Promise<void> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.startTime !== undefined) {
      fields.push(`start_time = $${paramIndex++}`);
      values.push(updates.startTime);
    }
    if (updates.endTime !== undefined) {
      fields.push(`end_time = $${paramIndex++}`);
      values.push(updates.endTime);
    }
    if (updates.trackIndex !== undefined) {
      fields.push(`track_index = $${paramIndex++}`);
      values.push(updates.trackIndex);
    }
    if (updates.opacity !== undefined) {
      fields.push(`opacity = $${paramIndex++}`);
      values.push(updates.opacity);
    }
    if (updates.blendMode !== undefined) {
      fields.push(`blend_mode = $${paramIndex++}`);
      values.push(updates.blendMode);
    }
    if (updates.colorCorrection) {
      const cc = updates.colorCorrection;
      fields.push(`brightness = $${paramIndex++}, contrast = $${paramIndex++}, saturation = $${paramIndex++}`);
      fields.push(`hue = $${paramIndex++}, temperature = $${paramIndex++}, tint = $${paramIndex++}`);
      fields.push(`exposure = $${paramIndex++}, highlights = $${paramIndex++}, shadows = $${paramIndex++}`);
      fields.push(`whites = $${paramIndex++}, blacks = $${paramIndex++}, vibrance = $${paramIndex++}, gamma = $${paramIndex++}`);
      values.push(cc.brightness, cc.contrast, cc.saturation, cc.hue, cc.temperature, cc.tint);
      values.push(cc.exposure, cc.highlights, cc.shadows, cc.whites, cc.blacks, cc.vibrance, cc.gamma);
    }

    if (fields.length === 0) return;

    values.push(layerId);
    await db.query(`
      UPDATE adjustment_layers
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
    `, values);
  }

  static async deleteAdjustmentLayer(layerId: string): Promise<void> {
    await db.query('DELETE FROM adjustment_layers WHERE id = $1', [layerId]);
  }

  // ============================================
  // COMPOSITING SETTINGS
  // ============================================

  static async getCompositingSettings(projectId: string): Promise<CompositingSettings | null> {
    const result = await db.query(`
      SELECT layer_ordering, track_matte_enabled, track_matte_source, track_matte_target
      FROM compositing_settings
      WHERE project_id = $1
    `, [projectId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: 'default', // We'll use a fixed ID for simplicity
      blendMode: 'normal' as const,
      opacity: 100,
      preserveTransparency: false,
      knockoutGroup: false,
      layerOrdering: row.layer_ordering || [],
      trackMatteEnabled: row.track_matte_enabled,
      trackMatteSource: row.track_matte_source,
      trackMatteTarget: row.track_matte_target
    };
  }

  static async updateCompositingSettings(projectId: string, settings: Partial<CompositingSettings>): Promise<void> {
    const existing = await this.getCompositingSettings(projectId);

    if (existing) {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (settings.layerOrdering !== undefined) {
        fields.push(`layer_ordering = $${paramIndex++}`);
        values.push(JSON.stringify(settings.layerOrdering));
      }
      if (settings.trackMatteEnabled !== undefined) {
        fields.push(`track_matte_enabled = $${paramIndex++}`);
        values.push(settings.trackMatteEnabled);
      }
      if (settings.trackMatteSource !== undefined) {
        fields.push(`track_matte_source = $${paramIndex++}`);
        values.push(settings.trackMatteSource);
      }
      if (settings.trackMatteTarget !== undefined) {
        fields.push(`track_matte_target = $${paramIndex++}`);
        values.push(settings.trackMatteTarget);
      }

      if (fields.length > 0) {
        values.push(projectId);
        await db.query(`
          UPDATE compositing_settings
          SET ${fields.join(', ')}
          WHERE project_id = $${paramIndex}
        `, values);
      }
    } else {
      await db.query(`
        INSERT INTO compositing_settings (project_id, layer_ordering, track_matte_enabled, track_matte_source, track_matte_target)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        projectId,
        JSON.stringify(settings.layerOrdering || []),
        settings.trackMatteEnabled || false,
        settings.trackMatteSource || null,
        settings.trackMatteTarget || null
      ]);
    }
  }
}