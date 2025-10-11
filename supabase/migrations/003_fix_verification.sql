-- 003_fix_verification.sql - ensure verification table has expiresAt column

-- Add expiresAt column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification' AND column_name = 'expiresAt'
  ) THEN
    ALTER TABLE verification ADD COLUMN "expiresAt" timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;