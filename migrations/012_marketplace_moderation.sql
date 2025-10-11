-- Migration 012: Marketplace Moderation & Reviews
-- Adds moderation workflow, reviews, ratings, and seller analytics

-- ============================================
-- TABLE: marketplace_moderation_tickets
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_moderation_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, escalated
  assigned_admin TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  notes TEXT,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_moderation_tickets_listing
  ON marketplace_moderation_tickets(listing_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_moderation_tickets_status
  ON marketplace_moderation_tickets(status);

CREATE INDEX IF NOT EXISTS idx_marketplace_moderation_tickets_admin
  ON marketplace_moderation_tickets(assigned_admin);

-- ============================================
-- TABLE: marketplace_automated_checks
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_automated_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL, -- copyright_scan, malware_scan, metadata_validation
  result TEXT NOT NULL, -- pass, fail, warning
  score NUMERIC(4,2),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_automated_checks_listing
  ON marketplace_automated_checks(listing_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_automated_checks_type
  ON marketplace_automated_checks(check_type);

-- ============================================
-- TABLE: marketplace_reviews
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES marketplace_purchases(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'published', -- published, hidden, flagged
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(purchase_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_listing
  ON marketplace_reviews(listing_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_buyer
  ON marketplace_reviews(buyer_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_status
  ON marketplace_reviews(status);

-- ============================================
-- TABLE: marketplace_seller_analytics
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_seller_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES marketplace_sellers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sales_cents BIGINT NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_refunds_cents BIGINT NOT NULL DEFAULT 0,
  avg_rating NUMERIC(2,1),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(seller_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_seller_analytics_seller
  ON marketplace_seller_analytics(seller_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_seller_analytics_period
  ON marketplace_seller_analytics(period_start, period_end);

-- ============================================
-- TABLE: marketplace_disputes
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES marketplace_purchases(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES marketplace_sellers(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open, investigating, resolved, closed
  resolution TEXT,
  resolved_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_purchase
  ON marketplace_disputes(purchase_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_buyer
  ON marketplace_disputes(buyer_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_seller
  ON marketplace_disputes(seller_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_status
  ON marketplace_disputes(status);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trg_marketplace_reviews_updated ON marketplace_reviews;
CREATE TRIGGER trg_marketplace_reviews_updated
BEFORE UPDATE ON marketplace_reviews
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_marketplace_disputes_updated ON marketplace_disputes;
CREATE TRIGGER trg_marketplace_disputes_updated
BEFORE UPDATE ON marketplace_disputes
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ============================================
-- FUNCTION: Update listing avg_rating on review insert/update
-- ============================================

CREATE OR REPLACE FUNCTION update_listing_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_listings
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'avg_rating', (
      SELECT AVG(rating)::numeric(2,1)
      FROM marketplace_reviews
      WHERE listing_id = NEW.listing_id AND status = 'published'
    ),
    'review_count', (
      SELECT COUNT(*)
      FROM marketplace_reviews
      WHERE listing_id = NEW.listing_id AND status = 'published'
    )
  )
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marketplace_reviews_rating ON marketplace_reviews;
CREATE TRIGGER trg_marketplace_reviews_rating
AFTER INSERT OR UPDATE ON marketplace_reviews
FOR EACH ROW
EXECUTE FUNCTION update_listing_rating();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE marketplace_moderation_tickets IS 'Manual moderation workflow for listing submissions.';
COMMENT ON TABLE marketplace_automated_checks IS 'Automated compliance and quality checks for listings.';
COMMENT ON TABLE marketplace_reviews IS 'Buyer reviews and ratings for purchased listings.';
COMMENT ON TABLE marketplace_seller_analytics IS 'Aggregated seller performance metrics by period.';
COMMENT ON TABLE marketplace_disputes IS 'Buyer-seller disputes requiring admin intervention.';