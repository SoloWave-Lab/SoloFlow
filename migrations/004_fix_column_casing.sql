-- 004_fix_column_casing.sql - fix column name casing issues

-- Fix verification table - remove lowercase duplicates
ALTER TABLE verification DROP COLUMN IF EXISTS expiresat;
ALTER TABLE verification DROP COLUMN IF EXISTS createdat;
ALTER TABLE verification DROP COLUMN IF EXISTS updatedat;

-- Ensure camelCase columns exist with proper constraints
DO $$ 
BEGIN
  -- Add expiresAt if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification' AND column_name = 'expiresAt'
  ) THEN
    ALTER TABLE verification ADD COLUMN "expiresAt" timestamptz NOT NULL DEFAULT now();
  END IF;
  
  -- Add createdAt if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE verification ADD COLUMN "createdAt" timestamptz NOT NULL DEFAULT now();
  END IF;
  
  -- Add updatedAt if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE verification ADD COLUMN "updatedAt" timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Check and fix other tables too
-- User table
ALTER TABLE "user" DROP COLUMN IF EXISTS createdat;
ALTER TABLE "user" DROP COLUMN IF EXISTS updatedat;
ALTER TABLE "user" DROP COLUMN IF EXISTS emailverified;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE "user" ADD COLUMN "createdAt" timestamptz NOT NULL DEFAULT now();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "user" ADD COLUMN "updatedAt" timestamptz NOT NULL DEFAULT now();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'emailVerified'
  ) THEN
    ALTER TABLE "user" ADD COLUMN "emailVerified" boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Session table
ALTER TABLE session DROP COLUMN IF EXISTS expiresat;
ALTER TABLE session DROP COLUMN IF EXISTS createdat;
ALTER TABLE session DROP COLUMN IF EXISTS updatedat;
ALTER TABLE session DROP COLUMN IF EXISTS ipaddress;
ALTER TABLE session DROP COLUMN IF EXISTS useragent;
ALTER TABLE session DROP COLUMN IF EXISTS userid;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session' AND column_name = 'expiresAt'
  ) THEN
    ALTER TABLE session ADD COLUMN "expiresAt" timestamptz NOT NULL DEFAULT now() + interval '30 days';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE session ADD COLUMN "createdAt" timestamptz NOT NULL DEFAULT now();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE session ADD COLUMN "updatedAt" timestamptz NOT NULL DEFAULT now();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session' AND column_name = 'ipAddress'
  ) THEN
    ALTER TABLE session ADD COLUMN "ipAddress" text NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session' AND column_name = 'userAgent'
  ) THEN
    ALTER TABLE session ADD COLUMN "userAgent" text NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session' AND column_name = 'userId'
  ) THEN
    ALTER TABLE session ADD COLUMN "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Account table
ALTER TABLE account DROP COLUMN IF EXISTS accountid;
ALTER TABLE account DROP COLUMN IF EXISTS providerid;
ALTER TABLE account DROP COLUMN IF EXISTS userid;
ALTER TABLE account DROP COLUMN IF EXISTS accesstoken;
ALTER TABLE account DROP COLUMN IF EXISTS refreshtoken;
ALTER TABLE account DROP COLUMN IF EXISTS idtoken;
ALTER TABLE account DROP COLUMN IF EXISTS accesstokenexpiresat;
ALTER TABLE account DROP COLUMN IF EXISTS refreshtokenexpiresat;
ALTER TABLE account DROP COLUMN IF EXISTS createdat;
ALTER TABLE account DROP COLUMN IF EXISTS updatedat;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account' AND column_name = 'accountId'
  ) THEN
    ALTER TABLE account ADD COLUMN "accountId" text NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account' AND column_name = 'providerId'
  ) THEN
    ALTER TABLE account ADD COLUMN "providerId" text NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account' AND column_name = 'userId'
  ) THEN
    ALTER TABLE account ADD COLUMN "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account' AND column_name = 'accessToken'
  ) THEN
    ALTER TABLE account ADD COLUMN "accessToken" text NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account' AND column_name = 'refreshToken'
  ) THEN
    ALTER TABLE account ADD COLUMN "refreshToken" text NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account' AND column_name = 'idToken'
  ) THEN
    ALTER TABLE account ADD COLUMN "idToken" text NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account' AND column_name = 'accessTokenExpiresAt'
  ) THEN
    ALTER TABLE account ADD COLUMN "accessTokenExpiresAt" timestamptz NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account' AND column_name = 'refreshTokenExpiresAt'
  ) THEN
    ALTER TABLE account ADD COLUMN "refreshTokenExpiresAt" timestamptz NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE account ADD COLUMN "createdAt" timestamptz NOT NULL DEFAULT now();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE account ADD COLUMN "updatedAt" timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;