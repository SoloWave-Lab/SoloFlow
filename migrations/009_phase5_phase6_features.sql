-- Phase 5 & 6 Features: Masking, Compositing, and AI Features
-- This migration adds tables for advanced masking, compositing, and AI-powered features

-- ============================================
-- PHASE 5: MASKING & COMPOSITING
-- ============================================

-- Masks Table
CREATE TABLE IF NOT EXISTS masks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL,
  mask_type TEXT NOT NULL CHECK (mask_type IN ('rectangle', 'ellipse', 'polygon', 'bezier', 'text', 'image')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  inverted BOOLEAN NOT NULL DEFAULT false,
  feather REAL NOT NULL DEFAULT 0,
  opacity REAL NOT NULL DEFAULT 100,
  expansion REAL NOT NULL DEFAULT 0,
  -- For shape-based masks (rectangle, ellipse)
  x REAL,
  y REAL,
  width REAL,
  height REAL,
  rotation REAL DEFAULT 0,
  -- For path-based masks (polygon, bezier)
  points JSONB DEFAULT '[]',
  -- For text masks
  text_content TEXT,
  font_family TEXT,
  font_size REAL,
  -- For image masks
  mask_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_masks_project_scrubber
  ON masks(project_id, scrubber_id);

-- Adjustment Layers Table
CREATE TABLE IF NOT EXISTS adjustment_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time REAL NOT NULL DEFAULT 0,
  end_time REAL NOT NULL,
  track_index INTEGER NOT NULL,
  opacity REAL NOT NULL DEFAULT 100,
  blend_mode TEXT NOT NULL DEFAULT 'normal' CHECK (blend_mode IN ('normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color_dodge', 'color_burn', 'hard_light', 'soft_light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity', 'add', 'subtract')),
  -- Color correction settings
  brightness REAL DEFAULT 0,
  contrast REAL DEFAULT 0,
  saturation REAL DEFAULT 0,
  hue REAL DEFAULT 0,
  temperature REAL DEFAULT 0,
  tint REAL DEFAULT 0,
  exposure REAL DEFAULT 0,
  highlights REAL DEFAULT 0,
  shadows REAL DEFAULT 0,
  whites REAL DEFAULT 0,
  blacks REAL DEFAULT 0,
  vibrance REAL DEFAULT 0,
  gamma REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adjustment_layers_project
  ON adjustment_layers(project_id);

-- Layer Effects Table (effects applied to adjustment layers)
CREATE TABLE IF NOT EXISTS layer_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID NOT NULL REFERENCES adjustment_layers(id) ON DELETE CASCADE,
  effect_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  parameters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_layer_effects_layer
  ON layer_effects(layer_id);

-- Compositing Settings Table
CREATE TABLE IF NOT EXISTS compositing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  layer_ordering JSONB DEFAULT '[]', -- Array of layer IDs in order
  track_matte_enabled BOOLEAN NOT NULL DEFAULT false,
  track_matte_source TEXT, -- scrubber_id of matte source
  track_matte_target TEXT, -- scrubber_id of matte target
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compositing_settings_project
  ON compositing_settings(project_id);

-- ============================================
-- PHASE 6: AI & AUTOMATION
-- ============================================

-- Auto Captions Table
CREATE TABLE IF NOT EXISTS auto_captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  model TEXT NOT NULL DEFAULT 'whisper' CHECK (model IN ('whisper', 'google', 'azure', 'aws')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  captions_data JSONB DEFAULT '[]', -- Array of caption objects with start_time, end_time, text
  style_settings JSONB DEFAULT '{}', -- Font, color, position settings
  export_formats TEXT[] DEFAULT '{}', -- ['srt', 'vtt', etc.]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auto_captions_project
  ON auto_captions(project_id);
CREATE INDEX IF NOT EXISTS idx_auto_captions_asset
  ON auto_captions(asset_id);
CREATE INDEX IF NOT EXISTS idx_auto_captions_status
  ON auto_captions(status);

-- Caption Edits Table (for manual editing of auto-generated captions)
CREATE TABLE IF NOT EXISTS caption_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caption_id UUID NOT NULL REFERENCES auto_captions(id) ON DELETE CASCADE,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  text TEXT NOT NULL,
  confidence REAL,
  edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caption_edits_caption
  ON caption_edits(caption_id);

-- Auto Color Correction Table
CREATE TABLE IF NOT EXISTS auto_color_correction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  style TEXT NOT NULL DEFAULT 'natural' CHECK (style IN ('natural', 'cinematic', 'vibrant', 'vintage', 'custom')),
  intensity REAL NOT NULL DEFAULT 50,
  before_preview TEXT, -- Base64 encoded preview image
  after_preview TEXT, -- Base64 encoded preview image
  correction_data JSONB DEFAULT '{}', -- Color correction parameters applied
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_color_correction_project
  ON auto_color_correction(project_id);

-- Scene Detection Table
CREATE TABLE IF NOT EXISTS scene_detection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  sensitivity REAL NOT NULL DEFAULT 50,
  min_scene_duration REAL NOT NULL DEFAULT 2.0,
  scenes_data JSONB DEFAULT '[]', -- Array of scene objects with start_time, end_time, confidence
  auto_split_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scene_detection_project
  ON scene_detection(project_id);
CREATE INDEX IF NOT EXISTS idx_scene_detection_asset
  ON scene_detection(asset_id);
CREATE INDEX IF NOT EXISTS idx_scene_detection_status
  ON scene_detection(status);

-- Background Removal Table
CREATE TABLE IF NOT EXISTS background_removal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  model TEXT NOT NULL DEFAULT 'u2net' CHECK (model IN ('u2net', 'modnet', 'backgroundmattingv2')),
  quality TEXT NOT NULL DEFAULT 'medium' CHECK (quality IN ('low', 'medium', 'high')),
  edge_refinement BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  mask_data TEXT, -- Base64 encoded mask data
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_removal_project
  ON background_removal(project_id);
CREATE INDEX IF NOT EXISTS idx_background_removal_status
  ON background_removal(status);

-- Smart Crop/Reframe Table
CREATE TABLE IF NOT EXISTS smart_crop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  aspect_ratio TEXT NOT NULL DEFAULT '16:9', -- e.g., '16:9', '1:1', '9:16'
  content_detection BOOLEAN NOT NULL DEFAULT true,
  face_tracking BOOLEAN NOT NULL DEFAULT true,
  object_tracking BOOLEAN NOT NULL DEFAULT false,
  sensitivity REAL NOT NULL DEFAULT 50,
  crop_data JSONB DEFAULT '{}', -- Crop rectangle coordinates and keyframes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_crop_project
  ON smart_crop(project_id);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

-- Masks
DROP TRIGGER IF EXISTS update_masks_updated_at ON masks;
CREATE TRIGGER update_masks_updated_at BEFORE UPDATE ON masks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adjustment Layers
DROP TRIGGER IF EXISTS update_adjustment_layers_updated_at ON adjustment_layers;
CREATE TRIGGER update_adjustment_layers_updated_at BEFORE UPDATE ON adjustment_layers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Layer Effects
DROP TRIGGER IF EXISTS update_layer_effects_updated_at ON layer_effects;
CREATE TRIGGER update_layer_effects_updated_at BEFORE UPDATE ON layer_effects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Compositing Settings
DROP TRIGGER IF EXISTS update_compositing_settings_updated_at ON compositing_settings;
CREATE TRIGGER update_compositing_settings_updated_at BEFORE UPDATE ON compositing_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto Captions
DROP TRIGGER IF EXISTS update_auto_captions_updated_at ON auto_captions;
CREATE TRIGGER update_auto_captions_updated_at BEFORE UPDATE ON auto_captions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Caption Edits
DROP TRIGGER IF EXISTS update_caption_edits_updated_at ON caption_edits;
CREATE TRIGGER update_caption_edits_updated_at BEFORE UPDATE ON caption_edits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto Color Correction
DROP TRIGGER IF EXISTS update_auto_color_correction_updated_at ON auto_color_correction;
CREATE TRIGGER update_auto_color_correction_updated_at BEFORE UPDATE ON auto_color_correction
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Scene Detection
DROP TRIGGER IF EXISTS update_scene_detection_updated_at ON scene_detection;
CREATE TRIGGER update_scene_detection_updated_at BEFORE UPDATE ON scene_detection
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Background Removal
DROP TRIGGER IF EXISTS update_background_removal_updated_at ON background_removal;
CREATE TRIGGER update_background_removal_updated_at BEFORE UPDATE ON background_removal
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Smart Crop
DROP TRIGGER IF EXISTS update_smart_crop_updated_at ON smart_crop;
CREATE TRIGGER update_smart_crop_updated_at BEFORE UPDATE ON smart_crop
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();