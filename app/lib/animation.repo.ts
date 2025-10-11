// Repository for Phase 3: Animation & Motion features
import { db } from "./auth.server";

// ============================================
// MOTION TRACKING
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
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackPoint {
  id: string;
  trackerId: string;
  frame: number;
  x: number;
  y: number;
  confidence: number;
  createdAt: Date;
}

export async function createMotionTracker(data: {
  projectId: string;
  scrubberId: string;
  name: string;
  startFrame: number;
  endFrame: number;
}): Promise<MotionTracker> {
  const result = await db.query(
    `INSERT INTO motion_trackers (project_id, scrubber_id, name, start_frame, end_frame)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.projectId, data.scrubberId, data.name, data.startFrame, data.endFrame]
  );
  return mapMotionTracker(result.rows[0]);
}

export async function getMotionTrackers(projectId: string, scrubberId?: string): Promise<MotionTracker[]> {
  const query = scrubberId
    ? `SELECT * FROM motion_trackers WHERE project_id = $1 AND scrubber_id = $2 ORDER BY created_at DESC`
    : `SELECT * FROM motion_trackers WHERE project_id = $1 ORDER BY created_at DESC`;
  
  const params = scrubberId ? [projectId, scrubberId] : [projectId];
  const result = await db.query(query, params);
  return result.rows.map(mapMotionTracker);
}

export async function updateMotionTracker(id: string, updates: Partial<MotionTracker>): Promise<MotionTracker> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.enabled !== undefined) {
    fields.push(`enabled = $${paramIndex++}`);
    values.push(updates.enabled);
  }
  if (updates.confidence !== undefined) {
    fields.push(`confidence = $${paramIndex++}`);
    values.push(updates.confidence);
  }

  values.push(id);
  const result = await db.query(
    `UPDATE motion_trackers SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return mapMotionTracker(result.rows[0]);
}

export async function deleteMotionTracker(id: string): Promise<void> {
  await db.query(`DELETE FROM motion_trackers WHERE id = $1`, [id]);
}

export async function addTrackPoint(data: {
  trackerId: string;
  frame: number;
  x: number;
  y: number;
  confidence?: number;
}): Promise<TrackPoint> {
  const result = await db.query(
    `INSERT INTO track_points (tracker_id, frame, x, y, confidence)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.trackerId, data.frame, data.x, data.y, data.confidence ?? 1.0]
  );
  return mapTrackPoint(result.rows[0]);
}

export async function getTrackPoints(trackerId: string): Promise<TrackPoint[]> {
  const result = await db.query(
    `SELECT * FROM track_points WHERE tracker_id = $1 ORDER BY frame ASC`,
    [trackerId]
  );
  return result.rows.map(mapTrackPoint);
}

export async function deleteTrackPoints(trackerId: string): Promise<void> {
  await db.query(`DELETE FROM track_points WHERE tracker_id = $1`, [trackerId]);
}

// ============================================
// VIDEO STABILIZATION
// ============================================

export interface VideoStabilization {
  id: string;
  projectId: string;
  scrubberId: string;
  enabled: boolean;
  smoothness: number;
  method: "point" | "subspace" | "optical_flow";
  cropToFit: boolean;
  rollingShutterCorrection: boolean;
  maxAngle: number;
  maxShift: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function getStabilization(scrubberId: string): Promise<VideoStabilization | null> {
  const result = await db.query(
    `SELECT * FROM video_stabilization WHERE scrubber_id = $1`,
    [scrubberId]
  );
  return result.rows[0] ? mapStabilization(result.rows[0]) : null;
}

export async function upsertStabilization(data: {
  projectId: string;
  scrubberId: string;
  enabled?: boolean;
  smoothness?: number;
  method?: "point" | "subspace" | "optical_flow";
  cropToFit?: boolean;
  rollingShutterCorrection?: boolean;
  maxAngle?: number;
  maxShift?: number;
}): Promise<VideoStabilization> {
  const result = await db.query(
    `INSERT INTO video_stabilization (
      project_id, scrubber_id, enabled, smoothness, method, 
      crop_to_fit, rolling_shutter_correction, max_angle, max_shift
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (scrubber_id) DO UPDATE SET
      enabled = COALESCE($3, video_stabilization.enabled),
      smoothness = COALESCE($4, video_stabilization.smoothness),
      method = COALESCE($5, video_stabilization.method),
      crop_to_fit = COALESCE($6, video_stabilization.crop_to_fit),
      rolling_shutter_correction = COALESCE($7, video_stabilization.rolling_shutter_correction),
      max_angle = COALESCE($8, video_stabilization.max_angle),
      max_shift = COALESCE($9, video_stabilization.max_shift),
      updated_at = NOW()
    RETURNING *`,
    [
      data.projectId,
      data.scrubberId,
      data.enabled,
      data.smoothness,
      data.method,
      data.cropToFit,
      data.rollingShutterCorrection,
      data.maxAngle,
      data.maxShift,
    ]
  );
  return mapStabilization(result.rows[0]);
}

export async function deleteStabilization(scrubberId: string): Promise<void> {
  await db.query(`DELETE FROM video_stabilization WHERE scrubber_id = $1`, [scrubberId]);
}

// ============================================
// 3D TRANSFORMS
// ============================================

export interface Transform3D {
  id: string;
  projectId: string;
  scrubberId: string;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  perspectiveDistance: number;
  anchorX: number;
  anchorY: number;
  anchorZ: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function get3DTransform(scrubberId: string): Promise<Transform3D | null> {
  const result = await db.query(
    `SELECT * FROM transforms_3d WHERE scrubber_id = $1`,
    [scrubberId]
  );
  return result.rows[0] ? map3DTransform(result.rows[0]) : null;
}

export async function upsert3DTransform(data: {
  projectId: string;
  scrubberId: string;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  perspectiveDistance?: number;
  anchorX?: number;
  anchorY?: number;
  anchorZ?: number;
  enabled?: boolean;
}): Promise<Transform3D> {
  const result = await db.query(
    `INSERT INTO transforms_3d (
      project_id, scrubber_id, rotation_x, rotation_y, rotation_z,
      perspective_distance, anchor_x, anchor_y, anchor_z, enabled
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (scrubber_id) DO UPDATE SET
      rotation_x = COALESCE($3, transforms_3d.rotation_x),
      rotation_y = COALESCE($4, transforms_3d.rotation_y),
      rotation_z = COALESCE($5, transforms_3d.rotation_z),
      perspective_distance = COALESCE($6, transforms_3d.perspective_distance),
      anchor_x = COALESCE($7, transforms_3d.anchor_x),
      anchor_y = COALESCE($8, transforms_3d.anchor_y),
      anchor_z = COALESCE($9, transforms_3d.anchor_z),
      enabled = COALESCE($10, transforms_3d.enabled),
      updated_at = NOW()
    RETURNING *`,
    [
      data.projectId,
      data.scrubberId,
      data.rotationX,
      data.rotationY,
      data.rotationZ,
      data.perspectiveDistance,
      data.anchorX,
      data.anchorY,
      data.anchorZ,
      data.enabled,
    ]
  );
  return map3DTransform(result.rows[0]);
}

export async function delete3DTransform(scrubberId: string): Promise<void> {
  await db.query(`DELETE FROM transforms_3d WHERE scrubber_id = $1`, [scrubberId]);
}

// ============================================
// SPEED REMAPPING
// ============================================

export interface SpeedRemap {
  id: string;
  projectId: string;
  scrubberId: string;
  enabled: boolean;
  speed: number;
  method: "frame_blend" | "optical_flow" | "nearest";
  maintainPitch: boolean;
  timeRemapCurve: Array<{ inputTime: number; outputTime: number; easing: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export async function getSpeedRemap(scrubberId: string): Promise<SpeedRemap | null> {
  const result = await db.query(
    `SELECT * FROM speed_remapping WHERE scrubber_id = $1`,
    [scrubberId]
  );
  return result.rows[0] ? mapSpeedRemap(result.rows[0]) : null;
}

export async function upsertSpeedRemap(data: {
  projectId: string;
  scrubberId: string;
  enabled?: boolean;
  speed?: number;
  method?: "frame_blend" | "optical_flow" | "nearest";
  maintainPitch?: boolean;
  timeRemapCurve?: Array<{ inputTime: number; outputTime: number; easing: string }>;
}): Promise<SpeedRemap> {
  const result = await db.query(
    `INSERT INTO speed_remapping (
      project_id, scrubber_id, enabled, speed, method, maintain_pitch, time_remap_curve
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (scrubber_id) DO UPDATE SET
      enabled = COALESCE($3, speed_remapping.enabled),
      speed = COALESCE($4, speed_remapping.speed),
      method = COALESCE($5, speed_remapping.method),
      maintain_pitch = COALESCE($6, speed_remapping.maintain_pitch),
      time_remap_curve = COALESCE($7, speed_remapping.time_remap_curve),
      updated_at = NOW()
    RETURNING *`,
    [
      data.projectId,
      data.scrubberId,
      data.enabled,
      data.speed,
      data.method,
      data.maintainPitch,
      data.timeRemapCurve ? JSON.stringify(data.timeRemapCurve) : null,
    ]
  );
  return mapSpeedRemap(result.rows[0]);
}

export async function deleteSpeedRemap(scrubberId: string): Promise<void> {
  await db.query(`DELETE FROM speed_remapping WHERE scrubber_id = $1`, [scrubberId]);
}

// ============================================
// TRANSITIONS
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
  createdAt: Date;
  updatedAt: Date;
}

export async function createTransition(data: {
  projectId: string;
  fromScrubberId: string;
  toScrubberId: string;
  transitionType: string;
  duration?: number;
  timing?: string;
  direction?: string;
  parameters?: Record<string, any>;
}): Promise<Transition> {
  const result = await db.query(
    `INSERT INTO transitions (
      project_id, from_scrubber_id, to_scrubber_id, transition_type,
      duration, timing, direction, parameters
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.projectId,
      data.fromScrubberId,
      data.toScrubberId,
      data.transitionType,
      data.duration ?? 1.0,
      data.timing ?? "linear",
      data.direction,
      JSON.stringify(data.parameters ?? {}),
    ]
  );
  return mapTransition(result.rows[0]);
}

export async function getTransitions(projectId: string): Promise<Transition[]> {
  const result = await db.query(
    `SELECT * FROM transitions WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId]
  );
  return result.rows.map(mapTransition);
}

export async function updateTransition(id: string, updates: Partial<Transition>): Promise<Transition> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.duration !== undefined) {
    fields.push(`duration = $${paramIndex++}`);
    values.push(updates.duration);
  }
  if (updates.timing !== undefined) {
    fields.push(`timing = $${paramIndex++}`);
    values.push(updates.timing);
  }
  if (updates.enabled !== undefined) {
    fields.push(`enabled = $${paramIndex++}`);
    values.push(updates.enabled);
  }
  if (updates.parameters !== undefined) {
    fields.push(`parameters = $${paramIndex++}`);
    values.push(JSON.stringify(updates.parameters));
  }

  values.push(id);
  const result = await db.query(
    `UPDATE transitions SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return mapTransition(result.rows[0]);
}

export async function deleteTransition(id: string): Promise<void> {
  await db.query(`DELETE FROM transitions WHERE id = $1`, [id]);
}

// ============================================
// MAPPER FUNCTIONS
// ============================================

function mapMotionTracker(row: any): MotionTracker {
  return {
    id: row.id,
    projectId: row.project_id,
    scrubberId: row.scrubber_id,
    name: row.name,
    startFrame: row.start_frame,
    endFrame: row.end_frame,
    confidence: row.confidence,
    enabled: row.enabled,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapTrackPoint(row: any): TrackPoint {
  return {
    id: row.id,
    trackerId: row.tracker_id,
    frame: row.frame,
    x: row.x,
    y: row.y,
    confidence: row.confidence,
    createdAt: new Date(row.created_at),
  };
}

function mapStabilization(row: any): VideoStabilization {
  return {
    id: row.id,
    projectId: row.project_id,
    scrubberId: row.scrubber_id,
    enabled: row.enabled,
    smoothness: row.smoothness,
    method: row.method,
    cropToFit: row.crop_to_fit,
    rollingShutterCorrection: row.rolling_shutter_correction,
    maxAngle: row.max_angle,
    maxShift: row.max_shift,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function map3DTransform(row: any): Transform3D {
  return {
    id: row.id,
    projectId: row.project_id,
    scrubberId: row.scrubber_id,
    rotationX: row.rotation_x,
    rotationY: row.rotation_y,
    rotationZ: row.rotation_z,
    perspectiveDistance: row.perspective_distance,
    anchorX: row.anchor_x,
    anchorY: row.anchor_y,
    anchorZ: row.anchor_z,
    enabled: row.enabled,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapSpeedRemap(row: any): SpeedRemap {
  return {
    id: row.id,
    projectId: row.project_id,
    scrubberId: row.scrubber_id,
    enabled: row.enabled,
    speed: row.speed,
    method: row.method,
    maintainPitch: row.maintain_pitch,
    timeRemapCurve: row.time_remap_curve || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapTransition(row: any): Transition {
  return {
    id: row.id,
    projectId: row.project_id,
    fromScrubberId: row.from_scrubber_id,
    toScrubberId: row.to_scrubber_id,
    transitionType: row.transition_type,
    duration: row.duration,
    timing: row.timing,
    direction: row.direction,
    parameters: row.parameters || {},
    enabled: row.enabled,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}