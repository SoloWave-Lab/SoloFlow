// Repository for Phase 4: Audio Editing features
import { db } from "./auth.server";

// ============================================
// AUDIO WAVEFORMS
// ============================================

export interface AudioWaveform {
  id: string;
  assetId: string;
  sampleRate: number;
  channels: number;
  duration: number;
  peaks: number[];
  createdAt: Date;
}

export async function createWaveform(data: {
  assetId: string;
  sampleRate: number;
  channels: number;
  duration: number;
  peaks: number[];
}): Promise<AudioWaveform> {
  const result = await db.query(
    `INSERT INTO audio_waveforms (asset_id, sample_rate, channels, duration, peaks)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.assetId, data.sampleRate, data.channels, data.duration, JSON.stringify(data.peaks)]
  );
  return mapWaveform(result.rows[0]);
}

export async function getWaveform(assetId: string): Promise<AudioWaveform | null> {
  const result = await db.query(
    `SELECT * FROM audio_waveforms WHERE asset_id = $1`,
    [assetId]
  );
  return result.rows[0] ? mapWaveform(result.rows[0]) : null;
}

export async function deleteWaveform(assetId: string): Promise<void> {
  await db.query(`DELETE FROM audio_waveforms WHERE asset_id = $1`, [assetId]);
}

// ============================================
// AUDIO DUCKING
// ============================================

export interface AudioDucking {
  id: string;
  projectId: string;
  targetScrubberId: string;
  triggerScrubberId: string;
  enabled: boolean;
  duckingAmount: number;
  threshold: number;
  attack: number;
  release: number;
  autoDetect: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function createAudioDucking(data: {
  projectId: string;
  targetScrubberId: string;
  triggerScrubberId: string;
  duckingAmount?: number;
  threshold?: number;
  attack?: number;
  release?: number;
  autoDetect?: boolean;
}): Promise<AudioDucking> {
  const result = await db.query(
    `INSERT INTO audio_ducking (
      project_id, target_scrubber_id, trigger_scrubber_id,
      ducking_amount, threshold, attack, release, auto_detect
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.projectId,
      data.targetScrubberId,
      data.triggerScrubberId,
      data.duckingAmount ?? -12,
      data.threshold ?? -40,
      data.attack ?? 10,
      data.release ?? 100,
      data.autoDetect ?? false,
    ]
  );
  return mapAudioDucking(result.rows[0]);
}

export async function getAudioDucking(projectId: string): Promise<AudioDucking[]> {
  const result = await db.query(
    `SELECT * FROM audio_ducking WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId]
  );
  return result.rows.map(mapAudioDucking);
}

export async function updateAudioDucking(id: string, updates: Partial<AudioDucking>): Promise<AudioDucking> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.enabled !== undefined) {
    fields.push(`enabled = $${paramIndex++}`);
    values.push(updates.enabled);
  }
  if (updates.duckingAmount !== undefined) {
    fields.push(`ducking_amount = $${paramIndex++}`);
    values.push(updates.duckingAmount);
  }
  if (updates.threshold !== undefined) {
    fields.push(`threshold = $${paramIndex++}`);
    values.push(updates.threshold);
  }
  if (updates.attack !== undefined) {
    fields.push(`attack = $${paramIndex++}`);
    values.push(updates.attack);
  }
  if (updates.release !== undefined) {
    fields.push(`release = $${paramIndex++}`);
    values.push(updates.release);
  }
  if (updates.autoDetect !== undefined) {
    fields.push(`auto_detect = $${paramIndex++}`);
    values.push(updates.autoDetect);
  }

  values.push(id);
  const result = await db.query(
    `UPDATE audio_ducking SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return mapAudioDucking(result.rows[0]);
}

export async function deleteAudioDucking(id: string): Promise<void> {
  await db.query(`DELETE FROM audio_ducking WHERE id = $1`, [id]);
}

// ============================================
// NOISE REDUCTION PROFILES
// ============================================

export interface NoiseProfile {
  id: string;
  userId: string;
  name: string;
  profileData: number[];
  createdAt: Date;
}

export async function createNoiseProfile(data: {
  userId: string;
  name: string;
  profileData: number[];
}): Promise<NoiseProfile> {
  const result = await db.query(
    `INSERT INTO noise_profiles (user_id, name, profile_data)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.userId, data.name, JSON.stringify(data.profileData)]
  );
  return mapNoiseProfile(result.rows[0]);
}

export async function getNoiseProfiles(userId: string): Promise<NoiseProfile[]> {
  const result = await db.query(
    `SELECT * FROM noise_profiles WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(mapNoiseProfile);
}

export async function deleteNoiseProfile(id: string): Promise<void> {
  await db.query(`DELETE FROM noise_profiles WHERE id = $1`, [id]);
}

// ============================================
// AUDIO MIXING
// ============================================

export interface AudioMixing {
  id: string;
  projectId: string;
  trackIndex: number;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getAudioMixing(projectId: string, trackIndex: number): Promise<AudioMixing | null> {
  const result = await db.query(
    `SELECT * FROM audio_mixing WHERE project_id = $1 AND track_index = $2`,
    [projectId, trackIndex]
  );
  return result.rows[0] ? mapAudioMixing(result.rows[0]) : null;
}

export async function upsertAudioMixing(data: {
  projectId: string;
  trackIndex: number;
  volume?: number;
  pan?: number;
  muted?: boolean;
  solo?: boolean;
}): Promise<AudioMixing> {
  const result = await db.query(
    `INSERT INTO audio_mixing (project_id, track_index, volume, pan, muted, solo)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (project_id, track_index) DO UPDATE SET
       volume = COALESCE($3, audio_mixing.volume),
       pan = COALESCE($4, audio_mixing.pan),
       muted = COALESCE($5, audio_mixing.muted),
       solo = COALESCE($6, audio_mixing.solo),
       updated_at = NOW()
     RETURNING *`,
    [data.projectId, data.trackIndex, data.volume, data.pan, data.muted, data.solo]
  );
  return mapAudioMixing(result.rows[0]);
}

export async function getAllAudioMixing(projectId: string): Promise<AudioMixing[]> {
  const result = await db.query(
    `SELECT * FROM audio_mixing WHERE project_id = $1 ORDER BY track_index ASC`,
    [projectId]
  );
  return result.rows.map(mapAudioMixing);
}

export async function deleteAudioMixing(projectId: string, trackIndex: number): Promise<void> {
  await db.query(`DELETE FROM audio_mixing WHERE project_id = $1 AND track_index = $2`, [projectId, trackIndex]);
}

// ============================================
// MASTER AUDIO
// ============================================

export interface MasterAudio {
  projectId: string;
  masterVolume: number;
  masterPan: number;
  limiterEnabled: boolean;
  limiterThreshold: number;
  normalizeOnExport: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getMasterAudio(projectId: string): Promise<MasterAudio | null> {
  const result = await db.query(
    `SELECT * FROM master_audio WHERE project_id = $1`,
    [projectId]
  );
  return result.rows[0] ? mapMasterAudio(result.rows[0]) : null;
}

export async function upsertMasterAudio(data: {
  projectId: string;
  masterVolume?: number;
  masterPan?: number;
  limiterEnabled?: boolean;
  limiterThreshold?: number;
  normalizeOnExport?: boolean;
}): Promise<MasterAudio> {
  const result = await db.query(
    `INSERT INTO master_audio (
      project_id, master_volume, master_pan, limiter_enabled, 
      limiter_threshold, normalize_on_export
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (project_id) DO UPDATE SET
      master_volume = COALESCE($2, master_audio.master_volume),
      master_pan = COALESCE($3, master_audio.master_pan),
      limiter_enabled = COALESCE($4, master_audio.limiter_enabled),
      limiter_threshold = COALESCE($5, master_audio.limiter_threshold),
      normalize_on_export = COALESCE($6, master_audio.normalize_on_export),
      updated_at = NOW()
    RETURNING *`,
    [
      data.projectId,
      data.masterVolume,
      data.masterPan,
      data.limiterEnabled,
      data.limiterThreshold,
      data.normalizeOnExport,
    ]
  );
  return mapMasterAudio(result.rows[0]);
}

export async function deleteMasterAudio(projectId: string): Promise<void> {
  await db.query(`DELETE FROM master_audio WHERE project_id = $1`, [projectId]);
}

// ============================================
// MAPPER FUNCTIONS
// ============================================

function mapWaveform(row: any): AudioWaveform {
  return {
    id: row.id,
    assetId: row.asset_id,
    sampleRate: row.sample_rate,
    channels: row.channels,
    duration: row.duration,
    peaks: row.peaks || [],
    createdAt: new Date(row.created_at),
  };
}

function mapAudioDucking(row: any): AudioDucking {
  return {
    id: row.id,
    projectId: row.project_id,
    targetScrubberId: row.target_scrubber_id,
    triggerScrubberId: row.trigger_scrubber_id,
    enabled: row.enabled,
    duckingAmount: row.ducking_amount,
    threshold: row.threshold,
    attack: row.attack,
    release: row.release,
    autoDetect: row.auto_detect,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapNoiseProfile(row: any): NoiseProfile {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    profileData: row.profile_data || [],
    createdAt: new Date(row.created_at),
  };
}

function mapAudioMixing(row: any): AudioMixing {
  return {
    id: row.id,
    projectId: row.project_id,
    trackIndex: row.track_index,
    volume: row.volume,
    pan: row.pan,
    muted: row.muted,
    solo: row.solo,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapMasterAudio(row: any): MasterAudio {
  return {
    projectId: row.project_id,
    masterVolume: row.master_volume,
    masterPan: row.master_pan,
    limiterEnabled: row.limiter_enabled,
    limiterThreshold: row.limiter_threshold,
    normalizeOnExport: row.normalize_on_export,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}