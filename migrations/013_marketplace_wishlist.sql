-- Migration 013: Marketplace Wishlist/Favorites
-- Add wishlist functionality for buyers to save listings

-- ============================================================================
-- Wishlist Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure user can't add same listing twice
  UNIQUE(user_id, listing_id)
);

-- Indexes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlist_user') THEN
        CREATE INDEX idx_wishlist_user ON marketplace_wishlist(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlist_listing') THEN
        CREATE INDEX idx_wishlist_listing ON marketplace_wishlist(listing_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlist_created') THEN
        CREATE INDEX idx_wishlist_created ON marketplace_wishlist(created_at DESC);
    END IF;
END $$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE marketplace_wishlist IS 'User wishlist/favorites for marketplace listings';
COMMENT ON COLUMN marketplace_wishlist.user_id IS 'User who added to wishlist';
COMMENT ON COLUMN marketplace_wishlist.listing_id IS 'Listing that was favorited';