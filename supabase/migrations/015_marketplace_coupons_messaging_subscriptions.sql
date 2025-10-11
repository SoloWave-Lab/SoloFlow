-- Migration 015: Marketplace Coupons, Messaging, Subscriptions, and Platform Fees
-- Created: 2024-01-15

-- ============================================================================
-- 1. COUPONS & DISCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES marketplace_sellers(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL, -- percentage (0-100) or cents
  min_purchase_cents INTEGER DEFAULT 0,
  max_discount_cents INTEGER, -- cap for percentage discounts
  usage_limit INTEGER, -- null = unlimited
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  applicable_to VARCHAR(20) DEFAULT 'all' CHECK (applicable_to IN ('all', 'specific_listings', 'categories')),
  applicable_ids UUID[], -- listing or category IDs
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_coupons_code') THEN
        CREATE INDEX idx_marketplace_coupons_code ON marketplace_coupons(code) WHERE is_active = true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_coupons_seller') THEN
        CREATE INDEX idx_marketplace_coupons_seller ON marketplace_coupons(seller_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_coupons_active') THEN
        CREATE INDEX idx_marketplace_coupons_active ON marketplace_coupons(is_active, expires_at);
    END IF;
END $$;

-- Track coupon usage
CREATE TABLE IF NOT EXISTS marketplace_coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES marketplace_coupons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  order_id UUID REFERENCES marketplace_orders(id) ON DELETE SET NULL,
  discount_amount_cents INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_coupon_usage_coupon') THEN
        CREATE INDEX idx_marketplace_coupon_usage_coupon ON marketplace_coupon_usage(coupon_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_coupon_usage_user') THEN
        CREATE INDEX idx_marketplace_coupon_usage_user ON marketplace_coupon_usage(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_coupon_usage_order') THEN
        CREATE INDEX idx_marketplace_coupon_usage_order ON marketplace_coupon_usage(order_id);
    END IF;
END $$;

-- ============================================================================
-- 2. MESSAGING SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES marketplace_sellers(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,
  subject VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(buyer_id, seller_id, listing_id)
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_conversations_buyer') THEN
        CREATE INDEX idx_marketplace_conversations_buyer ON marketplace_conversations(buyer_id, last_message_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_conversations_seller') THEN
        CREATE INDEX idx_marketplace_conversations_seller ON marketplace_conversations(seller_id, last_message_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_conversations_listing') THEN
        CREATE INDEX idx_marketplace_conversations_listing ON marketplace_conversations(listing_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES marketplace_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('buyer', 'seller')),
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_messages_conversation') THEN
        CREATE INDEX idx_marketplace_messages_conversation ON marketplace_messages(conversation_id, created_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_messages_sender') THEN
        CREATE INDEX idx_marketplace_messages_sender ON marketplace_messages(sender_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_messages_unread') THEN
        CREATE INDEX idx_marketplace_messages_unread ON marketplace_messages(conversation_id, is_read) WHERE is_read = false;
    END IF;
END $$;

-- ============================================================================
-- 3. SUBSCRIPTIONS & MEMBERSHIPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES marketplace_sellers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  billing_interval VARCHAR(20) NOT NULL CHECK (billing_interval IN ('monthly', 'quarterly', 'yearly')),
  features JSONB DEFAULT '[]'::jsonb,
  max_downloads INTEGER, -- downloads per billing period, null = unlimited
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_subscription_plans_seller') THEN
        CREATE INDEX idx_marketplace_subscription_plans_seller ON marketplace_subscription_plans(seller_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_subscription_plans_active') THEN
        CREATE INDEX idx_marketplace_subscription_plans_active ON marketplace_subscription_plans(is_active);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS marketplace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES marketplace_subscription_plans(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES marketplace_sellers(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  payment_gateway_subscription_id VARCHAR(255),
  downloads_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_subscriptions_user') THEN
        CREATE INDEX idx_marketplace_subscriptions_user ON marketplace_subscriptions(user_id, status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_subscriptions_seller') THEN
        CREATE INDEX idx_marketplace_subscriptions_seller ON marketplace_subscriptions(seller_id, status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_subscriptions_plan') THEN
        CREATE INDEX idx_marketplace_subscriptions_plan ON marketplace_subscriptions(plan_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_subscriptions_period_end') THEN
        CREATE INDEX idx_marketplace_subscriptions_period_end ON marketplace_subscriptions(current_period_end) WHERE status = 'active';
    END IF;
END $$;

-- ============================================================================
-- 4. PLATFORM FEES & COMMISSION
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('percentage', 'fixed', 'tiered')),
  fee_value NUMERIC(10, 2) NOT NULL, -- percentage or cents
  applies_to VARCHAR(20) DEFAULT 'all' CHECK (applies_to IN ('all', 'category', 'seller')),
  target_id UUID, -- category or seller ID
  min_amount_cents INTEGER,
  max_amount_cents INTEGER,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- higher priority = applied first
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_platform_fees_active') THEN
        CREATE INDEX idx_marketplace_platform_fees_active ON marketplace_platform_fees(is_active, priority DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_platform_fees_target') THEN
        CREATE INDEX idx_marketplace_platform_fees_target ON marketplace_platform_fees(applies_to, target_id);
    END IF;
END $$;

-- Track fee calculations per transaction
CREATE TABLE IF NOT EXISTS marketplace_fee_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,
  fee_id UUID REFERENCES marketplace_platform_fees(id) ON DELETE SET NULL,
  fee_name VARCHAR(255) NOT NULL,
  fee_type VARCHAR(20) NOT NULL,
  fee_amount_cents INTEGER NOT NULL,
  calculation_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_fee_records_transaction') THEN
        CREATE INDEX idx_marketplace_fee_records_transaction ON marketplace_fee_records(transaction_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_fee_records_fee') THEN
        CREATE INDEX idx_marketplace_fee_records_fee ON marketplace_fee_records(fee_id);
    END IF;
END $$;

-- ============================================================================
-- 5. SELLER VERIFICATION & BADGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_seller_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES marketplace_sellers(id) ON DELETE CASCADE,
  badge_type VARCHAR(50) NOT NULL CHECK (badge_type IN ('verified', 'top_seller', 'fast_responder', 'quality_assured', 'new_seller', 'exclusive')),
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(seller_id, badge_type)
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_seller_badges_seller') THEN
        CREATE INDEX idx_marketplace_seller_badges_seller ON marketplace_seller_badges(seller_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_seller_badges_type') THEN
        CREATE INDEX idx_marketplace_seller_badges_type ON marketplace_seller_badges(badge_type);
    END IF;
END $$;

-- ============================================================================
-- 6. ADD COUPON SUPPORT TO ORDERS
-- ============================================================================

ALTER TABLE marketplace_orders 
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES marketplace_coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount_cents INTEGER DEFAULT 0;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_orders_coupon') THEN
        CREATE INDEX idx_marketplace_orders_coupon ON marketplace_orders(coupon_id);
    END IF;
END $$;

-- ============================================================================
-- 7. ADD SUBSCRIPTION SUPPORT TO PURCHASES
-- ============================================================================

ALTER TABLE marketplace_purchases
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES marketplace_subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_subscription_download BOOLEAN DEFAULT false;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_purchases_subscription') THEN
        CREATE INDEX idx_marketplace_purchases_subscription ON marketplace_purchases(subscription_id);
    END IF;
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update conversation last_message_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_conversation_last_message'
    ) THEN
        CREATE TRIGGER trigger_update_conversation_last_message
        AFTER INSERT ON marketplace_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_conversation_last_message();
    END IF;
END $$;

-- Update coupon usage count
CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_coupons
  SET usage_count = usage_count + 1
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_increment_coupon_usage'
    ) THEN
        CREATE TRIGGER trigger_increment_coupon_usage
        AFTER INSERT ON marketplace_coupon_usage
        FOR EACH ROW
        EXECUTE FUNCTION increment_coupon_usage();
    END IF;
END $$;

-- Update subscription downloads_used
CREATE OR REPLACE FUNCTION increment_subscription_downloads()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_id IS NOT NULL AND NEW.is_subscription_download = true THEN
    UPDATE marketplace_subscriptions
    SET downloads_used = downloads_used + 1
    WHERE id = NEW.subscription_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_increment_subscription_downloads'
    ) THEN
        CREATE TRIGGER trigger_increment_subscription_downloads
        AFTER INSERT ON marketplace_purchases
        FOR EACH ROW
        EXECUTE FUNCTION increment_subscription_downloads();
    END IF;
END $$;