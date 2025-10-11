import { db } from "./db.server";
import type {
  AutoCaptionSettings,
  AutoColorSettings,
  SceneDetectionSettings,
  BackgroundRemovalSettings
} from "../components/timeline/advanced-types";

interface CaptionData {
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number;
}

interface SceneData {
  startTime: number;
  endTime: number;
  confidence: number;
}

export class AIRepository {
  // ============================================
  // AUTO CAPTIONS
  // ============================================

  static async createAutoCaption(
    projectId: string,
    assetId: string,
    settings: AutoCaptionSettings
  ): Promise<string> {
    const result = await db.query(`
      INSERT INTO auto_captions (project_id, asset_id, language, model, style_settings)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      projectId,
      assetId,
      settings.language,
      settings.model,
      JSON.stringify({
        fontFamily: settings.style.fontFamily,
        fontSize: settings.style.fontSize,
        color: settings.style.color,
        backgroundColor: settings.style.backgroundColor,
        position: settings.style.position,
        alignment: settings.style.alignment
      })
    ]);

    return result.rows[0].id;
  }

  static async getAutoCaptionsForAsset(assetId: string): Promise<any[]> {
    const result = await db.query(`
      SELECT id, language, model, status, captions_data, style_settings, export_formats
      FROM auto_captions
      WHERE asset_id = $1
      ORDER BY created_at DESC
    `, [assetId]);

    return result.rows.map(row => ({
      id: row.id,
      language: row.language,
      model: row.model,
      status: row.status,
      captions: row.captions_data || [],
      style: row.style_settings || {},
      exportFormats: row.export_formats || []
    }));
  }

  static async updateCaptionStatus(captionId: string, status: string, captions?: CaptionData[]): Promise<void> {
    await db.query(`
      UPDATE auto_captions
      SET status = $1, captions_data = $2, processed_at = NOW()
      WHERE id = $3
    `, [status, captions ? JSON.stringify(captions) : null, captionId]);
  }

  static async addCaptionEdit(
    captionId: string,
    startTime: number,
    endTime: number,
    text: string,
    confidence?: number
  ): Promise<void> {
    await db.query(`
      INSERT INTO caption_edits (caption_id, start_time, end_time, text, confidence, edited)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (caption_id, start_time) DO UPDATE SET
        end_time = EXCLUDED.end_time,
        text = EXCLUDED.text,
        confidence = EXCLUDED.confidence,
        edited = true,
        updated_at = NOW()
    `, [captionId, startTime, endTime, text, confidence]);
  }

  static async getCaptionEdits(captionId: string): Promise<any[]> {
    const result = await db.query(`
      SELECT start_time, end_time, text, confidence, edited
      FROM caption_edits
      WHERE caption_id = $1
      ORDER BY start_time ASC
    `, [captionId]);

    return result.rows;
  }

  // ============================================
  // AUTO COLOR CORRECTION
  // ============================================

  static async createAutoColorCorrection(
    projectId: string,
    scrubberId: string,
    settings: AutoColorSettings
  ): Promise<string> {
    const result = await db.query(`
      INSERT INTO auto_color_correction (project_id, scrubber_id, style, intensity)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [projectId, scrubberId, settings.style, settings.intensity]);

    return result.rows[0].id;
  }

  static async getAutoColorCorrection(scrubberId: string): Promise<any | null> {
    const result = await db.query(`
      SELECT id, enabled, style, intensity, before_preview, after_preview, correction_data
      FROM auto_color_correction
      WHERE scrubber_id = $1
    `, [scrubberId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      enabled: row.enabled,
      style: row.style,
      intensity: row.intensity,
      beforePreview: row.before_preview,
      afterPreview: row.after_preview,
      correctionData: row.correction_data || {}
    };
  }

  static async updateAutoColorCorrection(
    scrubberId: string,
    updates: Partial<{ enabled: boolean; style: string; intensity: number; correctionData: any; previews: { before: string; after: string } }>
  ): Promise<void> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.enabled !== undefined) {
      fields.push(`enabled = $${paramIndex++}`);
      values.push(updates.enabled);
    }
    if (updates.style !== undefined) {
      fields.push(`style = $${paramIndex++}`);
      values.push(updates.style);
    }
    if (updates.intensity !== undefined) {
      fields.push(`intensity = $${paramIndex++}`);
      values.push(updates.intensity);
    }
    if (updates.correctionData !== undefined) {
      fields.push(`correction_data = $${paramIndex++}`);
      values.push(JSON.stringify(updates.correctionData));
    }
    if (updates.previews) {
      fields.push(`before_preview = $${paramIndex++}, after_preview = $${paramIndex++}`);
      values.push(updates.previews.before, updates.previews.after);
    }

    if (fields.length === 0) return;

    values.push(scrubberId);
    await db.query(`
      UPDATE auto_color_correction
      SET ${fields.join(', ')}
      WHERE scrubber_id = $${paramIndex}
    `, values);
  }

  // ============================================
  // SCENE DETECTION
  // ============================================

  static async createSceneDetection(
    projectId: string,
    assetId: string,
    settings: SceneDetectionSettings
  ): Promise<string> {
    const result = await db.query(`
      INSERT INTO scene_detection (project_id, asset_id, sensitivity, min_scene_duration, auto_split_enabled)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [projectId, assetId, settings.sensitivity, settings.minSceneDuration, false]);

    return result.rows[0].id;
  }

  static async getSceneDetection(assetId: string): Promise<any | null> {
    const result = await db.query(`
      SELECT id, status, sensitivity, min_scene_duration, scenes_data, auto_split_enabled
      FROM scene_detection
      WHERE asset_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [assetId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      status: row.status,
      sensitivity: row.sensitivity,
      minSceneDuration: row.min_scene_duration,
      scenes: row.scenes_data || [],
      autoSplitEnabled: row.auto_split_enabled
    };
  }

  static async updateSceneDetectionStatus(detectionId: string, status: string, scenes?: SceneData[]): Promise<void> {
    await db.query(`
      UPDATE scene_detection
      SET status = $1, scenes_data = $2, processed_at = NOW()
      WHERE id = $3
    `, [status, scenes ? JSON.stringify(scenes) : null, detectionId]);
  }

  // ============================================
  // BACKGROUND REMOVAL
  // ============================================

  static async createBackgroundRemoval(
    projectId: string,
    scrubberId: string,
    settings: BackgroundRemovalSettings
  ): Promise<string> {
    const result = await db.query(`
      INSERT INTO background_removal (project_id, scrubber_id, model, quality, edge_refinement)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [projectId, scrubberId, settings.model, settings.quality, settings.edgeRefinement]);

    return result.rows[0].id;
  }

  static async getBackgroundRemoval(scrubberId: string): Promise<any | null> {
    const result = await db.query(`
      SELECT id, enabled, model, quality, edge_refinement, status, mask_data
      FROM background_removal
      WHERE scrubber_id = $1
    `, [scrubberId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      enabled: row.enabled,
      model: row.model,
      quality: row.quality,
      edgeRefinement: row.edge_refinement,
      status: row.status,
      maskData: row.mask_data
    };
  }

  static async updateBackgroundRemoval(
    scrubberId: string,
    updates: Partial<{ enabled: boolean; status: string; maskData: string }>
  ): Promise<void> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.enabled !== undefined) {
      fields.push(`enabled = $${paramIndex++}`);
      values.push(updates.enabled);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
      if (updates.status === 'completed') {
        fields.push('processed_at = NOW()');
      }
    }
    if (updates.maskData !== undefined) {
      fields.push(`mask_data = $${paramIndex++}`);
      values.push(updates.maskData);
    }

    if (fields.length === 0) return;

    values.push(scrubberId);
    await db.query(`
      UPDATE background_removal
      SET ${fields.join(', ')}
      WHERE scrubber_id = $${paramIndex}
    `, values);
  }

  // ============================================
  // SMART CROP/REFRAME
  // ============================================

  static async createSmartCrop(
    projectId: string,
    scrubberId: string,
    aspectRatio: string = '16:9'
  ): Promise<string> {
    const result = await db.query(`
      INSERT INTO smart_crop (project_id, scrubber_id, aspect_ratio)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [projectId, scrubberId, aspectRatio]);

    return result.rows[0].id;
  }

  static async getSmartCrop(scrubberId: string): Promise<any | null> {
    const result = await db.query(`
      SELECT id, enabled, aspect_ratio, content_detection, face_tracking,
             object_tracking, sensitivity, crop_data
      FROM smart_crop
      WHERE scrubber_id = $1
    `, [scrubberId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      enabled: row.enabled,
      aspectRatio: row.aspect_ratio,
      contentDetection: row.content_detection,
      faceTracking: row.face_tracking,
      objectTracking: row.object_tracking,
      sensitivity: row.sensitivity,
      cropData: row.crop_data || {}
    };
  }

  static async updateSmartCrop(
    scrubberId: string,
    updates: Partial<{ enabled: boolean; aspectRatio: string; cropData: any }>
  ): Promise<void> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.enabled !== undefined) {
      fields.push(`enabled = $${paramIndex++}`);
      values.push(updates.enabled);
    }
    if (updates.aspectRatio !== undefined) {
      fields.push(`aspect_ratio = $${paramIndex++}`);
      values.push(updates.aspectRatio);
    }
    if (updates.cropData !== undefined) {
      fields.push(`crop_data = $${paramIndex++}`);
      values.push(JSON.stringify(updates.cropData));
    }

    if (fields.length === 0) return;

    values.push(scrubberId);
    await db.query(`
      UPDATE smart_crop
      SET ${fields.join(', ')}
      WHERE scrubber_id = $${paramIndex}
    `, values);
  }
}