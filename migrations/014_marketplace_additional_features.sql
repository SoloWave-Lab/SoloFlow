-- Migration 014: Marketplace Additional Features
-- Adds notifications, payouts, and activity tracking tables

-- ============================================
-- TABLE: marketplace_notifications
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- order_update, listing_approved, listing_rejected, payout_completed, etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional notification data
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_user
  ON marketplace_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_read
  ON marketplace_notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_created
  ON marketplace_notifications(created_at DESC);

-- ============================================
-- TABLE: marketplace_payouts
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES marketplace_sellers(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  payout_method TEXT NOT NULL, -- bank_transfer, upi, etc.
  payout_details JSONB NOT NULL, -- Bank account or UPI details
  payment_gateway_id TEXT, -- External payment gateway reference
  processed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_payouts_seller
  ON marketplace_payouts(seller_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_payouts_status
  ON marketplace_payouts(status);

CREATE INDEX IF NOT EXISTS idx_marketplace_payouts_created
  ON marketplace_payouts(created_at DESC);

-- ============================================
-- TABLE: marketplace_activity
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE, -- NULL for anonymous users
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- view, click, add_to_cart, wishlist_add, wishlist_remove, purchase
  metadata JSONB, -- Additional tracking data (referrer, user agent, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_activity_user
  ON marketplace_activity(user_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_activity_listing
  ON marketplace_activity(listing_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_activity_type
  ON marketplace_activity(type);

CREATE INDEX IF NOT EXISTS idx_marketplace_activity_created
  ON marketplace_activity(created_at DESC);

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_marketplace_activity_listing_type_created
  ON marketplace_activity(listing_id, type, created_at DESC);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE marketplace_notifications IS 'User notifications for marketplace events';
COMMENT ON TABLE marketplace_payouts IS 'Seller payout requests and history';
COMMENT ON TABLE marketplace_activity IS 'User activity tracking for analytics';

COMMENT ON COLUMN marketplace_notifications.type IS 'Notification type: order_update, listing_approved, listing_rejected, payout_completed, dispute_update, etc.';
COMMENT ON COLUMN marketplace_payouts.status IS 'Payout status: pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN marketplace_activity.type IS 'Activity type: view, click, add_to_cart, wishlist_add, wishlist_remove, purchase';