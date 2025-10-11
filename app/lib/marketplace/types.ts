/**
 * Marketplace Type Definitions
 * 
 * TypeScript interfaces for all marketplace entities and API responses.
 */

// ==================== CORE ENTITIES ====================

export interface Listing {
  id: string;
  seller_id: string;
  category_id: string;
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  price_cents: number;
  currency: string;
  thumbnail_url?: string;
  preview_urls?: string[];
  asset_urls?: string[];
  tags?: string[];
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  rejection_reason?: string;
  views_count: number;
  favorites_count: number;
  sales_count: number;
  avg_rating?: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  published_at?: string;
  
  // Joined fields
  seller_name?: string;
  seller_avatar?: string;
  category_name?: string;
}

export interface Category {
  id: string;
  parent_id?: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  listing_count?: number;
  created_at: string;
  updated_at: string;
  
  // Hierarchical
  children?: Category[];
}

export interface Seller {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  website_url?: string;
  social_links?: Record<string, string>;
  status: 'pending' | 'active' | 'suspended' | 'banned';
  total_sales: number;
  total_revenue_cents: number;
  avg_rating?: number;
  response_time_hours?: number;
  badges?: string[];
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_account_name?: string;
  pan_number?: string;
  gst_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  listing_id: string;
  license_plan_id: string;
  status: 'pending' | 'payment_required' | 'paid' | 'failed' | 'refunded' | 'disputed';
  subtotal_cents: number;
  discount_cents?: number;
  tax_cents?: number;
  total_cents: number;
  currency: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  payment_method?: string;
  paid_at?: string;
  refunded_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  listing_title?: string;
  listing_thumbnail?: string;
  seller_name?: string;
  buyer_name?: string;
  buyer_email?: string;
}

export interface Purchase {
  id: string;
  buyer_id: string;
  order_id: string;
  listing_id: string;
  license_plan_id: string;
  download_count: number;
  max_downloads?: number;
  expires_at?: string;
  created_at: string;
  
  // Joined fields
  listing_title?: string;
  listing_thumbnail?: string;
  listing_slug?: string;
  seller_name?: string;
  license_name?: string;
  license_type?: string;
}

export interface Review {
  id: string;
  listing_id: string;
  buyer_id: string;
  purchase_id: string;
  rating: number;
  comment?: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  buyer_name?: string;
  buyer_avatar?: string;
  verified_purchase?: boolean;
}

export interface LicensePlan {
  id: string;
  listing_id: string;
  name: string;
  description?: string;
  license_type: 'personal' | 'commercial' | 'extended';
  price_cents: number;
  features?: string[];
  max_downloads?: number;
  validity_days?: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  subscriber_id: string;
  seller_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired';
  downloads_used: number;
  max_downloads: number;
  started_at: string;
  expires_at: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  seller_name?: string;
  seller_avatar?: string;
  plan_name?: string;
  plan_price?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  
  // Joined fields
  sender_name?: string;
  sender_avatar?: string;
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  other_participant_name?: string;
  other_participant_avatar?: string;
  other_participant_id?: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  
  // Joined listing data
  title?: string;
  slug?: string;
  price_cents?: number;
  currency?: string;
  thumbnail_url?: string;
  seller_name?: string;
  seller_avatar?: string;
  avg_rating?: number;
  added_at?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_cents?: number;
  max_discount_cents?: number;
  valid_from: string;
  valid_until: string;
  usage_limit?: number;
  usage_count: number;
  applicable_to?: 'all' | 'category' | 'listing';
  applicable_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  reason: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  buyer_name?: string;
  seller_name?: string;
  listing_title?: string;
}

// ==================== ANALYTICS ====================

export interface SellerAnalytics {
  id: string;
  seller_id: string;
  period_start: string;
  period_end: string;
  total_sales_cents: number;
  total_orders: number;
  total_views: number;
  total_favorites: number;
  conversion_rate?: number;
  avg_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface AdminAnalytics {
  platform_revenue_cents: number;
  total_users: number;
  total_sellers: number;
  total_listings: number;
  total_orders: number;
  active_subscriptions: number;
  pending_moderation: number;
  open_disputes: number;
  
  // Time-series data
  revenue_by_day?: Array<{ date: string; amount: number }>;
  users_by_day?: Array<{ date: string; count: number }>;
  orders_by_day?: Array<{ date: string; count: number }>;
  
  // Top performers
  top_sellers?: Array<{
    seller_id: string;
    seller_name: string;
    revenue: number;
    sales: number;
  }>;
  top_listings?: Array<{
    listing_id: string;
    listing_title: string;
    sales: number;
    revenue: number;
  }>;
  
  // Category breakdown
  category_performance?: Array<{
    category_id: string;
    category_name: string;
    listings: number;
    sales: number;
    revenue: number;
  }>;
}

// ==================== API RESPONSE TYPES ====================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  details?: any;
  status?: number;
}

export interface ApiSuccess {
  success: boolean;
  message?: string;
}

// ==================== FORM DATA TYPES ====================

export interface CreateListingData {
  categoryId: string;
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  priceCents: number;
  currency?: string;
  thumbnailUrl?: string;
  previewUrls?: string[];
  assetUrls?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateListingData extends Partial<CreateListingData> {
  status?: Listing['status'];
}

export interface CreateOrderData {
  listingId: string;
  licensePlanId: string;
  couponCode?: string;
}

export interface CreateReviewData {
  listingId: string;
  rating: number;
  comment?: string;
}

export interface SellerOnboardingData {
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  websiteUrl?: string;
  socialLinks?: Record<string, string>;
  bankAccountNumber: string;
  bankIfscCode: string;
  bankAccountName: string;
  panNumber: string;
  gstNumber?: string;
}

export interface SendMessageData {
  recipientId?: string;
  conversationId?: string;
  content: string;
}

// ==================== FILTER & SEARCH TYPES ====================

export interface ListingFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  licenseType?: LicensePlan['license_type'];
  tags?: string[];
  sellerId?: string;
  status?: Listing['status'];
}

export interface SearchParams extends ListingFilters {
  q?: string;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  limit?: number;
  offset?: number;
}

// ==================== CART TYPES ====================

export interface CartItem {
  listingId: string;
  licensePlanId: string;
  title: string;
  thumbnailUrl?: string;
  price: number;
  currency: string;
  sellerName: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  couponCode?: string;
}

// ==================== UTILITY TYPES ====================

export type ListingStatus = Listing['status'];
export type OrderStatus = Order['status'];
export type SellerStatus = Seller['status'];
export type LicenseType = LicensePlan['license_type'];
export type DisputeStatus = Dispute['status'];
export type SubscriptionStatus = Subscription['status'];

// ==================== CONSTANTS ====================

export const LISTING_STATUSES: ListingStatus[] = [
  'draft',
  'pending',
  'published',
  'rejected',
  'archived',
];

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'payment_required',
  'paid',
  'failed',
  'refunded',
  'disputed',
];

export const LICENSE_TYPES: LicenseType[] = [
  'personal',
  'commercial',
  'extended',
];

export const SELLER_STATUSES: SellerStatus[] = [
  'pending',
  'active',
  'suspended',
  'banned',
];