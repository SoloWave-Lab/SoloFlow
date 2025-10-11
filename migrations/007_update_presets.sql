-- Update Effect Presets Table
-- Add missing fields for blend mode, opacity, and is_favorite

-- Add blend_mode and opacity columns if they don't exist
ALTER TABLE effect_presets 
  ADD COLUMN IF NOT EXISTS blend_mode TEXT,
  ADD COLUMN IF NOT EXISTS opacity REAL,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Rename thumbnail_url to thumbnail for consistency
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'effect_presets' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE effect_presets RENAME COLUMN thumbnail_url TO thumbnail;
  END IF;
END $$;

-- Create index on is_favorite for faster queries
CREATE INDEX IF NOT EXISTS idx_effect_presets_favorite 
  ON effect_presets(user_id, is_favorite) WHERE is_favorite = true;

-- Update existing presets to have default values
UPDATE effect_presets 
SET 
  blend_mode = COALESCE(blend_mode, 'normal'),
  opacity = COALESCE(opacity, 100),
  is_favorite = COALESCE(is_favorite, false)
WHERE blend_mode IS NULL OR opacity IS NULL OR is_favorite IS NULL;