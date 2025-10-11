export type MarketplaceCategoryRecord = {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type MarketplaceSellerRecord = {
  id: string;
  user_id: string;
  display_name: string;
  biography: string | null;
  status: "pending" | "active" | "suspended";
  payout_account: Record<string, unknown> | null;
  avg_rating: number;
  total_sales_cents: number;
  created_at: string;
  updated_at: string;
};

export type MarketplaceListingStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "suspended";

export type MarketplaceListingRecord = {
  id: string;
  seller_id: string;
  category_id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  status: MarketplaceListingStatus;
  price_cents: number;
  currency: string;
  main_preview_asset_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type MarketplaceLicensePlanRecord = {
  id: string;
  listing_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  max_downloads: number | null;
  license_terms: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type MarketplaceAssetKind = "preview" | "deliverable";

export type MarketplaceAssetRecord = {
  id: string;
  listing_id: string;
  kind: MarketplaceAssetKind;
  storage_key: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  checksum: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type MarketplaceOrderStatus =
  | "pending"
  | "payment_required"
  | "paid"
  | "failed"
  | "cancelled";

export type MarketplaceOrderRecord = {
  id: string;
  buyer_id: string;
  listing_id: string;
  license_plan_id: string;
  subtotal_cents: number;
  fees_cents: number;
  taxes_cents: number;
  total_cents: number;
  currency: string;
  razorpay_order_id: string | null;
  status: MarketplaceOrderStatus;
  created_at: string;
};

export type MarketplaceTransactionRecord = {
  id: string;
  order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  status: string;
  amount_cents: number;
  payment_method: string | null;
  payment_metadata: Record<string, unknown> | null;
  created_at: string;
};

export type MarketplacePurchaseRecord = {
  id: string;
  order_id: string;
  buyer_id: string;
  listing_id: string;
  license_plan_id: string;
  license_key: string;
  licensed_at: string;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
};

export type MarketplaceDownloadRecord = {
  id: string;
  purchase_id: string;
  asset_id: string;
  download_url: string;
  expires_at: string;
  last_accessed_at: string | null;
  download_count: number;
  created_at: string;
};

export type MarketplaceLicenseAuditRecord = {
  id: string;
  purchase_id: string;
  action: string;
  details: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
};

export type MarketplaceModerationTicketRecord = {
  id: string;
  listing_id: string;
  status: "pending" | "approved" | "rejected" | "escalated";
  assigned_admin: string | null;
  notes: string | null;
  actioned_at: string | null;
  created_at: string;
};

export type MarketplaceAutomatedCheckRecord = {
  id: string;
  listing_id: string;
  check_type: string;
  result: "pass" | "fail" | "warning";
  score: number | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
};

export type MarketplaceReviewRecord = {
  id: string;
  listing_id: string;
  buyer_id: string;
  purchase_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: "published" | "hidden" | "flagged";
  created_at: string;
  updated_at: string;
};

export type MarketplaceSellerAnalyticsRecord = {
  id: string;
  seller_id: string;
  period_start: string;
  period_end: string;
  total_sales_cents: number;
  total_orders: number;
  total_refunds_cents: number;
  avg_rating: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type MarketplaceDisputeRecord = {
  id: string;
  purchase_id: string;
  buyer_id: string;
  seller_id: string;
  reason: string;
  description: string | null;
  status: "open" | "investigating" | "resolved" | "closed";
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};