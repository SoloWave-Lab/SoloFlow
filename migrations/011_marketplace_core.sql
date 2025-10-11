-- Migration 011: Marketplace Core Schema
-- Defines foundational tables for marketplace listings, licensing, orders, purchases, and downloads.

-- ============================================
-- EXTENSIONS & ENUMS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketplace_listing_status') THEN
    CREATE TYPE marketplace_listing_status AS ENUM (
      'draft',
      'pending_review',
      'published',
      'rejected',
      'suspended'
    );
  END IF;
END $$;

-- ============================================
-- TABLE: marketplace_categories
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NULL REFERENCES marketplace_categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_categories_parent
  ON marketplace_categories(parent_id);

-- ============================================
-- TABLE: marketplace_sellers
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  biography TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, suspended
  payout_account JSONB,
  avg_rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  total_sales_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_sellers_status
  ON marketplace_sellers(status);

-- ============================================
-- TABLE: marketplace_listings
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES marketplace_sellers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES marketplace_categories(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  status marketplace_listing_status NOT NULL DEFAULT 'draft',
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  main_preview_asset_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status
  ON marketplace_listings(status);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category
  ON marketplace_listings(category_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller
  ON marketplace_listings(seller_id);

-- ============================================
-- TABLE: marketplace_license_plans
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_license_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  max_downloads INTEGER,
  license_terms TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_license_plans_listing
  ON marketplace_license_plans(listing_id);

-- ============================================
-- TABLE: marketplace_assets
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('preview', 'deliverable')),
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  checksum TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_assets_listing
  ON marketplace_assets(listing_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_assets_kind
  ON marketplace_assets(kind);

-- ============================================
-- TABLE: marketplace_orders
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE RESTRICT,
  license_plan_id UUID NOT NULL REFERENCES marketplace_license_plans(id) ON DELETE RESTRICT,
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  fees_cents INTEGER NOT NULL DEFAULT 0 CHECK (fees_cents >= 0),
  taxes_cents INTEGER NOT NULL DEFAULT 0 CHECK (taxes_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, payment_required, paid, failed, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_buyer
  ON marketplace_orders(buyer_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_listing
  ON marketplace_orders(listing_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status
  ON marketplace_orders(status);

-- ============================================
-- TABLE: marketplace_transactions
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  payment_method TEXT,
  payment_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_transactions_payment
  ON marketplace_transactions(razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_order
  ON marketplace_transactions(order_id);

-- ============================================
-- TABLE: marketplace_purchases
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  license_plan_id UUID NOT NULL REFERENCES marketplace_license_plans(id) ON DELETE CASCADE,
  license_key TEXT NOT NULL UNIQUE,
  licensed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_buyer
  ON marketplace_purchases(buyer_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_listing
  ON marketplace_purchases(listing_id);

-- ============================================
-- TABLE: marketplace_downloads
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES marketplace_purchases(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES marketplace_assets(id) ON DELETE CASCADE,
  download_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_downloads_purchase
  ON marketplace_downloads(purchase_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_downloads_asset
  ON marketplace_downloads(asset_id);

-- ============================================
-- TABLE: marketplace_license_audit
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_license_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES marketplace_purchases(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  performed_by TEXT REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_license_audit_purchase
  ON marketplace_license_audit(purchase_id);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marketplace_sellers_updated ON marketplace_sellers;
CREATE TRIGGER trg_marketplace_sellers_updated
BEFORE UPDATE ON marketplace_sellers
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_marketplace_listings_updated ON marketplace_listings;
CREATE TRIGGER trg_marketplace_listings_updated
BEFORE UPDATE ON marketplace_listings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO marketplace_categories (id, slug, name, description)
VALUES
  (uuid_generate_v4(), 'assets', 'Assets', 'Stock assets, footage, audio, and graphics'),
  (uuid_generate_v4(), 'templates', 'Templates', 'Video, motion graphics, and social templates'),
  (uuid_generate_v4(), 'plugins', 'Plugins', 'Extensions, presets, and tooling for Kylo'),
  (uuid_generate_v4(), 'freelancers', 'Freelancers', 'Service providers and specialists')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE marketplace_categories IS 'Hierarchical taxonomy for marketplace listings.';
COMMENT ON TABLE marketplace_sellers IS 'Profiles for users who sell items in the marketplace.';
COMMENT ON TABLE marketplace_listings IS 'Marketplace listings authored by sellers.';
COMMENT ON TABLE marketplace_license_plans IS 'Licensing tiers for marketplace listings.';
COMMENT ON TABLE marketplace_assets IS 'Preview and deliverable assets stored via Cloudify.';
COMMENT ON TABLE marketplace_orders IS 'Purchase intents created by buyers before payment.';
COMMENT ON TABLE marketplace_transactions IS 'Recorded payment events associated with orders.';
COMMENT ON TABLE marketplace_purchases IS 'Entitlements granting buyers access to listings and licenses.';
COMMENT ON TABLE marketplace_downloads IS 'Issued download links and usage tracking for purchases.';
COMMENT ON TABLE marketplace_license_audit IS 'Audit log of license-related actions.';