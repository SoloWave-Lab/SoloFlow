-- Effects System Tables
-- Stores visual effects, color corrections, LUTs, and presets

-- Visual Effects Table
CREATE TABLE IF NOT EXISTS visual_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL,
  effect_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  parameters JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visual_effects_project_scrubber 
  ON visual_effects(project_id, scrubber_id);
CREATE INDEX IF NOT EXISTS idx_visual_effects_type 
  ON visual_effects(effect_type);

-- Color Corrections Table
CREATE TABLE IF NOT EXISTS color_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL UNIQUE,
  brightness REAL NOT NULL DEFAULT 0,
  contrast REAL NOT NULL DEFAULT 0,
  saturation REAL NOT NULL DEFAULT 0,
  hue REAL NOT NULL DEFAULT 0,
  temperature REAL NOT NULL DEFAULT 0,
  tint REAL NOT NULL DEFAULT 0,
  exposure REAL NOT NULL DEFAULT 0,
  highlights REAL NOT NULL DEFAULT 0,
  shadows REAL NOT NULL DEFAULT 0,
  whites REAL NOT NULL DEFAULT 0,
  blacks REAL NOT NULL DEFAULT 0,
  vibrance REAL NOT NULL DEFAULT 0,
  gamma REAL NOT NULL DEFAULT 1.0,
  -- Color wheels (shadows, midtones, highlights)
  shadows_hue REAL NOT NULL DEFAULT 0,
  shadows_saturation REAL NOT NULL DEFAULT 0,
  shadows_luminance REAL NOT NULL DEFAULT 0,
  midtones_hue REAL NOT NULL DEFAULT 0,
  midtones_saturation REAL NOT NULL DEFAULT 0,
  midtones_luminance REAL NOT NULL DEFAULT 0,
  highlights_hue REAL NOT NULL DEFAULT 0,
  highlights_saturation REAL NOT NULL DEFAULT 0,
  highlights_luminance REAL NOT NULL DEFAULT 0,
  -- Curves (stored as JSON arrays of points)
  rgb_curve JSONB DEFAULT '[]',
  red_curve JSONB DEFAULT '[]',
  green_curve JSONB DEFAULT '[]',
  blue_curve JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_color_corrections_project 
  ON color_corrections(project_id);

-- Audio Effects Table
CREATE TABLE IF NOT EXISTS audio_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL,
  effect_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  parameters JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_effects_project_scrubber 
  ON audio_effects(project_id, scrubber_id);

-- LUTs Table
CREATE TABLE IF NOT EXISTS luts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'cube' or '3dl'
  thumbnail_url TEXT,
  size INTEGER, -- File size in bytes
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_luts_user_id ON luts(user_id);
CREATE INDEX IF NOT EXISTS idx_luts_public ON luts(is_public) WHERE is_public = true;

-- LUT Applications (which LUTs are applied to which clips)
CREATE TABLE IF NOT EXISTS lut_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL,
  lut_id UUID NOT NULL REFERENCES luts(id) ON DELETE CASCADE,
  intensity REAL NOT NULL DEFAULT 100, -- 0-100
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, scrubber_id, lut_id)
);

CREATE INDEX IF NOT EXISTS idx_lut_applications_project_scrubber 
  ON lut_applications(project_id, scrubber_id);

-- Effect Presets Table
CREATE TABLE IF NOT EXISTS effect_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'color', 'effects', 'audio', 'combined'
  thumbnail_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  -- Preset data
  visual_effects JSONB DEFAULT '[]',
  color_correction JSONB DEFAULT '{}',
  audio_effects JSONB DEFAULT '[]',
  luts JSONB DEFAULT '[]',
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  downloads INTEGER NOT NULL DEFAULT 0,
  rating REAL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_effect_presets_user_id ON effect_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_effect_presets_category ON effect_presets(category);
CREATE INDEX IF NOT EXISTS idx_effect_presets_public ON effect_presets(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_effect_presets_tags ON effect_presets USING GIN(tags);

-- Blend Modes Table (per scrubber)
CREATE TABLE IF NOT EXISTS blend_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL UNIQUE,
  blend_mode TEXT NOT NULL DEFAULT 'normal', -- normal, multiply, screen, overlay, etc.
  opacity REAL NOT NULL DEFAULT 100, -- 0-100
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blend_modes_project 
  ON blend_modes(project_id);

-- Keyframes Table
CREATE TABLE IF NOT EXISTS keyframes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL,
  property TEXT NOT NULL, -- 'opacity', 'rotation', 'scale', etc.
  time_seconds REAL NOT NULL,
  value JSONB NOT NULL, -- Can be number, string, or object
  easing TEXT NOT NULL DEFAULT 'linear',
  bezier_points JSONB, -- For custom bezier curves
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keyframes_project_scrubber 
  ON keyframes(project_id, scrubber_id);
CREATE INDEX IF NOT EXISTS idx_keyframes_property 
  ON keyframes(property);
CREATE INDEX IF NOT EXISTS idx_keyframes_time 
  ON keyframes(time_seconds);

-- Masks Table
CREATE TABLE IF NOT EXISTS masks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scrubber_id TEXT NOT NULL,
  mask_type TEXT NOT NULL, -- 'rectangle', 'ellipse', 'polygon', 'bezier'
  enabled BOOLEAN NOT NULL DEFAULT true,
  inverted BOOLEAN NOT NULL DEFAULT false,
  feather REAL NOT NULL DEFAULT 0,
  opacity REAL NOT NULL DEFAULT 100,
  expansion REAL NOT NULL DEFAULT 0,
  points JSONB DEFAULT '[]', -- Array of {x, y} points
  shape JSONB DEFAULT '{}', -- For shape masks (width, height, etc.)
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_masks_project_scrubber 
  ON masks(project_id, scrubber_id);

-- Project Settings Table (canvas size, fps, color space, etc.)
CREATE TABLE IF NOT EXISTS project_settings (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  fps INTEGER NOT NULL DEFAULT 30,
  color_space TEXT NOT NULL DEFAULT 'rec709', -- rec709, rec2020, dci-p3
  bit_depth INTEGER NOT NULL DEFAULT 8,
  audio_sample_rate INTEGER NOT NULL DEFAULT 48000,
  audio_channels INTEGER NOT NULL DEFAULT 2,
  -- Proxy settings
  proxy_enabled BOOLEAN NOT NULL DEFAULT false,
  proxy_resolution TEXT DEFAULT '720p',
  proxy_codec TEXT DEFAULT 'h264',
  -- GPU settings
  gpu_acceleration BOOLEAN NOT NULL DEFAULT true,
  gpu_type TEXT, -- 'nvenc', 'quicksync', 'videotoolbox', 'amf'
  -- Workspace
  workspace_layout TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  -- UI preferences
  theme TEXT NOT NULL DEFAULT 'dark',
  auto_save_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_save_interval INTEGER NOT NULL DEFAULT 300, -- seconds
  -- Keyboard shortcuts
  keyboard_shortcuts JSONB DEFAULT '{}',
  -- Default settings
  default_transition_duration REAL DEFAULT 1.0,
  default_text_font TEXT DEFAULT 'Inter',
  default_text_size INTEGER DEFAULT 48,
  -- Performance
  preview_quality TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  max_undo_levels INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Timeline Markers Table
CREATE TABLE IF NOT EXISTS timeline_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  time_seconds REAL NOT NULL,
  marker_type TEXT NOT NULL DEFAULT 'marker', -- 'marker', 'chapter', 'comment', 'todo'
  label TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_markers_project 
  ON timeline_markers(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_markers_time 
  ON timeline_markers(time_seconds);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_visual_effects_updated_at ON visual_effects;
CREATE TRIGGER update_visual_effects_updated_at BEFORE UPDATE ON visual_effects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_color_corrections_updated_at ON color_corrections;
CREATE TRIGGER update_color_corrections_updated_at BEFORE UPDATE ON color_corrections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_audio_effects_updated_at ON audio_effects;
CREATE TRIGGER update_audio_effects_updated_at BEFORE UPDATE ON audio_effects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_luts_updated_at ON luts;
CREATE TRIGGER update_luts_updated_at BEFORE UPDATE ON luts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lut_applications_updated_at ON lut_applications;
CREATE TRIGGER update_lut_applications_updated_at BEFORE UPDATE ON lut_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_effect_presets_updated_at ON effect_presets;
CREATE TRIGGER update_effect_presets_updated_at BEFORE UPDATE ON effect_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blend_modes_updated_at ON blend_modes;
CREATE TRIGGER update_blend_modes_updated_at BEFORE UPDATE ON blend_modes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_keyframes_updated_at ON keyframes;
CREATE TRIGGER update_keyframes_updated_at BEFORE UPDATE ON keyframes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_masks_updated_at ON masks;
CREATE TRIGGER update_masks_updated_at BEFORE UPDATE ON masks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_settings_updated_at ON project_settings;
CREATE TRIGGER update_project_settings_updated_at BEFORE UPDATE ON project_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_timeline_markers_updated_at ON timeline_markers;
CREATE TRIGGER update_timeline_markers_updated_at BEFORE UPDATE ON timeline_markers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();