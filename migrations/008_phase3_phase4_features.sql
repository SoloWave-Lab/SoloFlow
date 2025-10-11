-- Phase 3 & 4 Features: Animation, Motion, and Audio
-- This migration adds tables for advanced animation and audio features

-- ============================================
-- PHASE 3: ANIMATION & MOTION
-- ============================================

-- Motion Tracking Table
CREATE TABLE IF NOT EXISTS motion_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_frame INTEGER NOT NULL,
  end_frame INTEGER NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_motion_trackers_project_scrubber 
  ON motion_trackers(project_id, scrubber_id);

-- Track Points Table (stores individual tracking points per frame)
CREATE TABLE IF NOT EXISTS track_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES motion_trackers(id) ON DELETE CASCADE,
  frame INTEGER NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_track_points_tracker_frame 
  ON track_points(tracker_id, frame);

-- Video Stabilization Table
CREATE TABLE IF NOT EXISTS video_stabilization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  smoothness REAL NOT NULL DEFAULT 50, -- 0-100
  method TEXT NOT NULL DEFAULT 'point', -- 'point', 'subspace', 'optical_flow'
  crop_to_fit BOOLEAN NOT NULL DEFAULT true,
  rolling_shutter_correction BOOLEAN NOT NULL DEFAULT false,
  max_angle REAL NOT NULL DEFAULT 10,
  max_shift REAL NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_stabilization_project 
  ON video_stabilization(project_id);

-- 3D Transforms Table
CREATE TABLE IF NOT EXISTS transforms_3d (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL UNIQUE,
  rotation_x REAL NOT NULL DEFAULT 0,
  rotation_y REAL NOT NULL DEFAULT 0,
  rotation_z REAL NOT NULL DEFAULT 0,
  perspective_distance REAL NOT NULL DEFAULT 1000,
  anchor_x REAL NOT NULL DEFAULT 0.5, -- 0-1
  anchor_y REAL NOT NULL DEFAULT 0.5,
  anchor_z REAL NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transforms_3d_project 
  ON transforms_3d(project_id);

-- Speed Remapping Table
CREATE TABLE IF NOT EXISTS speed_remapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  speed REAL NOT NULL DEFAULT 1.0, -- 0.1 to 10
  method TEXT NOT NULL DEFAULT 'frame_blend', -- 'frame_blend', 'optical_flow', 'nearest'
  maintain_pitch BOOLEAN NOT NULL DEFAULT true,
  time_remap_curve JSONB DEFAULT '[]', -- Array of {inputTime, outputTime, easing}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speed_remapping_project 
  ON speed_remapping(project_id);

-- Transitions Table (enhanced from basic transitions)
CREATE TABLE IF NOT EXISTS transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_scrubber_id TEXT NOT NULL,
  to_scrubber_id TEXT NOT NULL,
  transition_type TEXT NOT NULL, -- 'fade', 'wipe', 'slide', 'flip', 'iris', 'clock_wipe', etc.
  duration REAL NOT NULL DEFAULT 1.0, -- in seconds
  timing TEXT NOT NULL DEFAULT 'linear', -- 'linear', 'spring', 'ease-in', 'ease-out'
  direction TEXT, -- For directional transitions: 'left', 'right', 'up', 'down'
  parameters JSONB DEFAULT '{}', -- Custom parameters per transition type
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transitions_project 
  ON transitions(project_id);
CREATE INDEX IF NOT EXISTS idx_transitions_scrubbers 
  ON transitions(from_scrubber_id, to_scrubber_id);

-- ============================================
-- PHASE 4: AUDIO EDITING
-- ============================================

-- Audio Waveform Data (for visualization)
CREATE TABLE IF NOT EXISTS audio_waveforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  sample_rate INTEGER NOT NULL,
  channels INTEGER NOT NULL,
  duration REAL NOT NULL,
  peaks JSONB NOT NULL, -- Array of peak values for visualization
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_waveforms_asset 
  ON audio_waveforms(asset_id);

-- Audio Ducking Table
CREATE TABLE IF NOT EXISTS audio_ducking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  target_scrubber_id TEXT NOT NULL, -- Audio track to duck
  trigger_scrubber_id TEXT NOT NULL, -- Audio track that triggers ducking (e.g., voice)
  enabled BOOLEAN NOT NULL DEFAULT true,
  ducking_amount REAL NOT NULL DEFAULT -12, -- in dB
  threshold REAL NOT NULL DEFAULT -40, -- in dB
  attack REAL NOT NULL DEFAULT 10, -- in ms
  release REAL NOT NULL DEFAULT 100, -- in ms
  auto_detect BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_ducking_project 
  ON audio_ducking(project_id);
CREATE INDEX IF NOT EXISTS idx_audio_ducking_scrubbers 
  ON audio_ducking(target_scrubber_id, trigger_scrubber_id);

-- Noise Reduction Profiles
CREATE TABLE IF NOT EXISTS noise_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  profile_data JSONB NOT NULL, -- Frequency spectrum data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_noise_profiles_user 
  ON noise_profiles(user_id);

-- Audio Mixing Settings (per track)
CREATE TABLE IF NOT EXISTS audio_mixing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  track_index INTEGER NOT NULL,
  volume REAL NOT NULL DEFAULT 100, -- 0-200 percentage
  pan REAL NOT NULL DEFAULT 0, -- -100 (left) to 100 (right)
  muted BOOLEAN NOT NULL DEFAULT false,
  solo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, track_index)
);

CREATE INDEX IF NOT EXISTS idx_audio_mixing_project 
  ON audio_mixing(project_id);

-- Master Audio Settings (per project)
CREATE TABLE IF NOT EXISTS master_audio (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  master_volume REAL NOT NULL DEFAULT 100, -- 0-200 percentage
  master_pan REAL NOT NULL DEFAULT 0,
  limiter_enabled BOOLEAN NOT NULL DEFAULT true,
  limiter_threshold REAL NOT NULL DEFAULT -1, -- in dB
  normalize_on_export BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RENDER QUEUE & EXPORT
-- ============================================

-- Render Queue Table
CREATE TABLE IF NOT EXISTS render_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  preset_id UUID, -- Optional reference to export preset
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  progress REAL NOT NULL DEFAULT 0, -- 0-100
  output_path TEXT,
  error_message TEXT,
  -- Export settings (snapshot at time of render)
  export_settings JSONB NOT NULL,
  -- Render statistics
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  render_time_seconds INTEGER,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_render_queue_project 
  ON render_queue(project_id);
CREATE INDEX IF NOT EXISTS idx_render_queue_user 
  ON render_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_render_queue_status 
  ON render_queue(status);

-- Export Presets Table (platform-specific presets)
CREATE TABLE IF NOT EXISTS export_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'youtube', 'instagram', 'tiktok', 'twitter', 'facebook', 'custom'
  is_default BOOLEAN NOT NULL DEFAULT false,
  -- Video settings
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  fps INTEGER NOT NULL,
  bitrate INTEGER NOT NULL, -- in kbps
  codec TEXT NOT NULL, -- 'h264', 'h265', 'vp9', 'av1', 'prores'
  format TEXT NOT NULL, -- 'mp4', 'mov', 'webm', 'avi', 'mkv'
  -- Audio settings
  audio_codec TEXT NOT NULL, -- 'aac', 'mp3', 'opus', 'flac'
  audio_bitrate INTEGER NOT NULL, -- in kbps
  audio_sample_rate INTEGER NOT NULL, -- in Hz
  -- Advanced settings
  hardware_acceleration BOOLEAN NOT NULL DEFAULT true,
  two_pass_encoding BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_presets_user 
  ON export_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_export_presets_platform 
  ON export_presets(platform);

-- ============================================
-- METADATA & ORGANIZATION
-- ============================================

-- Asset Metadata (tags, ratings, custom fields)
CREATE TABLE IF NOT EXISTS asset_metadata (
  asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  tags TEXT[] DEFAULT '{}',
  rating INTEGER CHECK (rating >= 0 AND rating <= 5),
  color_label TEXT, -- 'red', 'orange', 'yellow', 'green', 'blue', 'purple'
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_metadata_tags 
  ON asset_metadata USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_rating 
  ON asset_metadata(rating);

-- Collections (for organizing assets)
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_user 
  ON collections(user_id);

-- Collection Items (many-to-many relationship)
CREATE TABLE IF NOT EXISTS collection_items (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_items_asset 
  ON collection_items(asset_id);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

-- Motion Trackers
DROP TRIGGER IF EXISTS update_motion_trackers_updated_at ON motion_trackers;
CREATE TRIGGER update_motion_trackers_updated_at BEFORE UPDATE ON motion_trackers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Video Stabilization
DROP TRIGGER IF EXISTS update_video_stabilization_updated_at ON video_stabilization;
CREATE TRIGGER update_video_stabilization_updated_at BEFORE UPDATE ON video_stabilization
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3D Transforms
DROP TRIGGER IF EXISTS update_transforms_3d_updated_at ON transforms_3d;
CREATE TRIGGER update_transforms_3d_updated_at BEFORE UPDATE ON transforms_3d
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Speed Remapping
DROP TRIGGER IF EXISTS update_speed_remapping_updated_at ON speed_remapping;
CREATE TRIGGER update_speed_remapping_updated_at BEFORE UPDATE ON speed_remapping
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Transitions
DROP TRIGGER IF EXISTS update_transitions_updated_at ON transitions;
CREATE TRIGGER update_transitions_updated_at BEFORE UPDATE ON transitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audio Ducking
DROP TRIGGER IF EXISTS update_audio_ducking_updated_at ON audio_ducking;
CREATE TRIGGER update_audio_ducking_updated_at BEFORE UPDATE ON audio_ducking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audio Mixing
DROP TRIGGER IF EXISTS update_audio_mixing_updated_at ON audio_mixing;
CREATE TRIGGER update_audio_mixing_updated_at BEFORE UPDATE ON audio_mixing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Master Audio
DROP TRIGGER IF EXISTS update_master_audio_updated_at ON master_audio;
CREATE TRIGGER update_master_audio_updated_at BEFORE UPDATE ON master_audio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Render Queue
DROP TRIGGER IF EXISTS update_render_queue_updated_at ON render_queue;
CREATE TRIGGER update_render_queue_updated_at BEFORE UPDATE ON render_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Export Presets
DROP TRIGGER IF EXISTS update_export_presets_updated_at ON export_presets;
CREATE TRIGGER update_export_presets_updated_at BEFORE UPDATE ON export_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Asset Metadata
DROP TRIGGER IF EXISTS update_asset_metadata_updated_at ON asset_metadata;
CREATE TRIGGER update_asset_metadata_updated_at BEFORE UPDATE ON asset_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Collections
DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for complete scrubber effects (combines all effect types)
CREATE OR REPLACE VIEW scrubber_effects_complete AS
SELECT 
  p.id as project_id,
  p.user_id,
  ve.scrubber_id,
  -- Visual Effects
  COALESCE(json_agg(DISTINCT jsonb_build_object(
    'id', ve.id,
    'type', ve.effect_type,
    'enabled', ve.enabled,
    'parameters', ve.parameters,
    'order_index', ve.order_index
  )) FILTER (WHERE ve.id IS NOT NULL), '[]') as visual_effects,
  -- Audio Effects
  COALESCE(json_agg(DISTINCT jsonb_build_object(
    'id', ae.id,
    'type', ae.effect_type,
    'enabled', ae.enabled,
    'parameters', ae.parameters,
    'order_index', ae.order_index
  )) FILTER (WHERE ae.id IS NOT NULL), '[]') as audio_effects,
  -- Color Correction
  row_to_json(cc.*) as color_correction,
  -- Blend Mode
  row_to_json(bm.*) as blend_mode,
  -- 3D Transform
  row_to_json(t3d.*) as transform_3d,
  -- Speed Remap
  row_to_json(sr.*) as speed_remap,
  -- Stabilization
  row_to_json(vs.*) as stabilization
FROM projects p
LEFT JOIN visual_effects ve ON ve.project_id = p.id
LEFT JOIN audio_effects ae ON ae.project_id = p.id AND ae.scrubber_id = ve.scrubber_id
LEFT JOIN color_corrections cc ON cc.project_id = p.id AND cc.scrubber_id = ve.scrubber_id
LEFT JOIN blend_modes bm ON bm.project_id = p.id AND bm.scrubber_id = ve.scrubber_id
LEFT JOIN transforms_3d t3d ON t3d.project_id = p.id AND t3d.scrubber_id = ve.scrubber_id
LEFT JOIN speed_remapping sr ON sr.project_id = p.id AND sr.scrubber_id = ve.scrubber_id
LEFT JOIN video_stabilization vs ON vs.project_id = p.id AND vs.scrubber_id = ve.scrubber_id
GROUP BY p.id, p.user_id, ve.scrubber_id, cc.*, bm.*, t3d.*, sr.*, vs.*;

-- View for render queue with project details
CREATE OR REPLACE VIEW render_queue_detailed AS
SELECT 
  rq.*,
  p.name as project_name,
  p.updated_at as project_updated_at,
  ep.name as preset_name,
  ep.platform as preset_platform
FROM render_queue rq
JOIN projects p ON p.id = rq.project_id
LEFT JOIN export_presets ep ON ep.id = rq.preset_id;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default export presets
INSERT INTO export_presets (user_id, name, platform, is_default, width, height, fps, bitrate, codec, format, audio_codec, audio_bitrate, audio_sample_rate)
VALUES 
  ('system', 'YouTube 1080p', 'youtube', true, 1920, 1080, 30, 8000, 'h264', 'mp4', 'aac', 192, 48000),
  ('system', 'YouTube 4K', 'youtube', false, 3840, 2160, 30, 35000, 'h264', 'mp4', 'aac', 192, 48000),
  ('system', 'Instagram Feed', 'instagram', true, 1080, 1080, 30, 5000, 'h264', 'mp4', 'aac', 128, 48000),
  ('system', 'Instagram Story', 'instagram', false, 1080, 1920, 30, 5000, 'h264', 'mp4', 'aac', 128, 48000),
  ('system', 'TikTok', 'tiktok', true, 1080, 1920, 30, 5000, 'h264', 'mp4', 'aac', 128, 48000),
  ('system', 'Twitter', 'twitter', true, 1280, 720, 30, 5000, 'h264', 'mp4', 'aac', 128, 48000),
  ('system', 'Facebook', 'facebook', true, 1280, 720, 30, 4000, 'h264', 'mp4', 'aac', 128, 48000)
ON CONFLICT DO NOTHING;