import { Pool } from "pg";
import type {
  VisualEffect,
  AudioEffect,
  ColorCorrection,
  LUT,
  Keyframe,
  Mask,
} from "~/components/timeline/advanced-types";

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    const rawDbUrl = process.env.DATABASE_URL || "";
    let connectionString = rawDbUrl;
    try {
      const u = new URL(rawDbUrl);
      u.search = "";
      connectionString = u.toString();
    } catch {
      throw new Error("Invalid DATABASE_URL");
    }

    pool = new Pool({
      connectionString,
      ssl:
        connectionString.includes("supabase.co")
          ? { rejectUnauthorized: false }
          : process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: true }
          : { rejectUnauthorized: false },
    });
  }
  return pool;
}

// ============================================
// VISUAL EFFECTS
// ============================================

export async function saveVisualEffects(
  projectId: string,
  scrubberId: string,
  effects: VisualEffect[]
) {
  const db = getPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Delete existing effects for this scrubber
    await client.query(
      "DELETE FROM visual_effects WHERE project_id = $1 AND scrubber_id = $2",
      [projectId, scrubberId]
    );

    // Insert new effects
    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i];
      await client.query(
        `INSERT INTO visual_effects 
        (project_id, scrubber_id, effect_type, enabled, parameters, order_index)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [projectId, scrubberId, effect.type, effect.enabled, JSON.stringify(effect.parameters), i]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getVisualEffects(
  projectId: string,
  scrubberId: string
): Promise<VisualEffect[]> {
  const db = getPool();
  const result = await db.query(
    `SELECT id, effect_type as type, enabled, parameters
     FROM visual_effects
     WHERE project_id = $1 AND scrubber_id = $2
     ORDER BY order_index ASC`,
    [projectId, scrubberId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    type: row.type,
    enabled: row.enabled,
    parameters: row.parameters,
  }));
}

export async function getAllVisualEffects(
  projectId: string
): Promise<Map<string, VisualEffect[]>> {
  const db = getPool();
  const result = await db.query(
    `SELECT scrubber_id, id, effect_type as type, enabled, parameters
     FROM visual_effects
     WHERE project_id = $1
     ORDER BY scrubber_id, order_index ASC`,
    [projectId]
  );

  const effectsMap = new Map<string, VisualEffect[]>();
  for (const row of result.rows) {
    const scrubberId = row.scrubber_id;
    if (!effectsMap.has(scrubberId)) {
      effectsMap.set(scrubberId, []);
    }
    effectsMap.get(scrubberId)!.push({
      id: row.id,
      type: row.type,
      enabled: row.enabled,
      parameters: row.parameters,
    });
  }

  return effectsMap;
}

// ============================================
// COLOR CORRECTIONS
// ============================================

export async function saveColorCorrection(
  projectId: string,
  scrubberId: string,
  correction: ColorCorrection & {
    shadowsWheel?: { hue: number; saturation: number; luminance: number };
    midtonesWheel?: { hue: number; saturation: number; luminance: number };
    highlightsWheel?: { hue: number; saturation: number; luminance: number };
    curves?: {
      rgb?: Array<{ x: number; y: number }>;
      red?: Array<{ x: number; y: number }>;
      green?: Array<{ x: number; y: number }>;
      blue?: Array<{ x: number; y: number }>;
    };
  }
) {
  const db = getPool();
  await db.query(
    `INSERT INTO color_corrections (
      project_id, scrubber_id, brightness, contrast, saturation, hue,
      temperature, tint, exposure, highlights, shadows, whites, blacks,
      vibrance, gamma,
      shadows_hue, shadows_saturation, shadows_luminance,
      midtones_hue, midtones_saturation, midtones_luminance,
      highlights_hue, highlights_saturation, highlights_luminance,
      rgb_curve, red_curve, green_curve, blue_curve
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
    )
    ON CONFLICT (scrubber_id) DO UPDATE SET
      brightness = EXCLUDED.brightness,
      contrast = EXCLUDED.contrast,
      saturation = EXCLUDED.saturation,
      hue = EXCLUDED.hue,
      temperature = EXCLUDED.temperature,
      tint = EXCLUDED.tint,
      exposure = EXCLUDED.exposure,
      highlights = EXCLUDED.highlights,
      shadows = EXCLUDED.shadows,
      whites = EXCLUDED.whites,
      blacks = EXCLUDED.blacks,
      vibrance = EXCLUDED.vibrance,
      gamma = EXCLUDED.gamma,
      shadows_hue = EXCLUDED.shadows_hue,
      shadows_saturation = EXCLUDED.shadows_saturation,
      shadows_luminance = EXCLUDED.shadows_luminance,
      midtones_hue = EXCLUDED.midtones_hue,
      midtones_saturation = EXCLUDED.midtones_saturation,
      midtones_luminance = EXCLUDED.midtones_luminance,
      highlights_hue = EXCLUDED.highlights_hue,
      highlights_saturation = EXCLUDED.highlights_saturation,
      highlights_luminance = EXCLUDED.highlights_luminance,
      rgb_curve = EXCLUDED.rgb_curve,
      red_curve = EXCLUDED.red_curve,
      green_curve = EXCLUDED.green_curve,
      blue_curve = EXCLUDED.blue_curve,
      updated_at = NOW()`,
    [
      projectId,
      scrubberId,
      correction.brightness,
      correction.contrast,
      correction.saturation,
      correction.hue,
      correction.temperature,
      correction.tint,
      correction.exposure,
      correction.highlights,
      correction.shadows,
      correction.whites,
      correction.blacks,
      correction.vibrance,
      correction.gamma,
      correction.shadowsWheel?.hue || 0,
      correction.shadowsWheel?.saturation || 0,
      correction.shadowsWheel?.luminance || 0,
      correction.midtonesWheel?.hue || 0,
      correction.midtonesWheel?.saturation || 0,
      correction.midtonesWheel?.luminance || 0,
      correction.highlightsWheel?.hue || 0,
      correction.highlightsWheel?.saturation || 0,
      correction.highlightsWheel?.luminance || 0,
      JSON.stringify(correction.curves?.rgb || []),
      JSON.stringify(correction.curves?.red || []),
      JSON.stringify(correction.curves?.green || []),
      JSON.stringify(correction.curves?.blue || []),
    ]
  );
}

export async function getColorCorrection(
  projectId: string,
  scrubberId: string
): Promise<ColorCorrection | null> {
  const db = getPool();
  const result = await db.query(
    `SELECT * FROM color_corrections
     WHERE project_id = $1 AND scrubber_id = $2`,
    [projectId, scrubberId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
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
    gamma: row.gamma,
  };
}

export async function getAllColorCorrections(
  projectId: string
): Promise<Map<string, ColorCorrection>> {
  const db = getPool();
  const result = await db.query(
    `SELECT * FROM color_corrections WHERE project_id = $1`,
    [projectId]
  );

  const correctionsMap = new Map<string, ColorCorrection>();
  for (const row of result.rows) {
    correctionsMap.set(row.scrubber_id, {
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
      gamma: row.gamma,
    });
  }

  return correctionsMap;
}

// ============================================
// AUDIO EFFECTS
// ============================================

export async function saveAudioEffects(
  projectId: string,
  scrubberId: string,
  effects: AudioEffect[]
) {
  const db = getPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "DELETE FROM audio_effects WHERE project_id = $1 AND scrubber_id = $2",
      [projectId, scrubberId]
    );

    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i];
      await client.query(
        `INSERT INTO audio_effects 
        (project_id, scrubber_id, effect_type, enabled, parameters, order_index)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [projectId, scrubberId, effect.type, effect.enabled, JSON.stringify(effect.parameters), i]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getAudioEffects(
  projectId: string,
  scrubberId: string
): Promise<AudioEffect[]> {
  const db = getPool();
  const result = await db.query(
    `SELECT id, effect_type as type, enabled, parameters
     FROM audio_effects
     WHERE project_id = $1 AND scrubber_id = $2
     ORDER BY order_index ASC`,
    [projectId, scrubberId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    type: row.type,
    enabled: row.enabled,
    parameters: row.parameters,
  }));
}

export async function getAllAudioEffects(
  projectId: string
): Promise<Map<string, AudioEffect[]>> {
  const db = getPool();
  const result = await db.query(
    `SELECT scrubber_id, id, effect_type as type, enabled, parameters
     FROM audio_effects
     WHERE project_id = $1
     ORDER BY scrubber_id, order_index ASC`,
    [projectId]
  );

  const effectsMap = new Map<string, AudioEffect[]>();
  for (const row of result.rows) {
    const scrubberId = row.scrubber_id;
    if (!effectsMap.has(scrubberId)) {
      effectsMap.set(scrubberId, []);
    }
    effectsMap.get(scrubberId)!.push({
      id: row.id,
      type: row.type,
      enabled: row.enabled,
      parameters: row.parameters,
    });
  }

  return effectsMap;
}

// ============================================
// LUTS
// ============================================

export async function saveLUT(
  userId: string,
  name: string,
  fileUrl: string,
  fileType: "cube" | "3dl",
  thumbnailUrl?: string,
  size?: number,
  isPublic: boolean = false
): Promise<string> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO luts (user_id, name, file_url, file_type, thumbnail_url, size, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [userId, name, fileUrl, fileType, thumbnailUrl, size, isPublic]
  );

  return result.rows[0].id;
}

export async function getUserLUTs(userId: string): Promise<LUT[]> {
  const db = getPool();
  const result = await db.query(
    `SELECT id, name, file_url as url, 100 as intensity
     FROM luts
     WHERE user_id = $1 OR is_public = true
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function applyLUT(
  projectId: string,
  scrubberId: string,
  lutId: string,
  intensity: number = 100
) {
  const db = getPool();
  await db.query(
    `INSERT INTO lut_applications (project_id, scrubber_id, lut_id, intensity)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (project_id, scrubber_id, lut_id) DO UPDATE SET
       intensity = EXCLUDED.intensity,
       enabled = true,
       updated_at = NOW()`,
    [projectId, scrubberId, lutId, intensity]
  );
}

export async function removeLUT(
  projectId: string,
  scrubberId: string,
  lutId: string
) {
  const db = getPool();
  await db.query(
    `DELETE FROM lut_applications
     WHERE project_id = $1 AND scrubber_id = $2 AND lut_id = $3`,
    [projectId, scrubberId, lutId]
  );
}

// ============================================
// BLEND MODES
// ============================================

export async function saveBlendMode(
  projectId: string,
  scrubberId: string,
  blendMode: string,
  opacity: number
) {
  const db = getPool();
  await db.query(
    `INSERT INTO blend_modes (project_id, scrubber_id, blend_mode, opacity)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (scrubber_id) DO UPDATE SET
       blend_mode = EXCLUDED.blend_mode,
       opacity = EXCLUDED.opacity,
       updated_at = NOW()`,
    [projectId, scrubberId, blendMode, opacity]
  );
}

export async function getBlendMode(
  projectId: string,
  scrubberId: string
): Promise<{ blendMode: string; opacity: number } | null> {
  const db = getPool();
  const result = await db.query(
    `SELECT blend_mode, opacity FROM blend_modes
     WHERE project_id = $1 AND scrubber_id = $2`,
    [projectId, scrubberId]
  );

  if (result.rows.length === 0) return null;

  return {
    blendMode: result.rows[0].blend_mode,
    opacity: result.rows[0].opacity,
  };
}

// ============================================
// KEYFRAMES
// ============================================

export async function saveKeyframes(
  projectId: string,
  scrubberId: string,
  keyframes: Keyframe[]
) {
  const db = getPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "DELETE FROM keyframes WHERE project_id = $1 AND scrubber_id = $2",
      [projectId, scrubberId]
    );

    for (const keyframe of keyframes) {
      await client.query(
        `INSERT INTO keyframes 
        (project_id, scrubber_id, property, time_seconds, value, easing, bezier_points)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          projectId,
          scrubberId,
          keyframe.property,
          keyframe.time,
          JSON.stringify(keyframe.value),
          keyframe.easing,
          keyframe.bezierPoints ? JSON.stringify(keyframe.bezierPoints) : null,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getKeyframes(
  projectId: string,
  scrubberId: string
): Promise<Keyframe[]> {
  const db = getPool();
  const result = await db.query(
    `SELECT id, property, time_seconds as time, value, easing, bezier_points
     FROM keyframes
     WHERE project_id = $1 AND scrubber_id = $2
     ORDER BY time_seconds ASC`,
    [projectId, scrubberId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    property: row.property,
    time: row.time,
    value: row.value,
    easing: row.easing,
    bezierPoints: row.bezier_points,
  }));
}

// ============================================
// MASKS
// ============================================

export async function saveMasks(
  projectId: string,
  scrubberId: string,
  masks: Mask[]
) {
  const db = getPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "DELETE FROM masks WHERE project_id = $1 AND scrubber_id = $2",
      [projectId, scrubberId]
    );

    for (let i = 0; i < masks.length; i++) {
      const mask = masks[i];
      await client.query(
        `INSERT INTO masks 
        (project_id, scrubber_id, mask_type, enabled, inverted, feather, opacity, expansion, points, shape, order_index)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          projectId,
          scrubberId,
          mask.type,
          mask.enabled,
          mask.inverted,
          mask.feather,
          mask.opacity,
          mask.expansion,
          JSON.stringify(mask.points || []),
          JSON.stringify(mask.shape || {}),
          i,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getMasks(
  projectId: string,
  scrubberId: string
): Promise<Mask[]> {
  const db = getPool();
  const result = await db.query(
    `SELECT id, mask_type as type, enabled, inverted, feather, opacity, expansion, points, shape
     FROM masks
     WHERE project_id = $1 AND scrubber_id = $2
     ORDER BY order_index ASC`,
    [projectId, scrubberId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    type: row.type,
    enabled: row.enabled,
    inverted: row.inverted,
    feather: row.feather,
    opacity: row.opacity,
    expansion: row.expansion,
    points: row.points,
    shape: row.shape,
  }));
}

// ============================================
// PROJECT SAVE/LOAD
// ============================================

export async function saveProjectEffects(
  projectId: string,
  visualEffectsMap: Map<string, VisualEffect[]>,
  colorCorrectionsMap: Map<string, ColorCorrection>,
  audioEffectsMap: Map<string, AudioEffect[]>
) {
  // Save all visual effects
  for (const [scrubberId, effects] of visualEffectsMap.entries()) {
    await saveVisualEffects(projectId, scrubberId, effects);
  }

  // Save all color corrections
  for (const [scrubberId, correction] of colorCorrectionsMap.entries()) {
    await saveColorCorrection(projectId, scrubberId, correction);
  }

  // Save all audio effects
  for (const [scrubberId, effects] of audioEffectsMap.entries()) {
    await saveAudioEffects(projectId, scrubberId, effects);
  }
}

export async function loadProjectEffects(projectId: string) {
  const visualEffects = await getAllVisualEffects(projectId);
  const colorCorrections = await getAllColorCorrections(projectId);
  const audioEffects = await getAllAudioEffects(projectId);

  return {
    visualEffects,
    colorCorrections,
    audioEffects,
  };
}

// ============================================
// EFFECT PRESETS
// ============================================

export interface EffectPreset {
  id: string;
  userId: string;
  name: string;
  description?: string;
  thumbnail?: string;
  isFavorite: boolean;
  visualEffects: VisualEffect[];
  colorCorrection?: ColorCorrection;
  audioEffects: AudioEffect[];
  blendMode?: string;
  opacity?: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function savePreset(
  userId: string,
  name: string,
  description: string | undefined,
  visualEffects: VisualEffect[],
  colorCorrection: ColorCorrection | undefined,
  audioEffects: AudioEffect[],
  blendMode: string | undefined,
  opacity: number | undefined,
  thumbnail?: string
): Promise<string> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO effect_presets 
    (user_id, name, description, thumbnail, visual_effects, color_correction, audio_effects, blend_mode, opacity)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id`,
    [
      userId,
      name,
      description,
      thumbnail,
      JSON.stringify(visualEffects),
      colorCorrection ? JSON.stringify(colorCorrection) : null,
      JSON.stringify(audioEffects),
      blendMode,
      opacity,
    ]
  );

  return result.rows[0].id;
}

export async function getUserPresets(userId: string): Promise<EffectPreset[]> {
  const db = getPool();
  const result = await db.query(
    `SELECT id, user_id, name, description, thumbnail, is_favorite, 
            visual_effects, color_correction, audio_effects, blend_mode, opacity,
            created_at, updated_at
     FROM effect_presets
     WHERE user_id = $1
     ORDER BY is_favorite DESC, created_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    thumbnail: row.thumbnail,
    isFavorite: row.is_favorite,
    visualEffects: row.visual_effects || [],
    colorCorrection: row.color_correction,
    audioEffects: row.audio_effects || [],
    blendMode: row.blend_mode,
    opacity: row.opacity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getPresetById(
  presetId: string,
  userId: string
): Promise<EffectPreset | null> {
  const db = getPool();
  const result = await db.query(
    `SELECT id, user_id, name, description, thumbnail, is_favorite,
            visual_effects, color_correction, audio_effects, blend_mode, opacity,
            created_at, updated_at
     FROM effect_presets
     WHERE id = $1 AND user_id = $2`,
    [presetId, userId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    thumbnail: row.thumbnail,
    isFavorite: row.is_favorite,
    visualEffects: row.visual_effects || [],
    colorCorrection: row.color_correction,
    audioEffects: row.audio_effects || [],
    blendMode: row.blend_mode,
    opacity: row.opacity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function deletePreset(
  presetId: string,
  userId: string
): Promise<boolean> {
  const db = getPool();
  const result = await db.query(
    `DELETE FROM effect_presets WHERE id = $1 AND user_id = $2 RETURNING id`,
    [presetId, userId]
  );

  return result.rows.length > 0;
}

export async function togglePresetFavorite(
  presetId: string,
  userId: string
): Promise<boolean> {
  const db = getPool();
  const result = await db.query(
    `UPDATE effect_presets 
     SET is_favorite = NOT is_favorite, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING is_favorite`,
    [presetId, userId]
  );

  if (result.rows.length === 0) return false;
  return result.rows[0].is_favorite;
}

export async function updatePreset(
  presetId: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    thumbnail?: string;
  }
): Promise<boolean> {
  const db = getPool();
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.thumbnail !== undefined) {
    fields.push(`thumbnail = $${paramIndex++}`);
    values.push(updates.thumbnail);
  }

  if (fields.length === 0) return false;

  fields.push(`updated_at = NOW()`);
  values.push(presetId, userId);

  const result = await db.query(
    `UPDATE effect_presets 
     SET ${fields.join(", ")}
     WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING id`,
    values
  );

  return result.rows.length > 0;
}

// ============================================
// LUT MANAGEMENT
// ============================================

export async function deleteLUT(
  lutId: string,
  userId: string
): Promise<boolean> {
  const db = getPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // First, remove all applications of this LUT
    await client.query(
      `DELETE FROM lut_applications WHERE lut_id = $1`,
      [lutId]
    );

    // Then delete the LUT itself
    const result = await client.query(
      `DELETE FROM luts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [lutId, userId]
    );

    await client.query("COMMIT");
    return result.rows.length > 0;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getLUTById(
  lutId: string
): Promise<LUT | null> {
  const db = getPool();
  const result = await db.query(
    `SELECT id, name, file_url as url, file_type as format, size, created_at
     FROM luts
     WHERE id = $1`,
    [lutId]
  );

  if (result.rows.length === 0) return null;

  return {
    id: result.rows[0].id,
    name: result.rows[0].name,
    url: result.rows[0].url,
    format: result.rows[0].format,
    size: result.rows[0].size,
    uploadDate: result.rows[0].created_at,
    intensity: 100,
  };
}